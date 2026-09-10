import Combine
import ExpoModulesCore
import SwiftUI

final class AppleCameraView: ExpoView {
  static weak var current: AppleCameraView?
  let onClose = EventDispatcher()
  let onConnect = EventDispatcher()
  let onMonitor = EventDispatcher()
  let onCameraState = EventDispatcher()
  let model = AppleCameraModel()
  var keepSessionAlive = false {
    didSet { if !keepSessionAlive && window == nil { model.disappear() } }
  }
  private var host: UIHostingController<AppleCameraScreen>?
  private var subscription: AnyCancellable?
  private var stateScheduled = false
  private var lastState: NSDictionary?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    let host = UIHostingController(rootView: AppleCameraScreen(model: model, monitor: { [weak self] in self?.onMonitor([:]) }))
    host.overrideUserInterfaceStyle = .dark
    host.view.backgroundColor = .black
    host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(host.view)
    self.host = host
    model.onClose = { [weak self] in self?.onClose([:]) }
    model.onConnect = { [weak self] in self?.onConnect([:]) }
    subscription = model.objectWillChange.sink { [weak self] in self?.scheduleState() }
  }

  private func scheduleState() {
    guard !stateScheduled else { return }
    stateScheduled = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.stateScheduled = false
      let state = self.model.captureState
      guard self.lastState?.isEqual(to: state) != true else { return }
      self.lastState = state as NSDictionary
      self.onCameraState(state)
    }
  }
  override func layoutSubviews() { super.layoutSubviews(); host?.view.frame = bounds }
  deinit { model.disappear() }
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      if !keepSessionAlive {
        if Self.current === self { Self.current = nil }
        model.disappear()
      }
      host?.willMove(toParent: nil)
      host?.removeFromParent()
      return
    }
    guard let host, host.parent == nil else { return }
    var responder: UIResponder? = next
    while let current = responder {
      if let parent = current as? UIViewController {
        Self.current = self
        parent.addChild(host)
        host.didMove(toParent: parent)
        model.appear()
        scheduleState()
        break
      }
      responder = current.next
    }
  }

  #if DEBUG
  func debug(_ action: String) throws -> [String: Any] {
    if action == "settings" { model.showSettings = true }
    if action == "dismissSettings" { model.showSettings = false }
    if action == "cinematic" { model.change { $0.photo = false; $0.cinematic = true } }
    if action == "video" { model.change { $0.photo = false; $0.cinematic = false } }
    if action == "photo" { model.change { $0.photo = true; $0.cinematic = false } }
    return model.captureState.merging(["mounted": true, "settingsPresented": model.showSettings,
      "idleTimerDisabled": UIApplication.shared.isIdleTimerDisabled,
      "profiles": Array(Set(model.profiles.map(\.id))).sorted()]) { _, new in new }
  }
  #endif
}

private struct AppleCameraScreen: View {
  @ObservedObject var model: AppleCameraModel
  let monitor: () -> Void
  @State private var grid = UserDefaults.standard.bool(forKey: "relais.camera.grid")
  @State private var angle: CGFloat = 90
  @State private var confirmClose = false
  private var available: Bool { model.activeDevice != nil }
  private var mode: String { model.settings.photo ? "photo" : model.settings.cinematic ? "cinematic" : "video" }

  var body: some View {
    GeometryReader { geometry in
      let landscape = geometry.size.width > geometry.size.height
      ZStack {
        Color.black.ignoresSafeArea()
        AppleCameraPreview(model: model, grid: grid && available, captureAngle: $angle).ignoresSafeArea()
        if !available && !model.configuring { introduction.padding(.horizontal, 28) }
        VStack(spacing: 0) {
          HStack {
            icon("xmark", "Close Camera") { if model.busy { confirmClose = true } else { model.requestClose() } }
            Spacer()
            if available {
              if model.recording, let started = model.startedAt {
                Text(started, style: .timer).monospacedDigit().font(.headline).foregroundStyle(.red)
              } else {
                Text(model.settings.photo ? model.photoQuality : "\(AppleCaptureCatalog.label(model.settings.height)) · \(model.settings.fps)")
                  .font(.subheadline.weight(.semibold)).monospacedDigit()
              }
            }
            Spacer()
            if available { icon("slider.horizontal.3", "Camera settings") { model.showSettings = true } }
            else { Color.clear.frame(width: 44, height: 44) }
          }
          .padding(.horizontal, 16).padding(.top, 4)
          Spacer()
          if available {
            HStack(alignment: .bottom) {
              if landscape { Spacer() }
              controls(landscape: landscape)
                .frame(maxWidth: landscape ? 280 : .infinity)
            }.padding(.horizontal, 20).padding(.bottom, 10)
          }
        }
        if model.configuring { ProgressView().tint(.white).accessibilityLabel("Preparing camera") }
      }
    }
    .foregroundStyle(.white).preferredColorScheme(.dark).tint(.yellow)
    .onChange(of: grid) { UserDefaults.standard.set($0, forKey: "relais.camera.grid") }
    .onChange(of: angle) { model.captureAngle = $0; RelaisPreviewSource.shared().rotation = (Int(($0 / 90).rounded()) * 90 % 360 + 360) % 360 }
    .sheet(isPresented: $model.showSettings) { settingsSheet }
    .confirmationDialog("Close Camera?", isPresented: $confirmClose, titleVisibility: .visible) {
      Button("Finish and close") { model.requestClose() }
      Button("Stay in Camera", role: .cancel) {}
    } message: { Text("Your capture will be saved before Camera closes.") }
  }

  private var introduction: some View {
    VStack(spacing: 16) {
      Image(systemName: "camera").font(.largeTitle).accessibilityHidden(true)
      #if targetEnvironment(simulator)
      Text("Use this device as a monitor").font(.title3.weight(.semibold))
      Text("Connect your iPhone to take photos and record video remotely.")
        .font(.body).foregroundStyle(.secondary).multilineTextAlignment(.center)
      Button("Open Monitor", action: monitor).buttonStyle(.borderedProminent).tint(.blue)
      #else
      Text(model.authorized ? "Camera unavailable" : "Your camera, ready to connect").font(.title3.weight(.semibold))
      Text(model.authorized ? model.message : "Take photos and record video here, or control this camera from another phone.")
        .font(.body).foregroundStyle(.secondary).multilineTextAlignment(.center)
      Button(model.authorized ? "Try again" : "Open Camera") { if model.authorized { model.retry() } else { model.requestAccess() } }
        .buttonStyle(.borderedProminent).tint(.blue)
      #endif
    }
  }

  private func controls(landscape: Bool) -> some View {
    VStack(spacing: 14) {
      if !model.message.isEmpty {
        Text(model.message).font(.footnote).multilineTextAlignment(.center)
          .padding(8).background(.black.opacity(0.65), in: RoundedRectangle(cornerRadius: 10))
          .accessibilityAddTraits(.updatesFrequently)
      }
      if model.phase == "pending" || (!model.pending.isEmpty && !model.busy) {
        Button("Add to Photos") { model.recover() }.buttonStyle(.bordered)
      }
      if model.zoomStops.count > 1 && !landscape {
        Picker("Zoom", selection: Binding(get: { nearestZoom }, set: { model.setZoom($0) })) {
          ForEach(model.zoomStops, id: \.self) { value in Text("\(value, specifier: "%g")×").tag(value) }
        }.pickerStyle(.segmented).frame(maxWidth: 260).disabled(!model.ready)
      }
      HStack {
        icon("qrcode", "Connect a monitor") { model.onConnect?() }
        Spacer()
        Button {
          if model.recording { model.stopRecording() }
          else if model.settings.photo { model.takePhoto() }
          else { model.record(rotation: model.captureAngle) }
        } label: {
          ZStack {
            Circle().strokeBorder(.white, lineWidth: 3).frame(width: 72, height: 72)
            if model.busy && !model.recording { ProgressView().tint(.white) }
            else if model.recording { RoundedRectangle(cornerRadius: 6).fill(.red).frame(width: 28, height: 28) }
            else { Circle().fill(model.settings.photo ? .white : .red).frame(width: 60, height: 60) }
          }.frame(width: 84, height: 84)
        }.buttonStyle(.plain)
          .disabled((model.busy && !model.recording) || (!model.recording && (!model.ready || model.configuring || model.phase == "pending")))
          .accessibilityLabel(model.recording ? "Stop recording" : model.settings.photo ? "Take photo" : "Record video")
        Spacer()
        icon("arrow.triangle.2.circlepath.camera", "Switch camera") { model.change { $0.front.toggle() } }
          .disabled(model.busy || model.configuring)
      }
      Picker("Capture mode", selection: Binding(get: { mode }, set: { value in
        model.change { $0.photo = value == "photo"; $0.cinematic = value == "cinematic" }
      })) {
        Text("Photo").tag("photo")
        Text("Video").tag("video")
        if model.cinematicSupported { Text("Cinematic").tag("cinematic") }
      }.pickerStyle(.segmented).disabled(model.busy || model.configuring)
      Text(model.connectionLabel).font(.caption).foregroundStyle(.secondary).lineLimit(2)
    }
  }
  private var nearestZoom: Double { model.zoomStops.min { abs($0 - model.zoom) < abs($1 - model.zoom) } ?? 1 }

  @ViewBuilder private func icon(_ symbol: String, _ label: String, action: @escaping () -> Void) -> some View {
    if #available(iOS 26.0, *) {
      Button(label, systemImage: symbol, action: action).labelStyle(.iconOnly)
        .buttonStyle(.glass).buttonBorderShape(.circle).controlSize(.regular)
        .frame(width: 44, height: 44).tint(.white)
    } else {
      Button(label, systemImage: symbol, action: action).labelStyle(.iconOnly)
        .buttonStyle(.bordered).buttonBorderShape(.capsule).controlSize(.regular)
        .frame(width: 44, height: 44).tint(.white)
    }
  }
  private var heights: [Int32] { Array(Set(model.profiles.map(\.height))).sorted(by: >) }
  private var rates: [Int] { Array(Set(model.profiles.filter { $0.height == model.settings.height && $0.hdr == model.settings.hdr }.map(\.fps))).sorted() }
  private var hdrSupported: Bool { model.profiles.contains { $0.height == model.settings.height && $0.fps == model.settings.fps && $0.hdr } }

  private var settingsSheet: some View {
    NavigationStack {
      Form {
        Section {
          Label("Focus, exposure and color adjust automatically", systemImage: "sparkles")
          Toggle("Grid", isOn: $grid)
        }
        if !model.settings.photo {
          Section("Video quality") {
            Picker("Resolution", selection: Binding(get: { model.settings.height }, set: { value in model.change { $0.height = value } })) {
              ForEach(heights, id: \.self) { Text(AppleCaptureCatalog.label($0)).tag($0) }
            }
            Picker("Frame rate", selection: Binding(get: { model.settings.fps }, set: { value in model.change { $0.fps = value } })) {
              ForEach(rates, id: \.self) { Text("\($0) fps").tag($0) }
            }
            Toggle("HDR video", isOn: Binding(get: { model.settings.hdr }, set: { value in model.change { $0.hdr = value } })).disabled(!hdrSupported)
            Toggle("Record audio", isOn: Binding(get: { model.settings.audio }, set: model.setAudio))
          }.disabled(model.busy || model.configuring)
        }
        Section {
          Label("Saved on this iPhone", systemImage: "photo.on.rectangle")
          Text("Photos and videos are added to Photos. A monitor controls this camera; it does not replace the original file.")
            .font(.footnote).foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Camera settings").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { model.showSettings = false } } }
    }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
  }
}
