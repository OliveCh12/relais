import ExpoModulesCore
import Foundation

public final class RelaisCameraEngineModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RelaisCameraEngine")
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

private final class CameraEngineStubException: Exception {
  override var reason: String { "Pipeline caméra natif non implémenté. Aucun fichier créé." }
}

private final class CameraFixtureException: Exception {
  override var reason: String { "Fixture de capacités absente ou invalide." }
}
