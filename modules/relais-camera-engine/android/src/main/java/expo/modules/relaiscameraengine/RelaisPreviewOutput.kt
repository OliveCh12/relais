package expo.modules.relaiscameraengine

import android.util.Size as AndroidSize
import androidx.annotation.Keep
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.HybridCameraOutputSpec
import com.margelo.nitro.camera.MediaType
import com.margelo.nitro.camera.MirrorMode
import com.margelo.nitro.camera.Size
import com.margelo.nitro.camera.extensions.surfaceRotation
import com.margelo.nitro.camera.public.NativeCameraOutput
import org.webrtc.CapturerObserver
import org.webrtc.JavaI420Buffer
import org.webrtc.VideoFrame
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

@Keep
class RelaisPreviewOutput : HybridCameraOutputSpec(), NativeCameraOutput {
  private var analysis: ImageAnalysis? = null
  private val executor = ThreadPoolExecutor(0, 1, 10, TimeUnit.SECONDS, LinkedBlockingQueue()) { task -> Thread(task, "RelaisPreview") }
  override val mediaType = MediaType.VIDEO
  override val mirrorMode = MirrorMode.OFF
  override var outputOrientation = CameraOrientation.UP
    set(value) { field = value; analysis?.targetRotation = value.surfaceRotation }
  override val currentResolution: Size?
    get() = analysis?.resolutionInfo?.resolution?.let { Size(it.width.toDouble(), it.height.toDouble()) }

  override fun createUseCase(mirrorMode: MirrorMode, config: NativeCameraOutput.Config): NativeCameraOutput.PreparedUseCase {
    // Photo has no cadence constraint; Video always uses a validated frame-rate profile.
    val output = createAnalysis(photo = config.fpsRange == null).apply {
      targetRotation = outputOrientation.surfaceRotation
      setAnalyzer(executor) { image ->
        try { RelaisPreviewFrames.deliver(image) } finally { image.close() }
      }
    }
    return NativeCameraOutput.PreparedUseCase(output) {
      analysis?.clearAnalyzer()
      analysis = output
    }
  }
  override fun dispose() {
    analysis?.clearAnalyzer()
    executor.shutdown()
    super.dispose()
  }
  companion object {
    fun createAnalysis(photo: Boolean = false): ImageAnalysis = ImageAnalysis.Builder()
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
      .setResolutionSelector(ResolutionSelector.Builder()
        .setAspectRatioStrategy(if (photo) AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY else AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
        .setResolutionStrategy(ResolutionStrategy(AndroidSize(if (photo) 960 else 1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
        .build())
      .build()
  }
}

object RelaisPreviewFrames {
  private var observer: CapturerObserver? = null
  private var lastFrame = 0L
  @Synchronized fun attach(target: CapturerObserver?) { observer = target; lastFrame = 0 }
  @Synchronized fun detach(target: CapturerObserver?) { if (observer === target) observer = null }
  @Synchronized fun deliver(image: ImageProxy) {
    val target = observer ?: return
    val time = image.imageInfo.timestamp
    if (time - lastFrame < 33_333_333L) return
    lastFrame = time
    val buffer = JavaI420Buffer.allocate(image.width, image.height)
    try {
      for (index in 0..2) {
        val plane = image.planes[index]
        val width = if (index == 0) image.width else (image.width + 1) / 2
        val height = if (index == 0) image.height else (image.height + 1) / 2
        val destination = when (index) { 0 -> buffer.dataY; 1 -> buffer.dataU; else -> buffer.dataV }
        val stride = when (index) { 0 -> buffer.strideY; 1 -> buffer.strideU; else -> buffer.strideV }
        val source = plane.buffer.duplicate()
        val offset = source.position()
        for (row in 0 until height) {
          if (plane.pixelStride == 1) {
            source.position(offset + row * plane.rowStride)
            val data = source.slice().apply { limit(width) }
            destination.position(row * stride)
            destination.put(data)
          } else {
            for (column in 0 until width) destination.put(row * stride + column,
              source.get(offset + row * plane.rowStride + column * plane.pixelStride))
          }
        }
        destination.rewind()
      }
      val frame = VideoFrame(buffer, image.imageInfo.rotationDegrees, time)
      target.onFrameCaptured(frame)
    } finally { buffer.release() }
  }
}
