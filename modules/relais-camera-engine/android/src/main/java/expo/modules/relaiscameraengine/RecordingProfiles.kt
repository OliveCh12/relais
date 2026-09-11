package expo.modules.relaiscameraengine

import android.content.Context
import android.util.Range
import androidx.camera.camera2.interop.cameraId
import androidx.camera.core.DynamicRange
import androidx.camera.core.Preview
import androidx.camera.core.SessionConfig
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.VideoCapture
import java.util.concurrent.TimeUnit

object RecordingProfiles {
  fun query(context: Context, deviceId: String, stabilize: Boolean): List<Map<String, Any>> {
    val provider = ProcessCameraProvider.getInstance(context).get(10, TimeUnit.SECONDS)
    val info = provider.availableCameraInfos.firstOrNull { it.cameraId == deviceId } ?: return emptyList()
    val capabilities = Recorder.getVideoCapabilities(info)
    val results = mutableListOf<Map<String, Any>>()
    for (dynamicRange in listOf(DynamicRange.SDR, DynamicRange.HLG_10_BIT)) {
      if (!capabilities.supportedDynamicRanges.contains(dynamicRange)) continue
      for (quality in capabilities.getSupportedQualities(dynamicRange)) {
        val height = when (quality) {
          Quality.UHD -> 2160
          Quality.FHD -> 1080
          Quality.HD -> 720
          Quality.SD -> 480
          else -> continue
        }
        val recorder = Recorder.Builder().setQualitySelector(QualitySelector.from(quality)).build()
        val video = VideoCapture.Builder(recorder).setDynamicRange(dynamicRange)
          .setVideoStabilizationEnabled(stabilize && capabilities.isStabilizationSupported).build()
        val preview = Preview.Builder().setDynamicRange(dynamicRange).build()
        val useCases = listOf(video, preview, RelaisPreviewOutput.createAnalysis())
        val base = SessionConfig.Builder(useCases).build()
        if (!info.isSessionConfigSupported(base)) continue
        val ranges = info.getSupportedFrameRateRanges(base)
        for (fps in listOf(24, 25, 30, 50, 60, 100, 120, 240)) {
          if (ranges.none { it.contains(fps) }) continue
          val exact = SessionConfig.Builder(useCases).setFrameRateRange(Range(fps, fps)).build()
          if (info.isSessionConfigSupported(exact)) {
            results.add(mapOf("height" to height, "fps" to fps, "hdr" to (dynamicRange != DynamicRange.SDR)))
          }
        }
      }
    }
    return results
  }
}
