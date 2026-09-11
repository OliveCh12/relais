import AVFoundation
import Combine
import UIKit
import Darwin

final class AppleCameraModel: NSObject, ObservableObject, AVCaptureFileOutputRecordingDelegate {
  private let hardware: [String: String] = {
    var system = utsname()
    let available = uname(&system) == 0
    let identifier = withUnsafeBytes(of: &system.machine) {
      String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self)
    }
    return ["platform": "ios", "manufacturer": "Apple",
      "model": available && !identifier.isEmpty ? identifier : UIDevice.current.model,
      "osVersion": UIDevice.current.systemVersion]
  }()
  let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "app.relais.capture", qos: .userInitiated)
  private let movie = AVCaptureMovieFileOutput()
  private let photo = AVCapturePhotoOutput()
  private let previewOutput = AVCaptureVideoDataOutput()
  private let previewQueue = DispatchQueue(label: "app.relais.preview", qos: .userInitiated)
  private var photoCapture: ApplePhotoCapture?
  var captureAngle: CGFloat = 90
  var onConnect: (() -> Void)?
  @Published var connectionLabel = "Connect"
  @Published private(set) var photoQuality = "Photo"
  @Published private(set) var canShare = false
  private var input: AVCaptureDeviceInput?
  private var metadata: AVCaptureMetadataOutput?
  private var observers: [NSObjectProtocol] = []
  private var lightObservation: NSKeyValueObservation?
  private var captureSettings = AppleCaptureSettings()
  private var finishing = false
  private var stopAfterStart = false
  private var backgrounded = true
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  private var closeAfterSave = false
  private var previousIdleTimer = false
  private var visible = false
  private var closing = false
  private var generation = 0
  private var requestingPermission = false
  private var canFlip = false
  private var photoTimerTask: Task<Void, Never>?
  @Published private(set) var timerSeconds = 0
  @Published private(set) var flashMode = "auto"
  @Published private(set) var exposure = 0.0
  @Published var showExposure = false
  var minExposure: Double { Double(activeDevice?.minExposureTargetBias ?? 0) }
  var maxExposure: Double { Double(activeDevice?.maxExposureTargetBias ?? 0) }
  var hasFlash: Bool { activeDevice?.hasFlash ?? false }
  private var settingsRevision = 0
  private var remoteApplying = false
  private var remoteAction: String?
  private var remoteID: UUID?
  private var remoteCompletion: ((Result<[String: Any], Error>) -> Void)?
  private var remoteDeadline: DispatchWorkItem?
  private(set) var lastSavedAssetIdentifier: String?


  @Published private(set) var settings = AppleCaptureSettings()
  @Published private(set) var profiles: [AppleCaptureProfile] = []
  @Published private(set) var ready = false
  @Published private(set) var configuring = false { didSet { scheduleRemoteCompletion() } }
  @Published private(set) var authorized = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
  @Published private(set) var phase = "idle" { didSet { scheduleRemoteCompletion() } }
  @Published private(set) var startedAt: Date?
  @Published private(set) var message = ""
  @Published private(set) var lowLight = false
  @Published private(set) var cinematicSupported = false
  @Published private(set) var zoom = 1.0
  @Published private(set) var zoomStops: [Double] = []
  @Published private(set) var minZoom = 1.0
  @Published private(set) var maxZoom = 1.0
  @Published private(set) var pending: [String] = []
  @Published private(set) var stabilizationActive = false
  @Published private(set) var stabilizationSupported = false
  @Published private(set) var activeDevice: AVCaptureDevice?
  @Published var grid = UserDefaults.standard.bool(forKey: "relais.camera.grid") {
    didSet { UserDefaults.standard.set(grid, forKey: "relais.camera.grid"); settingsRevision += 1 }
  }
  @Published var showSettings = false
  var onClose: (() -> Void)?
  var busy: Bool { !["idle", "saved", "pending", "error"].contains(phase) }
  var recording: Bool { phase == "recording" }

  override init() {
    super.init()
    let center = NotificationCenter.default
    observers = [
      center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
        self?.suspend()
      },
      center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.resume()
      },
      center.addObserver(forName: .AVCaptureSessionWasInterrupted, object: session, queue: .main) { [weak self] _ in
        self?.ready = false
        self?.message = "Camera interrupted. The current recording is retained."
        self?.cancelTimer()
        self?.stopRecording()
      },
      center.addObserver(forName: .AVCaptureSessionInterruptionEnded, object: session, queue: .main) { [weak self] _ in
        self?.resume()
      },
      center.addObserver(forName: .AVCaptureSessionRuntimeError, object: session, queue: .main) { [weak self] note in
        self?.cancelTimer()
        self?.ready = false
        self?.message = (note.userInfo?[AVCaptureSessionErrorKey] as? Error)?.localizedDescription ?? "Camera unavailable. Reopen Camera."
      }
    ]
  }

  deinit { observers.forEach(NotificationCenter.default.removeObserver) }

  func appear() {
    guard !visible else { return }
    visible = true
    closing = false
    previousIdleTimer = UIApplication.shared.isIdleTimerDisabled
    UIApplication.shared.isIdleTimerDisabled = true
    refreshPending()
    resume()
  }

  func disappear() {
    guard visible else { return }
    visible = false
    UIApplication.shared.isIdleTimerDisabled = previousIdleTimer
    suspend()
  }

  func requestAccess() {
    guard visible, !requestingPermission else { return }
    requestingPermission = true
    let request = generation
    Task { @MainActor in
      defer { requestingPermission = false; if !ready { resume() } }
      let granted = await AVCaptureDevice.requestAccess(for: .video)
      guard visible, !closing, generation == request else { return }
      authorized = granted
      guard granted else {
        message = "Allow camera access in Settings to record."
        return
      }
      let audio = await AVCaptureDevice.requestAccess(for: .audio)
      guard visible, !closing, generation == request else { return }
      var desired = settings
      desired.audio = audio
      configure(desired)
    }
  }

  func retry() { resume() }

  func change(_ mutate: (inout AppleCaptureSettings) -> Void) {
    guard !busy, !configuring else { return }
    var next = settings
    mutate(&next)
    if next.cinematic != settings.cinematic { next.fps = 30 }
    configure(next)
  }

  func setAudio(_ enabled: Bool, operation: UUID? = nil) {
    guard visible, !busy, !configuring, !requestingPermission else { return }
    requestingPermission = true
    let request = generation
    Task { @MainActor in
      defer { requestingPermission = false; finishAdjustment(operation, .success(())); if !ready { resume() } }
      let granted = enabled ? await AVCaptureDevice.requestAccess(for: .audio) : true
      guard visible, !closing, generation == request,
        operation == nil || remoteID == operation else { return }
      if !granted {
        message = "Allow microphone access in Settings on the camera phone to record audio."
        finishAdjustment(operation, .failure(CaptureFailure(message)))
        return
      }
      change { $0.audio = enabled }
    }
  }

  private func configure(_ desired: AppleCaptureSettings) {
    guard canUseCamera, authorized, !busy, !configuring else { return }
    let request = generation
    phase = "idle"
    configuring = true
    ready = false
    message = ""
    queue.async {
      self.backgrounded = false
      do { try self.configureSession(desired, generation: request) }
      catch {
        self.session.stopRunning()
        self.session.beginConfiguration()
        self.session.inputs.forEach(self.session.removeInput)
        self.session.outputs.forEach(self.session.removeOutput)
        self.session.commitConfiguration()
        self.input = nil
        self.metadata = nil
        self.lightObservation = nil
        DispatchQueue.main.async {
          guard self.generation == request, self.visible, !self.closing else { return }
          self.configuring = false
          self.canShare = false
          self.activeDevice = nil
          self.profiles = []
          self.stabilizationSupported = false
          self.stabilizationActive = false
          self.message = error.localizedDescription
        }
      }
    }
  }

  private func configureSession(_ requested: AppleCaptureSettings, generation request: Int) throws {
    let candidates = AppleCaptureCatalog.devices(front: requested.front)
    let cinematicSupported = candidates.contains {
      !AppleCaptureCatalog.profiles(for: $0, cinematic: true).isEmpty
    }
    let possible = candidates.compactMap { device -> (AVCaptureDevice, [AppleCaptureProfile], AppleCaptureProfile)? in
      let profiles = AppleCaptureCatalog.profiles(for: device, cinematic: requested.cinematic)
      guard let profile = AppleCaptureCatalog.select(requested, from: profiles) else { return nil }
      return (device, profiles, profile)
    }
    // Prefer the virtual camera for seamless lens transitions, but allow a physical camera for a higher cadence.
    var chosen = possible.first(where: { $0.2.height == requested.height && $0.2.fps == requested.fps && $0.2.hdr == requested.hdr })
      ?? possible.first(where: { $0.2.height == requested.height && $0.2.fps == requested.fps })
      ?? possible.first
    if requested.photo {
      chosen = candidates.compactMap { device -> (AVCaptureDevice, [AppleCaptureProfile], AppleCaptureProfile)? in
        guard let profile = AppleCaptureCatalog.photoProfile(for: device) else { return nil }
        return (device, [], profile)
      }.first
    }
    guard let (device, _, profile) = chosen else {
      throw CaptureFailure(requested.cinematic ? "Cinematic mode is unavailable on this camera." : "No camera available. Use a physical iPhone to record.")
    }
    let allProfiles = possible.flatMap { $0.1 }
    var selected = requested
    if !requested.photo {
      selected.height = profile.height
      selected.fps = profile.fps
      selected.hdr = profile.hdr
    }
    selected.audio = requested.audio && AVCaptureDevice.authorizationStatus(for: .audio) == .authorized

    session.beginConfiguration()
    var committed = false
    defer { if !committed { session.commitConfiguration() } }
    session.sessionPreset = .inputPriority
    session.automaticallyConfiguresCaptureDeviceForWideColor = false
    session.inputs.forEach(session.removeInput)
    session.outputs.forEach(session.removeOutput)
    metadata = nil
    let videoInput = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(videoInput) else { throw CaptureFailure("This camera is unavailable.") }
    session.addInput(videoInput)
    input = videoInput
    if !selected.photo, selected.audio, let mic = AVCaptureDevice.default(for: .audio) {
      let audioInput = try AVCaptureDeviceInput(device: mic)
      guard session.canAddInput(audioInput) else { throw CaptureFailure("The microphone is unavailable.") }
      session.addInput(audioInput)
      if #available(iOS 18.0, *), audioInput.isMultichannelAudioModeSupported(.stereo) {
        audioInput.multichannelAudioMode = .stereo
      }
    }
    try device.lockForConfiguration()
    device.activeFormat = profile.format
    device.activeColorSpace = selected.photo && profile.format.supportedColorSpaces.contains(.P3_D65)
      ? .P3_D65 : profile.hdr ? .HLG_BT2020 : .sRGB
    device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: Int32(profile.fps))
    device.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: Int32(profile.fps))
    if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
    if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
    if device.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) { device.whiteBalanceMode = .continuousAutoWhiteBalance }
    if device.isSmoothAutoFocusSupported { device.isSmoothAutoFocusEnabled = true }
    device.setExposureTargetBias(0)
    device.isSubjectAreaChangeMonitoringEnabled = true
    if device.hasTorch { device.torchMode = .off }
    device.unlockForConfiguration()
    if #available(iOS 26.0, *), selected.cinematic {
      guard videoInput.isCinematicVideoCaptureSupported else { throw CaptureFailure("This combination does not support Cinematic mode.") }
      videoInput.isCinematicVideoCaptureEnabled = true
      videoInput.simulatedAperture = profile.format.defaultSimulatedAperture
    }
    if !selected.photo {
    guard session.canAddOutput(movie) else { throw CaptureFailure("Recording is unavailable with these settings.") }
    session.addOutput(movie)
    if #available(iOS 26.0, *), selected.cinematic {
      let metadata = AVCaptureMetadataOutput()
      guard session.canAddOutput(metadata) else { throw CaptureFailure("Cinematic tracking is unavailable.") }
      session.addOutput(metadata)
      metadata.metadataObjectTypes = metadata.requiredMetadataObjectTypesForCinematicVideoCapture
      self.metadata = metadata
    }
    guard let connection = movie.connection(with: .video) else { throw CaptureFailure("Video output is not ready.") }
    connection.automaticallyAdjustsVideoMirroring = false
    if connection.isVideoMirroringSupported { connection.isVideoMirrored = false }
    if connection.isVideoStabilizationSupported {
      if selected.stabilization {
        if #available(iOS 18.0, *), selected.cinematic, profile.format.isVideoStabilizationModeSupported(.cinematicExtendedEnhanced) {
          connection.preferredVideoStabilizationMode = .cinematicExtendedEnhanced
        } else { connection.preferredVideoStabilizationMode = .auto }
      } else { connection.preferredVideoStabilizationMode = .off }
    } else { selected.stabilization = false }
    let codec: AVVideoCodecType = movie.availableVideoCodecTypes.contains(.hevc) ? .hevc : .h264
    guard !selected.hdr || codec == .hevc else { throw CaptureFailure("HDR requires the HEVC encoder on this camera.") }
    movie.setOutputSettings([AVVideoCodecKey: codec], for: connection)
    } else {
      guard session.canAddOutput(photo) else { throw CaptureFailure("Photo capture is unavailable on this camera.") }
      session.addOutput(photo)
      photo.maxPhotoQualityPrioritization = .quality
      if let dimensions = profile.format.supportedMaxPhotoDimensions.max(by: {
        Int64($0.width) * Int64($0.height) < Int64($1.width) * Int64($1.height)
      }) { photo.maxPhotoDimensions = dimensions }
    }
    previewOutput.alwaysDiscardsLateVideoFrames = true
    previewOutput.setSampleBufferDelegate(RelaisPreviewSource.shared(), queue: previewQueue)
    if #available(iOS 17.0, *) {
      previewOutput.automaticallyConfiguresOutputBufferDimensions = false
      previewOutput.deliversPreviewSizedOutputBuffers = false
    }
    let shareable = session.canAddOutput(previewOutput)
    if shareable {
      session.addOutput(previewOutput)
      let preferred = !selected.photo && selected.hdr
        ? kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange : kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
      if previewOutput.availableVideoPixelFormatTypes.contains(preferred) {
        previewOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: preferred]
      } else { previewOutput.videoSettings = [:] }
    }
    session.commitConfiguration()
    committed = true
    captureSettings = selected
    if !backgrounded && !session.isRunning { session.startRunning() }

    let multiplier = displayZoomMultiplier(for: device)
    let lower = device.minAvailableVideoZoomFactor * multiplier
    let upper = device.maxAvailableVideoZoomFactor * multiplier
    let zoomStops = ([lower, 1, 2] + device.virtualDeviceSwitchOverVideoZoomFactors.map { $0.doubleValue * multiplier })
      .filter { $0 >= lower && $0 <= upper }
    try device.lockForConfiguration()
    device.videoZoomFactor = min(device.maxAvailableVideoZoomFactor, max(device.minAvailableVideoZoomFactor, 1 / multiplier))
    device.unlockForConfiguration()
    lightObservation = nil
    if #available(iOS 26.0, *), selected.cinematic {
      lightObservation = device.observe(\.cinematicVideoCaptureSceneMonitoringStatuses, options: [.initial, .new]) { [weak self] device, _ in
        let insufficient = !device.cinematicVideoCaptureSceneMonitoringStatuses.isEmpty
        DispatchQueue.main.async {
          guard let self, self.generation == request, self.visible, !self.closing else { return }
          self.lowLight = insufficient
        }
      }
    }
    let canFlip = !AppleCaptureCatalog.devices(front: !selected.front).isEmpty
    let running = session.isRunning && !session.isInterrupted
    let connection = movie.connection(with: .video)
    let stable = connection.map { $0.activeVideoStabilizationMode != .off } ?? false
    let supportsStabilization = connection?.isVideoStabilizationSupported ?? false
    let megapixels = Int((Double(photo.maxPhotoDimensions.width) * Double(photo.maxPhotoDimensions.height) / 1_000_000).rounded())
    let displayZoom = device.videoZoomFactor * multiplier
    DispatchQueue.main.async {
      guard self.generation == request, self.visible, !self.closing else { return }
      self.canFlip = canFlip
      self.canShare = shareable
      self.photoQuality = megapixels > 0 ? "\(megapixels) MP" : "Photo"
      self.settingsRevision += 1
      self.settings = selected
      self.activeDevice = device
      self.exposure = Double(device.exposureTargetBias)
      self.showExposure = false
      self.profiles = allProfiles
      self.cinematicSupported = cinematicSupported
      self.configuring = false
      self.ready = running && self.canUseCamera
      self.minZoom = lower
      self.maxZoom = upper
      self.zoomStops = Array(Set(zoomStops)).sorted()
      self.zoom = displayZoom
      self.stabilizationActive = stable
      self.stabilizationSupported = supportsStabilization
      if !selected.cinematic { self.lowLight = false }
      if selected.height != requested.height || selected.fps != requested.fps || selected.hdr != requested.hdr {
        self.message = "Adjusted settings: \(AppleCaptureCatalog.label(selected.height)) · \(selected.fps) fps\(selected.hdr ? " · HDR" : "")."
      }
    }
  }

  func setZoom(_ displayValue: Double, operation: UUID? = nil) {
    let request = generation
    queue.async {
      guard let device = self.input?.device else { return }
      do {
        try device.lockForConfiguration()
        let multiplier = self.displayZoomMultiplier(for: device)
        let value = min(device.maxAvailableVideoZoomFactor, max(device.minAvailableVideoZoomFactor, displayValue / multiplier))
        device.videoZoomFactor = value
        device.unlockForConfiguration()
        DispatchQueue.main.async {
          guard self.generation == request else { return }
          self.zoom = value * multiplier
          self.settingsRevision += 1
          self.finishAdjustment(operation, .success(()))
        }
      } catch {
        self.report(error)
        DispatchQueue.main.async { self.finishAdjustment(operation, .failure(error)) }
      }
    }
  }

  func setExposure(_ value: Double, operation: UUID? = nil) {
    guard ready, !configuring, (!busy || recording), value.isFinite, value >= minExposure, value <= maxExposure else {
      finishAdjustment(operation, .failure(CaptureFailure("This brightness is unavailable on the camera phone.")))
      return
    }
    let request = generation
    queue.async {
      guard let device = self.input?.device else { return }
      do {
        try device.lockForConfiguration()
        device.setExposureTargetBias(Float(value)) { _ in
          DispatchQueue.main.async {
            guard self.generation == request else { return }
            self.exposure = Double(device.exposureTargetBias)
            self.settingsRevision += 1
            self.finishAdjustment(operation, .success(()))
          }
        }
        device.unlockForConfiguration()
      } catch {
        self.report(error)
        DispatchQueue.main.async { self.finishAdjustment(operation, .failure(error)) }
      }
    }
  }

  func meter(at point: CGPoint, completion: ((Result<Void, Error>) -> Void)? = nil) {
    guard ready, !configuring, !busy || recording else {
      completion?(.failure(CaptureFailure("Camera is not ready.")))
      return
    }
    queue.async {
      do {
        guard let device = self.input?.device else { throw CaptureFailure("Camera is not ready.") }
        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }
        if device.isFocusPointOfInterestSupported { device.focusPointOfInterest = point }
        if device.isExposurePointOfInterestSupported { device.exposurePointOfInterest = point }
        if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
        if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
        DispatchQueue.main.async { completion?(.success(())) }
      } catch {
        self.report(error)
        DispatchQueue.main.async { completion?(.failure(error)) }
      }
    }
  }

  func setTimer(_ seconds: Int) {
    guard !busy, [0, 3, 10].contains(seconds) else { return }
    timerSeconds = seconds
    settingsRevision += 1
  }

  func setFlash(_ value: String) {
    guard !busy, hasFlash, ["auto", "on", "off"].contains(value) else { return }
    flashMode = value
    settingsRevision += 1
  }

  func cancelTimer() {
    guard phase == "countdown" else { return }
    photoTimerTask?.cancel()
    photoTimerTask = nil
    phase = "idle"
    message = "Photo canceled"
    if remoteAction == "photo" { completeRemote(.success(captureState)) }
  }

  private func displayZoomMultiplier(for device: AVCaptureDevice) -> CGFloat {
    if #available(iOS 18.0, *) { return device.displayVideoZoomFactorMultiplier }
    return device.deviceType == .builtInTripleCamera || device.deviceType == .builtInDualWideCamera ? 0.5 : 1
  }

  private var remoteSettings: [String: Any] {
    var seen = Set<String>()
    let unique = profiles.filter { seen.insert($0.id).inserted }
    let selected = "\(settings.height)-\(settings.fps)-\(settings.hdr)"
    return ["controls": ["exposure": min(maxExposure, max(minExposure, exposure)),
      "minExposure": minExposure, "maxExposure": maxExposure, "timer": timerSeconds,
      "flash": hasFlash ? flashMode : "off", "hasFlash": hasFlash] as [String: Any],
      "revision": settingsRevision,
      "profiles": unique.map { ["id": $0.id, "height": $0.height, "fps": $0.fps, "hdr": $0.hdr] as [String: Any] },
      "profile": !settings.photo && unique.contains(where: { $0.id == selected }) ? selected as Any : NSNull(),
      "audio": settings.audio, "grid": grid, "position": settings.front ? "front" : "back",
      "canFlip": canFlip,
      "zoom": min(maxZoom, max(minZoom, zoom)), "minZoom": minZoom, "maxZoom": maxZoom,
      "zoomStops": zoomStops, "stabilization": settings.stabilization, "canStabilize": stabilizationSupported]
  }

  private func applyRemoteSettings(_ text: String) throws {
    guard let data = text.data(using: .utf8), data.count <= 1024,
      let command = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      command["type"] as? String == "settings", let revision = command["revision"] as? Int,
      let key = command["key"] as? String else { throw CaptureFailure("Invalid camera setting.") }
    guard revision == settingsRevision else { throw CaptureFailure("Camera settings changed. Please try again with the updated options.") }
    remoteApplying = true
    let operation = remoteID
    switch key {
    case "focus":
      guard let point = command["value"] as? [String: Double], let x = point["x"], let y = point["y"],
        x.isFinite, y.isFinite, (0...1).contains(x), (0...1).contains(y) else { throw CaptureFailure("Invalid focus point.") }
      let sensorPoint: CGPoint
      switch RelaisPreviewSource.shared().rotation {
      case 90: sensorPoint = CGPoint(x: y, y: 1 - x)
      case 180: sensorPoint = CGPoint(x: 1 - x, y: 1 - y)
      case 270: sensorPoint = CGPoint(x: 1 - y, y: x)
      default: sensorPoint = CGPoint(x: x, y: y)
      }
      meter(at: sensorPoint) { [weak self] result in
        guard let self else { return }
        self.finishAdjustment(operation, result)
      }
      return
    case "exposure":
      guard let value = command["value"] as? Double, value.isFinite, value >= minExposure, value <= maxExposure else { throw CaptureFailure("Invalid brightness.") }
      setExposure(value, operation: operation)
      return
    case "timer":
      guard settings.photo, let value = command["value"] as? Int, [0, 3, 10].contains(value) else { throw CaptureFailure("Invalid photo timer.") }
      setTimer(value)
    case "flash":
      guard settings.photo, hasFlash, let value = command["value"] as? String, ["off", "auto", "on"].contains(value) else { throw CaptureFailure("Flash is unavailable on this camera.") }
      setFlash(value)
    case "profile":
      guard !settings.photo, let id = command["value"] as? String,
        let profile = profiles.first(where: { $0.id == id }) else { throw CaptureFailure("This video quality is unavailable on the camera phone.") }
      change { $0.height = profile.height; $0.fps = profile.fps; $0.hdr = profile.hdr }
    case "position":
      guard let position = command["value"] as? String, ["front", "back"].contains(position),
        !AppleCaptureCatalog.devices(front: position == "front").isEmpty else { throw CaptureFailure("This camera is unavailable.") }
      change { $0.front = position == "front" }
    case "audio":
      guard let value = command["value"] as? Bool, !settings.photo else { throw CaptureFailure("Switch to Video to change audio.") }
      setAudio(value, operation: operation)
      return
    case "grid":
      guard let value = command["value"] as? Bool else { throw CaptureFailure("Invalid grid setting.") }
      grid = value
    case "stabilization":
      guard let value = command["value"] as? Bool, stabilizationSupported, !settings.photo else { throw CaptureFailure("Stabilization is unavailable with these settings.") }
      change { $0.stabilization = value }
    case "zoom":
      guard let value = command["value"] as? Double, value.isFinite, value >= minZoom, value <= maxZoom else { throw CaptureFailure("This zoom is unavailable on the camera phone.") }
      setZoom(value, operation: operation)
      return
    default: throw CaptureFailure("Unknown camera setting.")
    }
    remoteApplying = false
  }

  var captureState: [String: Any] {
    ["hardware": hardware,
     "mode": settings.photo ? "photo" : settings.cinematic ? "cinematic" : "video",
     "modes": cinematicSupported ? ["photo", "video", "cinematic"] : ["photo", "video"],
     "settings": remoteSettings, "phase": phase, "ready": ready && !configuring, "canShare": canShare,
     "canCapture": canUseCamera && ready && !busy && !configuring && phase != "pending",
     "quality": settings.photo ? photoQuality : "\(AppleCaptureCatalog.label(settings.height)) · \(settings.fps) fps\(settings.hdr ? " · HDR" : "")",
     "message": message, "startedAt": startedAt.map { $0.timeIntervalSince1970 * 1000 } ?? 0]
  }

  func perform(_ action: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
    if action == "cancel-timer" {
      guard phase == "countdown" else { completion(.failure(CaptureFailure("The photo timer has already finished."))); return }
      cancelTimer()
      completion(.success(captureState))
      return
    }
    if action == "stop", canUseCamera, phase == "recording" || phase == "starting",
      let previous = remoteAction, previous == "start" || previous.hasPrefix("{") {
      completeRemote(.failure(CaptureFailure("Pending camera adjustment was cancelled by Stop.")))
    }
    guard remoteCompletion == nil else { completion(.failure(CaptureFailure("Wait for the camera to finish."))); return }
    let operation = UUID()
    remoteID = operation
    remoteAction = action
    remoteCompletion = completion
    let deadline = DispatchWorkItem { [weak self] in
      guard let self, self.remoteID == operation else { return }
      self.completeRemote(.failure(CaptureFailure("The camera has not confirmed completion. Check the camera phone before retrying.")))
    }
    remoteDeadline = deadline
    DispatchQueue.main.asyncAfter(deadline: .now() + 90, execute: deadline)
    do { try perform(action); scheduleRemoteCompletion() }
    catch { completeRemote(.failure(error)) }
  }

  private func finishAdjustment(_ operation: UUID?, _ result: Result<Void, Error>) {
    guard let operation, remoteID == operation else { return }
    remoteApplying = false
    switch result {
    case .success: scheduleRemoteCompletion()
    case .failure(let error): completeRemote(.failure(error))
    }
  }

  private func completeRemote(_ result: Result<[String: Any], Error>) {
    let completion = remoteCompletion
    remoteCompletion = nil
    remoteID = nil
    remoteApplying = false
    remoteAction = nil
    remoteDeadline?.cancel()
    remoteDeadline = nil
    completion?(result)
  }

  private func scheduleRemoteCompletion() {
    guard let operation = remoteID else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self, self.remoteID == operation, let action = self.remoteAction else { return }
      if self.phase == "pending" || self.phase == "error" {
        self.completeRemote(.failure(CaptureFailure(self.message.isEmpty ? "Capture failed. Check the camera phone." : self.message)))
      } else if action == "start", self.phase == "recording" {
        self.completeRemote(.success(self.captureState))
      } else if ["photo", "stop", "retry-save"].contains(action), self.phase == "saved" {
        self.completeRemote(.success(self.captureState))
      } else if (action.hasPrefix("mode-") || action.hasPrefix("{")) && !self.remoteApplying {
        if self.ready && !self.configuring { self.completeRemote(.success(self.captureState)) }
        else if !self.configuring && !self.message.isEmpty { self.completeRemote(.failure(CaptureFailure(self.message))) }
      }
    }
  }

  func perform(_ action: String) throws {
    guard canUseCamera else { throw CaptureFailure("Keep Camera open on the other phone.") }
    if action == "stop" {
      guard phase == "recording" || phase == "starting" else { throw CaptureFailure("There is no recording to stop.") }
      stopRecording(); return
    }
    if action == "retry-save" {
      guard !busy, !pending.isEmpty else { throw CaptureFailure("There is no capture waiting to be saved.") }
      recover(); return
    }
    if action.hasPrefix("{"), phase == "recording", ready, !configuring,
      let data = action.data(using: .utf8), let command = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      let key = command["key"] as? String, ["zoom", "grid", "exposure", "focus"].contains(key) {
      try applyRemoteSettings(action); return
    }
    guard ready, !busy, !configuring, phase != "pending" else { throw CaptureFailure("Wait for the camera to be ready.") }
    if action.hasPrefix("{") { try applyRemoteSettings(action); return }
    switch action {
    case "photo":
      guard settings.photo else { throw CaptureFailure("Switch to Photo first.") }
      takePhoto()
    case "start":
      guard !settings.photo else { throw CaptureFailure("Switch to Video first.") }
      record(rotation: captureAngle)
    case "mode-photo": change { $0.photo = true; $0.cinematic = false }
    case "mode-video": change { $0.photo = false; $0.cinematic = false }
    case "mode-cinematic":
      guard cinematicSupported else { throw CaptureFailure("Cinematic mode is unavailable on this camera.") }
      change { $0.photo = false; $0.cinematic = true }
    default: throw CaptureFailure("Unknown camera action.")
    }
  }

  func takePhoto() {
    guard canUseCamera, ready, !busy, !configuring, phase != "pending", settings.photo else { return }
    guard timerSeconds > 0 else { capturePhotoNow(); return }
    phase = "countdown"
    showExposure = false
    let request = generation
    let deadline = Date().addingTimeInterval(TimeInterval(timerSeconds))
    photoTimerTask = Task { @MainActor [weak self] in
      guard let self else { return }
      while !Task.isCancelled {
        let remaining = Int(ceil(deadline.timeIntervalSinceNow))
        guard remaining > 0 else { break }
        self.message = "Photo in \(remaining)…"
        do { try await Task.sleep(nanoseconds: 1_000_000_000) } catch { return }
      }
      guard !Task.isCancelled, self.generation == request, self.canUseCamera, self.phase == "countdown" else { return }
      self.photoTimerTask = nil
      self.phase = "idle"
      self.capturePhotoNow()
    }
  }

  private func capturePhotoNow() {
    guard canUseCamera, ready, !busy, !configuring, phase != "pending", settings.photo else { return }
    phase = "capturing"
    message = ""
    let angle = captureAngle
    let requestedFlash: AVCaptureDevice.FlashMode = flashMode == "on" ? .on : flashMode == "auto" ? .auto : .off
    queue.async {
      guard self.session.isRunning, !self.session.isInterrupted else {
        DispatchQueue.main.async { self.phase = "error"; self.message = "Camera interrupted. Try again."; self.endBackgroundTask(); self.completeClose() }
        return
      }
      if let connection = self.photo.connection(with: .video) {
        if #available(iOS 17.0, *), connection.isVideoRotationAngleSupported(angle) { connection.videoRotationAngle = angle }
        else { connection.videoOrientation = Self.videoOrientation(angle) }
      }
      let heic = self.photo.availablePhotoCodecTypes.contains(.hevc)
      let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: heic ? AVVideoCodecType.hevc : .jpeg])
      settings.maxPhotoDimensions = self.photo.maxPhotoDimensions
      settings.photoQualityPrioritization = .quality
      if self.photo.supportedFlashModes.contains(requestedFlash) { settings.flashMode = requestedFlash }
      self.finishing = true
      let capture = ApplePhotoCapture { data, error in
        self.queue.async {
          self.finishing = false
          self.photoCapture = nil
          if self.backgrounded { self.session.stopRunning() }
          do {
            if let error { throw error }
            guard let data else { throw CaptureFailure("The photo could not be captured. Try again.") }
            let url = try RecordingLibrary.directory().appendingPathComponent("Relais-\(UUID().uuidString).\(heic ? "heic" : "jpg")")
            try data.write(to: url, options: .atomic)
            Task { @MainActor in self.phase = "saving"; await self.save([url.path]) }
          } catch {
            DispatchQueue.main.async {
              self.phase = "error"
              self.message = error.localizedDescription
              self.endBackgroundTask()
              self.completeClose()
            }
          }
        }
      }
      self.photoCapture = capture
      self.photo.capturePhoto(with: settings, delegate: capture)
    }
  }

  static func videoOrientation(_ angle: CGFloat) -> AVCaptureVideoOrientation {
    switch (Int((angle / 90).rounded()) % 4 + 4) % 4 {
    case 0: return .landscapeRight
    case 2: return .landscapeLeft
    case 3: return .portraitUpsideDown
    default: return .portrait
    }
  }

  func record(rotation: CGFloat) {
    guard canUseCamera, ready, !busy, !configuring, phase != "pending", !settings.photo else { return }
    phase = "starting"
    message = ""
    queue.async {
      do {
        let directory = try RecordingLibrary.directory()
        let capacity = try directory.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]).volumeAvailableCapacityForImportantUsage ?? 0
        guard capacity > 100_000_000 else { throw CaptureFailure("Not enough space. Free up storage before recording.") }
        guard self.session.isRunning, !self.session.isInterrupted else { throw CaptureFailure("The camera was interrupted.") }
        if let connection = self.movie.connection(with: .video) {
          if #available(iOS 17.0, *), connection.isVideoRotationAngleSupported(rotation) { connection.videoRotationAngle = rotation }
          else { connection.videoOrientation = Self.videoOrientation(rotation) }
        }
        self.stopAfterStart = false
        self.finishing = true
        self.movie.startRecording(to: URL(fileURLWithPath: try RecordingLibrary.createPath()), recordingDelegate: self)
      } catch {
        self.finishing = false
        self.report(error)
        DispatchQueue.main.async { self.phase = "error"; self.endBackgroundTask(); self.completeClose() }
      }
    }
  }

  func stopRecording() {
    guard phase == "recording" || phase == "starting" else { return }
    phase = "stopping"
    queue.async {
      self.stopAfterStart = true
      if self.movie.isRecording { self.movie.stopRecording() }
    }
  }

  func fileOutput(_ output: AVCaptureFileOutput, didStartRecordingTo fileURL: URL, from connections: [AVCaptureConnection]) {
    queue.async {
      if self.stopAfterStart || self.backgrounded { self.movie.stopRecording() }
      else {
        DispatchQueue.main.async {
          guard self.phase == "starting" else { return }
          self.startedAt = Date()
          self.phase = "recording"
        }
      }
    }
  }

  func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo url: URL, from connections: [AVCaptureConnection], error: Error?) {
    queue.async {
      self.finishing = false
      if self.backgrounded { self.session.stopRunning() }
    }
    let failure = error as NSError?
    let successful = failure == nil || (failure?.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool) == true
    Task { @MainActor in
      startedAt = nil
      guard successful else {
        phase = "pending"
        message = failure?.localizedDescription ?? "The recording could not be finalized. The file is still in Relais."
        refreshPending()
        endBackgroundTask()
        completeClose()
        return
      }
      phase = "saving"
      await save([url.path])
    }
  }

  func recover() {
    guard !busy else { return }
    phase = "saving"
    let paths = pending
    Task { @MainActor in await save(paths) }
  }

  @MainActor private func save(_ paths: [String]) async {
    do {
      guard !paths.isEmpty else { throw CaptureFailure("There is no capture waiting to be saved.") }
      for path in paths { lastSavedAssetIdentifier = try await RecordingLibrary.save(path: path) }
      phase = "saved"
      message = "Saved to Photos on this iPhone."
    } catch {
      phase = "pending"
      message = error.localizedDescription
    }
    refreshPending()
    endBackgroundTask()
    completeClose()
    if !ready { resume() }
  }

  func requestClose() {
    cancelTimer()
    if busy {
      closeAfterSave = true
      stopRecording()
    } else { close() }
  }

  private func completeClose() {
    if closeAfterSave { closeAfterSave = false; close() }
  }

  private func close() {
    closing = true
    suspend()
    onClose?()
  }

  private func refreshPending() {
    queue.async {
      let files = (try? FileManager.default.contentsOfDirectory(at: RecordingLibrary.directory(), includingPropertiesForKeys: [.fileSizeKey])) ?? []
      let paths = files.filter { ["mov", "mp4", "jpg", "heic"].contains($0.pathExtension) && ((try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) > 0 }.map(\.path)
      DispatchQueue.main.async { self.pending = paths }
    }
  }

  private func suspend() {
    cancelTimer()
    showExposure = false
    if let action = remoteAction, action.hasPrefix("mode-") || action.hasPrefix("{") {
      completeRemote(.failure(CaptureFailure("Camera interrupted. Reopen Camera to change settings.")))
    }
    generation += 1
    configuring = false
    ready = false
    if busy, backgroundTask == .invalid {
      backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "Finalize Relais video") { [weak self] in self?.endBackgroundTask() }
    }
    stopRecording()
    queue.async {
      self.backgrounded = true
      if !self.finishing { self.session.stopRunning() }
    }
  }

  private func resume() {
    guard canUseCamera, !ready, !requestingPermission else { return }
    authorized = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
    if !busy { configure(settings) }
  }

  private var canUseCamera: Bool {
    visible && !closing && UIApplication.shared.applicationState == .active
  }

  private func endBackgroundTask() {
    if backgroundTask != .invalid { UIApplication.shared.endBackgroundTask(backgroundTask); backgroundTask = .invalid }
  }

  private func report(_ error: Error) {
    DispatchQueue.main.async { self.message = error.localizedDescription }
  }
}

struct CaptureFailure: LocalizedError {
  let text: String
  init(_ text: String) { self.text = text }
  var errorDescription: String? { text }
}
