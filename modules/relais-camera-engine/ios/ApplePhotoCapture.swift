import AVFoundation

final class ApplePhotoCapture: NSObject, AVCapturePhotoCaptureDelegate {
  private var data: Data?
  private var failure: Error?
  private let completion: (Data?, Error?) -> Void
  init(completion: @escaping (Data?, Error?) -> Void) { self.completion = completion }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    data = photo.fileDataRepresentation()
    failure = error
  }
  func photoOutput(_ output: AVCapturePhotoOutput, didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings, error: Error?) {
    completion(data, error ?? failure)
  }
}

extension AppleCaptureCatalog {
  static func photoProfile(for device: AVCaptureDevice) -> AppleCaptureProfile? {
    let formats = device.formats.filter { format in
      !format.supportedMaxPhotoDimensions.isEmpty &&
      format.supportedColorSpaces.contains(.sRGB) &&
      format.videoSupportedFrameRateRanges.contains { $0.minFrameRate <= 30 && $0.maxFrameRate >= 30 }
    }
    guard let format = formats.max(by: { lhs, rhs in
      photoPixels(lhs) < photoPixels(rhs)
    }) else { return nil }
    return AppleCaptureProfile(format: format,
      height: CMVideoFormatDescriptionGetDimensions(format.formatDescription).height, fps: 30, hdr: false)
  }
  private static func photoPixels(_ format: AVCaptureDevice.Format) -> Int64 {
    format.supportedMaxPhotoDimensions.map { Int64($0.width) * Int64($0.height) }.max() ?? 0
  }
}
