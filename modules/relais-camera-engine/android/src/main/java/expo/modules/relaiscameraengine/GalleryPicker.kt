package expo.modules.relaiscameraengine

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.exception.CodedException
import java.io.Serializable

internal class GalleryPickerRequest : Serializable

internal class GalleryPickerContract : AppContextActivityResultContract<GalleryPickerRequest, Uri?> {
  private val picker = ActivityResultContracts.PickVisualMedia()

  override fun createIntent(context: Context, input: GalleryPickerRequest): Intent =
    picker.createIntent(context, PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))

  override fun parseResult(input: GalleryPickerRequest, resultCode: Int, intent: Intent?): Uri? =
    picker.parseResult(resultCode, intent)
}

internal fun viewGallerySelection(context: Context, uri: Uri) {
  val mime = context.contentResolver.getType(uri)
  if (uri.scheme != "content" || mime == null || !(mime.startsWith("image/") || mime.startsWith("video/"))) {
    throw GalleryException("This capture cannot be previewed. Choose another photo or video.")
  }
  val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime).apply {
    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    clipData = ClipData.newRawUri("Capture", uri)
  }
  try {
    context.startActivity(intent)
  } catch (_: ActivityNotFoundException) {
    throw GalleryException("No app can preview this capture. Install a photo or video viewer and try again.")
  }
}

internal class GalleryException(message: String) : CodedException(message)
