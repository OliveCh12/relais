import AVFoundation
import Combine
import UIKit

final class AppleCameraModel: NSObject, ObservableObject, AVCaptureFileOutputRecordingDelegate {
  let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "app.relais.capture", qos: .userInitiated)
  private let movie = AVCaptureMovieFileOutput()
  private var input: AVCaptureDeviceInput?
  private var metadata: AVCaptureMetadataOutput?
  private var observers: [NSObjectProtocol] = []
  private var lightObservation: NSKeyValueObservation?
  private var captureSettings = AppleCaptureSettings()
  private var finishing = false
  private var stopAfterStart = false
  private var backgrounded = false
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  private var closeAfterSave = false
  private var previousIdleTimer = false

  @Published private(set) var settings = AppleCaptureSettings()
  @Published private(set) var profiles: [AppleCaptureProfile] = []
  @Published private(set) var ready = false
  @Published private(set) var configuring = false
  @Published private(set) var authorized = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
  @Published private(set) var phase = "idle"
  @Published private(set) var startedAt: Date?
  @Published private(set) var message = ""
  @Published private(set) var lowLight = false
  @Published private(set) var cinematicSupported = false
  @Published private(set) var torchAvailable = false
  @Published private(set) var torch = false
  @Published private(set) var zoom = 1.0
  @Published private(set) var zoomStops: [Double] = []
  @Published private(set) var minZoom = 1.0
  @Published private(set) var maxZoom = 1.0
  @Published private(set) var exposure = 0.0
  @Published private(set) var exposureRange = -2.0...2.0
  @Published private(set) var aperture = 4.0
  @Published private(set) var apertureRange = 2.0...16.0
  @Published private(set) var focusLocked = false
  @Published private(set) var pending: [String] = []
  @Published private(set) var stabilizationActive = false
  @Published private(set) var activeDevice: AVCaptureDevice?
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
      center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
        self?.resume()
      },
      center.addObserver(forName: .AVCaptureSessionWasInterrupted, object: session, queue: .main) { [weak self] _ in
        self?.ready = false
        self?.message = "Camera interrupted. The current recording is retained."
        self?.stopRecording()
      },
      center.addObserver(forName: .AVCaptureSessionInterruptionEnded, object: session, queue: .main) { [weak self] _ in
        self?.resume()
      },
      center.addObserver(forName: .AVCaptureSessionRuntimeError, object: session, queue: .main) { [weak self] note in
        self?.ready = false
        self?.message = (note.userInfo?[AVCaptureSessionErrorKey] as? Error)?.localizedDescription ?? "Camera unavailable. Reopen Camera."
      }
    ]
  }

  deinit { observers.forEach(NotificationCenter.default.removeObserver) }

  func appear() {
    previousIdleTimer = UIApplication.shared.isIdleTimerDisabled
    UIApplication.shared.isIdleTimerDisabled = true
    refreshPending()
    if authorized { resume() }
  }

  func disappear() {
    UIApplication.shared.isIdleTimerDisabled = previousIdleTimer
    suspend()
  }

  func requestAccess() {
    Task { @MainActor in
      let granted = await AVCaptureDevice.requestAccess(for: .video)
      authorized = granted
      guard granted else {
        message = "Allow camera access in Settings to record."
        return
      }
      let audio = await AVCaptureDevice.requestAccess(for: .audio)
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

  func setAudio(_ enabled: Bool) {
    guard !busy, !configuring else { return }
    Task { @MainActor in
      let granted = enabled ? await AVCaptureDevice.requestAccess(for: .audio) : true
      if !granted {
        message = "Allow microphone access in Settings to record audio."
        return
      }
      change { $0.audio = enabled }
    }
  }

  private func configure(_ desired: AppleCaptureSettings) {
    guard authorized, !busy, !configuring else { return }
    configuring = true
    ready = false
    message = ""
    queue.async {
      do { try self.configureSession(desired) }
      catch {
        DispatchQueue.main.async {
          self.configuring = false
          self.message = error.localizedDescription
        }
      }
    }
  }

  private func configureSession(_ requested: AppleCaptureSettings) throws {
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
    let chosen = possible.first(where: { $0.2.height == requested.height && $0.2.fps == requested.fps && $0.2.hdr == requested.hdr })
      ?? possible.first(where: { $0.2.height == requested.height && $0.2.fps == requested.fps })
      ?? possible.first
    guard let (device, _, profile) = chosen else {
      throw CaptureFailure(requested.cinematic ? "Cinematic mode is unavailable on this camera." : "No camera available. Use a physical iPhone to record.")
    }
    let allProfiles = possible.flatMap { $0.1 }
    var selected = requested
    selected.height = profile.height
    selected.fps = profile.fps
    selected.hdr = profile.hdr
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
    if selected.audio, let mic = AVCaptureDevice.default(for: .audio) {
      let audioInput = try AVCaptureDeviceInput(device: mic)
      guard session.canAddInput(audioInput) else { throw CaptureFailure("The microphone is unavailable.") }
      session.addInput(audioInput)
      if #available(iOS 18.0, *), audioInput.isMultichannelAudioModeSupported(.stereo) {
        audioInput.multichannelAudioMode = .stereo
      }
    }
    try device.lockForConfiguration()
    device.activeFormat = profile.format
    device.activeColorSpace = profile.hdr ? .HLG_BT2020 : .sRGB
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
    }
    let codec: AVVideoCodecType = movie.availableVideoCodecTypes.contains(.hevc) ? .hevc : .h264
    guard !selected.hdr || codec == .hevc else { throw CaptureFailure("HDR requires the HEVC encoder on this camera.") }
    movie.setOutputSettings([AVVideoCodecKey: codec], for: connection)
    session.commitConfiguration()
    committed = true
    captureSettings = selected
    if !backgrounded && !session.isRunning { session.startRunning() }

    let multiplier: CGFloat
    if #available(iOS 18.0, *) { multiplier = device.displayVideoZoomFactorMultiplier } else { multiplier = device.deviceType == .builtInTripleCamera || device.deviceType == .builtInDualWideCamera ? 0.5 : 1 }
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
        DispatchQueue.main.async { self?.lowLight = insufficient }
      }
    }
    let running = session.isRunning && !session.isInterrupted
    let stable = connection.activeVideoStabilizationMode != .off
    DispatchQueue.main.async {
      self.settings = selected
      self.activeDevice = device
      self.profiles = allProfiles
      self.cinematicSupported = cinematicSupported
      self.configuring = false
      self.ready = running
      self.torchAvailable = device.hasTorch
      self.torch = false
      self.focusLocked = false
      self.exposure = 0
      self.exposureRange = Double(device.minExposureTargetBias)...Double(device.maxExposureTargetBias)
      self.minZoom = lower
      self.maxZoom = upper
      self.zoomStops = Array(Set(zoomStops)).sorted()
      self.zoom = device.videoZoomFactor * multiplier
      self.stabilizationActive = stable
      self.lowLight = false
      if #available(iOS 26.0, *), selected.cinematic {
        self.aperture = Double(profile.format.defaultSimulatedAperture)
        self.apertureRange = Double(profile.format.minSimulatedAperture)...Double(profile.format.maxSimulatedAperture)
      }
      if selected.height != requested.height || selected.fps != requested.fps || selected.hdr != requested.hdr {
        self.message = "Adjusted settings: \(AppleCaptureCatalog.label(selected.height)) · \(selected.fps) fps\(selected.hdr ? " · HDR" : "")."
      }
    }
  }

  func setTorch() {
    queue.async {
      guard let device = self.input?.device, device.hasTorch else { return }
      do {
        try device.lockForConfiguration()
        let enabled = device.torchMode != .on
        device.torchMode = enabled ? .on : .off
        device.unlockForConfiguration()
        DispatchQueue.main.async { self.torch = enabled }
      } catch { self.report(error) }
    }
  }

  func setExposure(_ value: Double) {
    exposure = value
    queue.async {
      guard let device = self.input?.device else { return }
      do {
        try device.lockForConfiguration()
        device.setExposureTargetBias(min(device.maxExposureTargetBias, max(device.minExposureTargetBias, Float(value))))
        device.unlockForConfiguration()
      } catch { self.report(error) }
    }
  }

  func setAperture(_ value: Double) {
    guard !busy else { return }
    aperture = value
    queue.async {
      if #available(iOS 26.0, *), let input = self.input, input.isCinematicVideoCaptureEnabled {
        input.simulatedAperture = min(input.device.activeFormat.maxSimulatedAperture, max(input.device.activeFormat.minSimulatedAperture, Float(value)))
      }
    }
  }

  func setZoom(_ displayValue: Double) {
    queue.async {
      guard let device = self.input?.device else { return }
      do {
        try device.lockForConfiguration()
        let multiplier: CGFloat
        if #available(iOS 18.0, *) { multiplier = device.displayVideoZoomFactorMultiplier } else { multiplier = 1 }
        let value = min(device.maxAvailableVideoZoomFactor, max(device.minAvailableVideoZoomFactor, displayValue / multiplier))
        device.videoZoomFactor = value
        device.unlockForConfiguration()
        DispatchQueue.main.async { self.zoom = value * multiplier }
      } catch { self.report(error) }
    }
  }

  func focus(at point: CGPoint, locked: Bool) {
    queue.async {
      guard let device = self.input?.device else { return }
      do {
        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }
        if #available(iOS 26.0, *), self.captureSettings.cinematic {
          if locked { device.setCinematicVideoFixedFocus(at: point, focusMode: .strong) }
          else { device.setCinematicVideoTrackingFocus(at: point, focusMode: .weak) }
        } else {
          if device.isFocusPointOfInterestSupported { device.focusPointOfInterest = point }
          let focus: AVCaptureDevice.FocusMode = locked ? .autoFocus : .continuousAutoFocus
          if device.isFocusModeSupported(focus) { device.focusMode = focus }
          if device.isExposurePointOfInterestSupported { device.exposurePointOfInterest = point }
          let exposure: AVCaptureDevice.ExposureMode = locked ? .autoExpose : .continuousAutoExposure
          if device.isExposureModeSupported(exposure) { device.exposureMode = exposure }
        }
        DispatchQueue.main.async { self.focusLocked = locked }
      } catch { self.report(error) }
    }
  }

  func resetFocus() { focus(at: CGPoint(x: 0.5, y: 0.5), locked: false) }

  func record(rotation: CGFloat) {
    guard ready, !busy, !configuring else { return }
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
        DispatchQueue.main.async { self.startedAt = Date(); self.phase = "recording" }
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
      for path in paths { _ = try await RecordingLibrary.save(path: path) }
      phase = "saved"
      message = "Video added to Photos."
    } catch {
      phase = "pending"
      message = error.localizedDescription
    }
    refreshPending()
    endBackgroundTask()
    completeClose()
    if UIApplication.shared.applicationState == .active && !ready { resume() }
  }

  func requestClose() {
    if busy {
      closeAfterSave = true
      stopRecording()
    } else { onClose?() }
  }

  private func completeClose() {
    if closeAfterSave { closeAfterSave = false; onClose?() }
  }

  private func refreshPending() {
    queue.async {
      let files = (try? FileManager.default.contentsOfDirectory(at: RecordingLibrary.directory(), includingPropertiesForKeys: [.fileSizeKey])) ?? []
      let paths = files.filter { $0.pathExtension == "mov" && ((try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) > 0 }.map(\.path)
      DispatchQueue.main.async { self.pending = paths }
    }
  }

  private func suspend() {
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
    guard authorized else { return }
    queue.async { self.backgrounded = false }
    if !busy { configure(settings) }
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
