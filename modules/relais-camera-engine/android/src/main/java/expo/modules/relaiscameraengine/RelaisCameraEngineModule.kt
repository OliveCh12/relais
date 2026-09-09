package expo.modules.relaiscameraengine

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class RelaisCameraEngineModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RelaisCameraEngine")
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

class CameraEngineStubException : CodedException("Pipeline caméra natif non implémenté. Aucun fichier créé.")
class CameraFixtureException : CodedException("Fixture de capacités absente ou invalide.")
