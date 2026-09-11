package expo.modules.relaiscameraengine

import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.net.Uri
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class RelaisCameraEngineModule : Module() {
  private var galleryOpen = false

  override fun definition() = ModuleDefinition {
    Name("RelaisCameraEngine")
    lateinit var galleryLauncher: AppContextActivityResultLauncher<GalleryPickerRequest, Uri?>
    RegisterActivityContracts {
      galleryLauncher = registerForActivityResult(GalleryPickerContract())
    }
    AsyncFunction("openGallery") Coroutine { ->
      withContext(Dispatchers.Main) {
        if (galleryOpen) return@withContext
        if (appContext.currentActivity == null) throw GalleryException("Open Relais before viewing your captures.")
        galleryOpen = true
        try {
          val uri = galleryLauncher.launch(GalleryPickerRequest()) ?: return@withContext
          val activity = appContext.currentActivity ?: return@withContext
          viewGallerySelection(activity, uri)
        } finally {
          galleryOpen = false
        }
      }
    }

    AsyncFunction("getExposureStep") { deviceId: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Camera is unavailable.")
      val manager = context.getSystemService(CameraManager::class.java)
      manager.getCameraCharacteristics(deviceId)
        .get(CameraCharacteristics.CONTROL_AE_COMPENSATION_STEP)?.toDouble() ?: 0.0
    }
    Function("getPreviewRotation") { RelaisPreviewFrames.rotation }
    Function("initializePreviewOutput") {
      System.loadLibrary("VisionCamera")
      System.loadLibrary("RelaisPreview")
    }
    AsyncFunction("createPreviewTrack") {
      com.oney.WebRTCModule.RelaisTrackBridge.create(appContext.reactContext as? com.facebook.react.bridge.ReactContext ?: throw CameraFixtureException())
    }
    AsyncFunction("createPhotoPath") {
      RecordingLibrary.createPhotoPath(appContext.reactContext ?: throw CameraFixtureException())
    }
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
