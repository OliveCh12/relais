package com.oney.WebRTCModule

import android.content.Context
import com.facebook.react.bridge.ReactContext
import expo.modules.relaiscameraengine.RelaisPreviewFrames
import org.webrtc.CapturerObserver
import org.webrtc.SurfaceTextureHelper
import org.webrtc.VideoCapturer
import java.util.concurrent.Callable

object RelaisTrackBridge {
  fun create(context: ReactContext): Map<String, Any> = ThreadUtils.submitToExecutor(Callable {
    val module = context.getNativeModule(WebRTCModule::class.java) ?: error("Live preview is unavailable. Reopen Relais.")
    val track = module.createVideoTrack(PreviewController()) ?: error("Live preview could not start.")
    mapOf("id" to track.id(), "kind" to "video", "remote" to false, "enabled" to true,
      "readyState" to "live", "peerConnectionId" to -1, "constraints" to emptyMap<String, Any>(),
      "settings" to mapOf("width" to 1280, "height" to 720, "frameRate" to 30))
  }).get()
}

private class PreviewController : AbstractVideoCaptureController(1280, 720, 30) {
  override fun getDeviceId(): String = "relais-native-camera"
  override fun createVideoCapturer(): VideoCapturer = object : VideoCapturer {
    private var observer: CapturerObserver? = null
    override fun initialize(helper: SurfaceTextureHelper?, context: Context?, target: CapturerObserver?) { observer = target }
    override fun startCapture(width: Int, height: Int, fps: Int) {
      observer?.onCapturerStarted(true)
      RelaisPreviewFrames.attach(observer)
    }
    override fun stopCapture() {
      RelaisPreviewFrames.detach(observer)
      observer?.onCapturerStopped()
    }
    override fun changeCaptureFormat(width: Int, height: Int, fps: Int) {}
    override fun dispose() { stopCapture(); observer = null }
    override fun isScreencast(): Boolean = false
  }
}
