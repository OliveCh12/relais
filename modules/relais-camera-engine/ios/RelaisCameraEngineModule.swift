import ExpoModulesCore
import Foundation

public final class RelaisCameraEngineModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RelaisCameraEngine")
    View(AppleCameraView.self) {
      Events("onClose", "onConnect", "onMonitor", "onCameraState")
      Prop("connectionLabel") { (view: AppleCameraView, label: String) in view.model.connectionLabel = label }
      Prop("keepSessionAlive") { (view: AppleCameraView, value: Bool) in view.keepSessionAlive = value }
    }
    AsyncFunction("captureAction") { (action: String, promise: Promise) in
      guard let view = AppleCameraView.current else {
        promise.reject(CaptureFailure("Open Camera on the other phone first.")); return
      }
      view.model.perform(action) { result in
        switch result {
        case .success(let state): promise.resolve(state)
        case .failure(let error): promise.reject(error)
        }
      }
    }.runOnQueue(.main)
    AsyncFunction("getCaptureState") { () -> [String: Any] in
      AppleCameraView.current?.model.captureState ?? ["ready": false]
    }.runOnQueue(.main)
    #if DEBUG
    AsyncFunction("cameraDebug") { (action: String) throws -> [String: Any] in
      guard let view = AppleCameraView.current else { return ["mounted": false] }
      return try view.debug(action)
    }.runOnQueue(.main)
    #endif
    AsyncFunction("getPendingRecordings") { () -> [String] in
      let files = try FileManager.default.contentsOfDirectory(at: RecordingLibrary.directory(), includingPropertiesForKeys: [.fileSizeKey])
      return files.filter { ["mov", "mp4", "jpg", "heic"].contains($0.pathExtension) && ((try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) > 0 }.map(\.path).sorted()
    }
    AsyncFunction("createRecordingPath") { () -> String in
      try RecordingLibrary.createPath()
    }
    AsyncFunction("saveVideoToLibrary") { (path: String) async throws -> String in
      try await RecordingLibrary.save(path: path)
    }
    Events("thermal", "battery", "droppedFrames", "recordingStarted", "error")

    AsyncFunction("getCapabilities") { () throws -> [String: Any] in
      guard let bundleURL = Bundle(for: RelaisCameraEngineModule.self)
        .url(forResource: "RelaisCameraEngineResources", withExtension: "bundle"),
        let bundle = Bundle(url: bundleURL),
        let url = bundle.url(forResource: "capabilities", withExtension: "json"),
        let result = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any]
      else { throw CameraFixtureException() }
      return result
    }
    AsyncFunction("configure") { (_: [String: Any]) throws -> Void in
      throw CameraEngineStubException()
    }
    AsyncFunction("startPreview") { () throws -> Void in throw CameraEngineStubException() }
    AsyncFunction("stopPreview") { () throws -> Void in throw CameraEngineStubException() }
    AsyncFunction("startRecording") { () throws -> Void in throw CameraEngineStubException() }
    AsyncFunction("stopRecording") { () throws -> String in throw CameraEngineStubException() }
  }
}

private final class CameraEngineStubException: Exception, @unchecked Sendable {
  override var reason: String { "Native camera pipeline not implemented. No file created." }
}

private final class CameraFixtureException: Exception, @unchecked Sendable {
  override var reason: String { "Capability fixture missing or invalid." }
}
