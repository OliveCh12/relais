import AVFoundation
import ExpoModulesCore
import Photos
import ImageIO

enum RecordingLibrary {
  static func directory() throws -> URL {
    let documents = try FileManager.default.url(
      for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let directory = documents.appendingPathComponent("Recordings", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory
  }

  static func createPath() throws -> String {
    try directory().appendingPathComponent("Relais-\(UUID().uuidString).mov").path
  }

  static func save(path: String) async throws -> String {
    let url = URL(fileURLWithPath: path).resolvingSymlinksInPath()
    guard url.deletingLastPathComponent() == (try directory()).resolvingSymlinksInPath(),
      ["mov", "mp4", "heic", "jpg"].contains(url.pathExtension), FileManager.default.fileExists(atPath: url.path)
    else { throw RecordingLibraryException("Capture file not found.") }
    let photo = ["heic", "jpg"].contains(url.pathExtension)
    if photo {
      guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), CGImageSourceGetCount(source) > 0 else {
        throw RecordingLibraryException("The photo could not be saved. The file is still in Relais.")
      }
    } else {
    let asset = AVURLAsset(url: url)
    let duration = try await asset.load(.duration)
    let tracks = try await asset.loadTracks(withMediaType: .video)
    guard duration.seconds.isFinite, duration.seconds > 0, !tracks.isEmpty else {
      throw RecordingLibraryException("The video could not be finalized. The file has been retained.")
    }
    }
    let permission = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
    guard permission == .authorized || permission == .limited else {
      throw RecordingLibraryException("Allow adding to Photos in Settings, then try again. Your capture is still in Relais.")
    }
    var identifier: String?
    try await PHPhotoLibrary.shared().performChanges {
      identifier = (photo ? PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: url) : PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url))?
        .placeholderForCreatedAsset?.localIdentifier
    }
    guard let identifier else {
      throw RecordingLibraryException("Photos did not confirm the import. Your capture is still in Relais.")
    }
    try? FileManager.default.removeItem(at: url)
    return identifier
  }
}

final class RecordingLibraryException: GenericException<String> {
  override var reason: String { param }
}
