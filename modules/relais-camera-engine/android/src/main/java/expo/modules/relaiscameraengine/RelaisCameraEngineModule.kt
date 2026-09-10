package expo.modules.relaiscameraengine

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class RelaisCameraEngineModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RelaisCameraEngine")
    AsyncFunction("getRecordingProfiles") { deviceId: String, stabilization: Boolean ->
      RecordingProfiles.query(appContext.reactContext ?: throw CameraFixtureException(), deviceId, stabilization)
    }
    AsyncFunction("getPendingRecordings") {
      RecordingLibrary.pending(appContext.reactContext ?: throw CameraFixtureException())
    }
    AsyncFunction("createRecordingPath") {
      RecordingLibrary.createPath(appContext.reactContext ?: throw CameraFixtureException())
    }
    AsyncFunction("saveVideoToLibrary") { path: String ->
      RecordingLibrary.save(appContext.reactContext ?: throw CameraFixtureException(), path)
    }
    Events("thermal", "battery", "droppedFrames", "recordingStarted", "error")

    AsyncFunction("getCapabilities") {
      val context = appContext.reactContext ?: throw CameraFixtureException()
      val text = context.assets.open("capabilities.json").bufferedReader().use { it.readText() }
      jsonMap(JSONObject(text))
    }
    AsyncFunction("configure") { _: Map<String, Any?> -> unavailable() }
    AsyncFunction("startPreview") { unavailable() }
    AsyncFunction("stopPreview") { unavailable() }
    AsyncFunction("startRecording") { unavailable() }
    AsyncFunction("stopRecording") { unavailableFile() }
  }

  private fun unavailable(): Unit = throw CameraEngineStubException()
  private fun unavailableFile(): String = throw CameraEngineStubException()

  private fun jsonMap(value: JSONObject): Map<String, Any?> =
    value.keys().asSequence().associateWith { jsonValue(value.get(it)) }

  private fun jsonValue(value: Any?): Any? = when (value) {
    JSONObject.NULL -> null
    is JSONObject -> jsonMap(value)
    is JSONArray -> (0 until value.length()).map { jsonValue(value.get(it)) }
    else -> value
  }
}

class CameraEngineStubException : CodedException("Native camera pipeline not implemented. No file created.")
class CameraFixtureException : CodedException("Capability fixture missing or invalid.")
