import ExpoModulesCore
import SwiftUI

final class AppleCameraView: ExpoView {
  #if DEBUG
  static weak var current: AppleCameraView?
  func debug(_ action: String) throws -> [String: Any] {
    if action == "settings" { model.showSettings = true }
    if action == "dismissSettings" { model.showSettings = false }
    if action == "cinematic" { model.change { $0.cinematic = true } }
    if action == "video" { model.change { $0.cinematic = false } }
    if action == "snapshot" {
      let url = FileManager.default.temporaryDirectory.appendingPathComponent("relais-native-camera.png")
      let surface: UIView = window ?? self
      let image = UIGraphicsImageRenderer(bounds: surface.bounds).image { _ in surface.drawHierarchy(in: surface.bounds, afterScreenUpdates: true) }
      try image.pngData()?.write(to: url)
    }
    return ["ready": model.ready, "configuring": model.configuring, "height": model.settings.height,
            "fps": model.settings.fps, "hdr": model.settings.hdr, "cinematic": model.settings.cinematic,
            "cinematicSupported": model.cinematicSupported, "phase": model.phase,
            "message": model.message, "zoomStops": model.zoomStops, "settingsPresented": model.showSettings,
            "idleTimerDisabled": UIApplication.shared.isIdleTimerDisabled,
            "profiles": Array(Set(model.profiles.map(\.id))).sorted()]
  }
  #endif
  let onClose = EventDispatcher()
  private let model = AppleCameraModel()
  private var host: UIHostingController<AppleCameraScreen>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    #if DEBUG
    Self.current = self
    #endif
    backgroundColor = .black
    let host = UIHostingController(rootView: AppleCameraScreen(model: model))
    host.overrideUserInterfaceStyle = .dark
    host.view.backgroundColor = .black
    host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(host.view)
    self.host = host
    model.onClose = { [weak self] in self?.onClose([:]) }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host?.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      model.disappear()
      host?.willMove(toParent: nil)
      host?.removeFromParent()
      return
    }
    guard window != nil, let host, host.parent == nil else { return }
    var responder: UIResponder? = next
    while let current = responder {
      if let parent = current as? UIViewController {
        parent.addChild(host)
        host.didMove(toParent: parent)
        model.appear()
        break
      }
      responder = current.next
    }
  }
}

private struct AppleCameraScreen: View {
  @ObservedObject var model: AppleCameraModel
  @State private var grid = UserDefaults.standard.bool(forKey: "relais.camera.grid")
  @State private var captureAngle: CGFloat = 90
  @State private var confirmClose = false

  var body: some View {
    GeometryReader { geometry in
      let landscape = geometry.size.width > geometry.size.height
      ZStack {
        Color.black.ignoresSafeArea()
        AppleCameraPreview(model: model, grid: grid, captureAngle: $captureAngle).ignoresSafeArea()
        if !model.authorized || (model.activeDevice == nil && !model.configuring) { introduction }
        VStack(spacing: 0) {
          topBar
          Spacer()
          if model.authorized && model.activeDevice != nil {
            if landscape {
              HStack(alignment: .bottom) { status; Spacer(); controls(landscape: true) }
            } else {
              status
              controls(landscape: false)
            }
          }
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 10)
      }
    }
    .preferredColorScheme(.dark)
    .tint(.yellow)
    .onChange(of: grid) { value in UserDefaults.standard.set(value, forKey: "relais.camera.grid") }
    .sheet(isPresented: $model.showSettings) { settingsSheet }
    .confirmationDialog("Finish recording before leaving?", isPresented: $confirmClose, titleVisibility: .visible) {
      Button("Finish and close") { model.requestClose() }
      Button("Keep recording", role: .cancel) {}
    }
  }

  private var topBar: some View {
    HStack(spacing: 12) {
      icon("xmark", "Close Camera") { if model.busy { confirmClose = true } else { model.requestClose() } }
      Spacer(minLength: 0)
      if model.recording, let start = model.startedAt {
        Text(start, style: .timer).monospacedDigit().font(.system(.headline, design: .rounded))
          .foregroundStyle(.white).padding(.horizontal, 12).padding(.vertical, 8)
          .background(.red, in: Capsule())
      } else if model.activeDevice != nil {
        HStack(spacing: 0) {
          Menu {
            ForEach(heights, id: \.self) { height in
              Button(AppleCaptureCatalog.label(height)) { model.change { $0.height = height } }
            }
          } label: { Text(AppleCaptureCatalog.label(model.settings.height)).font(.subheadline.weight(.semibold)).frame(minWidth: 60, minHeight: 44) }
          Menu {
            ForEach(rates, id: \.self) { fps in
              Button("\(fps) fps") { model.change { $0.fps = fps } }
            }
          } label: { Text("\(model.settings.fps)").font(.subheadline.weight(.semibold)).monospacedDigit().frame(minWidth: 44, minHeight: 44) }
        }
        .foregroundStyle(.white)
        .background(.ultraThinMaterial, in: Capsule())
        .disabled(model.busy || model.configuring)
        .accessibilityElement(children: .contain)
      }
      Spacer(minLength: 0)
      icon(model.torch ? "bolt.fill" : "bolt.slash", model.torch ? "Turn off the light" : "Turn on the light", selected: model.torch) { model.setTorch() }
        .disabled(!model.ready || !model.torchAvailable)
    }
  }

  private var introduction: some View {
    VStack(spacing: 16) {
      Image(systemName: "video").font(.system(size: 36, weight: .light))
      Text(model.authorized ? "Camera unavailable" : "Ready to record").font(.title2.weight(.semibold))
      Text(model.authorized ? "Use a physical iPhone to record. The simulator can act as a monitor." : "Your videos stay on this phone and are added to Photos.")
        .font(.body).foregroundStyle(.secondary).multilineTextAlignment(.center)
      if !model.authorized {
        Button("Open Camera", systemImage: "video") { model.requestAccess() }.buttonStyle(.borderedProminent)
        Button("Phone settings") {
          if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
        }
      } else {
        Button("Try again") { model.retry() }.disabled(model.configuring)
      }
      if !model.message.isEmpty { Text(model.message).font(.footnote).multilineTextAlignment(.center) }
      if !model.pending.isEmpty { Button("Add retained videos to Photos") { model.recover() } }
    }.padding(32)
  }

  private var status: some View {
    VStack(spacing: 8) {
      if model.lowLight {
        Label("Cinematic needs more light", systemImage: "sun.max")
          .font(.footnote).padding(8).background(.ultraThinMaterial, in: Capsule())
      }
      if model.focusLocked {
        Button(model.settings.cinematic ? "Focus locked · unlock" : "AE/AF locked · unlock") { model.resetFocus() }
          .font(.caption).padding(8).background(.ultraThinMaterial, in: Capsule())
      }
      if !model.message.isEmpty {
        Text(model.message).font(.footnote).multilineTextAlignment(.center).padding(10)
          .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
      }
      if !model.pending.isEmpty && !model.busy {
        Button("Add to Photos", systemImage: "square.and.arrow.down") { model.recover() }
          .buttonStyle(.bordered)
      }
    }.padding(.bottom, 12)
  }

  private func controls(landscape: Bool) -> some View {
    VStack(spacing: 18) {
      if model.ready {
        HStack(spacing: 4) {
          ForEach(model.zoomStops, id: \.self) { zoom in
            Button { model.setZoom(zoom) } label: {
              Text("\(zoom, specifier: zoom.rounded() == zoom ? "%.0f" : "%.1f")×")
                .font(.system(size: 14, weight: .semibold)).monospacedDigit()
                .foregroundStyle(abs(model.zoom - zoom) < 0.08 ? .yellow : .white)
                .frame(minWidth: 44, minHeight: 44)
                .background(abs(model.zoom - zoom) < 0.08 ? Color.white.opacity(0.15) : .clear, in: Circle())
            }.buttonStyle(.plain).accessibilityLabel("Zoom \(zoom, specifier: "%.1f") times")
          }
        }.padding(4).background(.ultraThinMaterial, in: Capsule())
      }
      HStack(spacing: landscape ? 14 : 42) {
        icon("slider.horizontal.3", "Video settings") { model.showSettings = true }
        Button {
          if model.recording || model.phase == "starting" { model.stopRecording() }
          else { model.record(rotation: captureAngle) }
        } label: {
          ZStack {
            Circle().strokeBorder(.white, lineWidth: 4).frame(width: 80, height: 80)
            RoundedRectangle(cornerRadius: model.recording ? 7 : 34)
              .fill(.red).frame(width: model.recording ? 30 : 66, height: model.recording ? 30 : 66)
            if model.busy && !model.recording { ProgressView().tint(.white) }
          }.frame(width: 88, height: 88)
        }
        .buttonStyle(.plain)
        .disabled((model.busy && !model.recording && model.phase != "starting") || (!model.ready && !model.recording))
        .accessibilityLabel(model.recording ? "Stop recording" : "Record a video")
        icon("arrow.trianglehead.2.clockwise.rotate.90.camera", "Switch camera") { model.change { $0.front.toggle() } }
          .disabled(model.busy || model.configuring)
      }
      if model.cinematicSupported {
        Picker("Capture mode", selection: Binding(
          get: { model.settings.cinematic },
          set: { value in model.change { $0.cinematic = value } }
        )) {
          Text("Video").tag(false)
          Text("Cinematic").tag(true)
        }
        .pickerStyle(.segmented)
        .frame(maxWidth: 300)
        .disabled(model.busy || model.configuring)
        .accessibilityLabel("Capture mode")
      } else {
        Text("Video").font(.subheadline.weight(.semibold))
      }
    }
    .padding(.vertical, 12)
    .frame(maxWidth: landscape ? 300 : .infinity)
  }

  @ViewBuilder
  private func icon(_ symbol: String, _ label: String, selected: Bool = false, action: @escaping () -> Void) -> some View {
    if #available(iOS 26.0, *) {
      Button(action: action) {
        Image(systemName: symbol).font(.title3)
          .foregroundStyle(selected ? .yellow : .white)
          .frame(minWidth: 28, minHeight: 28)
      }.buttonStyle(.glass).buttonBorderShape(.circle).controlSize(.large)
        .accessibilityLabel(label)
    } else {
      Button(action: action) {
        Image(systemName: symbol).font(.title3)
          .foregroundStyle(selected ? .yellow : .white)
          .frame(minWidth: 28, minHeight: 28)
      }.buttonStyle(.bordered).buttonBorderShape(.capsule).controlSize(.large)
        .accessibilityLabel(label)
    }
  }

  private var heights: [Int32] { Array(Set(model.profiles.map(\.height))).sorted(by: >) }
  private var rates: [Int] { Array(Set(model.profiles.filter { $0.height == model.settings.height && $0.hdr == model.settings.hdr }.map(\.fps))).sorted() }
  private var hdrSupported: Bool { model.profiles.contains { $0.height == model.settings.height && $0.fps == model.settings.fps && $0.hdr } }

  private var settingsSheet: some View {
    NavigationStack {
      Form {
        Section {
          Picker("Resolution", selection: Binding(get: { model.settings.height }, set: { value in model.change { $0.height = value } })) {
            ForEach(heights, id: \.self) { Text(AppleCaptureCatalog.label($0)).tag($0) }
          }
          Picker("Frames per second", selection: Binding(get: { model.settings.fps }, set: { value in model.change { $0.fps = value } })) {
            ForEach(rates, id: \.self) { Text("\($0) fps").tag($0) }
          }
          Toggle(isOn: Binding(get: { model.settings.hdr }, set: { value in model.change { $0.hdr = value } })) {
            Label("HDR video", systemImage: "circle.lefthalf.filled")
          }.disabled(!hdrSupported)
          Toggle(isOn: Binding(get: { model.settings.stabilization }, set: { value in model.change { $0.stabilization = value } })) {
            Label("Automatic stabilization", systemImage: "hand.raised")
          }
          Toggle(isOn: Binding(get: { model.settings.audio }, set: model.setAudio)) { Label("Record audio", systemImage: "mic") }
        } header: { Text("Recording") } footer: {
          Text("Only combinations supported by this camera are offered. HDR preserves more detail in shadows and highlights. Higher frame rates need more light and storage.")
        }.disabled(model.busy || model.configuring)
        if model.settings.cinematic {
          Section {
            HStack { Label("Depth", systemImage: "f.cursive"); Spacer(); Text("ƒ/\(model.aperture, specifier: "%.1f")").monospacedDigit() }
            Slider(value: Binding(get: { model.aperture }, set: model.setAperture), in: model.apertureRange)
              .accessibilityLabel("Cinematic simulated aperture")
          } footer: { Text("Apple’s Cinematic mode creates depth effects and focus transitions.") }
            .disabled(model.busy)
        }
        Section {
          HStack { Label("Exposure", systemImage: "plusminus"); Spacer(); Text("\(model.exposure, specifier: "%+.1f") EV").monospacedDigit() }
          Slider(value: Binding(get: { model.exposure }, set: model.setExposure), in: model.exposureRange)
            .accessibilityLabel("Exposure compensation")
          Button("Reset exposure") { model.setExposure(0) }
          Toggle(isOn: $grid) { Label("Grid", systemImage: "grid") }
          Button("Autofocus", systemImage: "viewfinder") { model.resetFocus() }
        } header: { Text("Framing") } footer: {
          Text("Tap your subject to focus. Touch and hold to lock focus and exposure. Pinch to zoom. Focus, exposure and white balance adjust automatically.")
        }
        Section {
          Label("Automatically add to Photos", systemImage: "photo.on.rectangle")
          Text("The original video is recorded on this iPhone. Sharing a preview with another device is currently a separate mode.").font(.footnote).foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Video settings").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { model.showSettings = false } } }
    }
    .presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
    .preferredColorScheme(.dark)
  }
}
