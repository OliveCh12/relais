package expo.modules.relaiscameraengine

import android.content.ContentValues
import android.content.Context
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import java.io.File
import java.util.UUID

object RecordingLibrary {
  private fun directory(context: Context) = File(context.filesDir, "Recordings").apply { mkdirs() }

  fun createPath(context: Context): String =
    File(directory(context), "Relais-${UUID.randomUUID()}.mp4").absolutePath

  fun createPhotoPath(context: Context): String =
    File(directory(context), "Relais-${UUID.randomUUID()}.jpg").absolutePath

  fun pending(context: Context): List<String> = directory(context).listFiles()
    ?.filter { it.isFile && it.extension in listOf("mp4", "jpg") && it.length() > 0 }
    ?.map { it.absolutePath }?.sorted() ?: emptyList()

  fun save(context: Context, path: String): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      throw RecordingLibraryException("Adding to the gallery requires Android 10 or later. The file is still in Relais.")
    }
    val file = File(path).canonicalFile
    if (file.parentFile != directory(context).canonicalFile || file.extension !in listOf("mp4", "jpg") || !file.isFile) {
      throw RecordingLibraryException("Capture file not found.")
    }
    val photo = file.extension == "jpg"
    if (photo) {
      val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.path, options)
      if (options.outWidth <= 0 || options.outHeight <= 0) throw RecordingLibraryException("The photo could not be saved. The file is still in Relais.")
    } else MediaMetadataRetriever().use { metadata ->
      metadata.setDataSource(file.path)
      val duration = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0
      if (duration <= 0 || metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) != "yes") {
        throw RecordingLibraryException("The video could not be finalized. The file has been retained.")
      }
    }
    val resolver = context.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Video.Media.DISPLAY_NAME, file.name)
      put(MediaStore.Video.Media.MIME_TYPE, if (photo) "image/jpeg" else "video/mp4")
      put(MediaStore.Video.Media.RELATIVE_PATH, "${if (photo) Environment.DIRECTORY_PICTURES else Environment.DIRECTORY_MOVIES}/Relais")
      put(MediaStore.Video.Media.IS_PENDING, 1)
    }
    val uri = resolver.insert(if (photo) MediaStore.Images.Media.EXTERNAL_CONTENT_URI else MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)
      ?: throw RecordingLibraryException("The gallery could not save this capture. The file is still in Relais.")
    try {
      resolver.openOutputStream(uri)?.use { output -> file.inputStream().use { it.copyTo(output) } }
        ?: throw RecordingLibraryException("Could not write to the gallery.")
      val published = resolver.update(uri, ContentValues().apply { put(MediaStore.Video.Media.IS_PENDING, 0) }, null, null)
      if (published != 1) throw RecordingLibraryException("The gallery did not confirm the import.")
    } catch (error: Exception) {
      resolver.delete(uri, null, null)
      throw error
    }
    file.delete()
    return uri.toString()
  }
}

class RecordingLibraryException(message: String) : CodedException(message)
