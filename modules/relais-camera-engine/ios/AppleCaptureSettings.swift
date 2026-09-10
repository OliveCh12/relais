import AVFoundation

struct AppleCaptureSettings: Equatable {
  var front = false
  var cinematic = false
  var height: Int32 = 2160
  var fps = 30
  var hdr = true
  var stabilization = true
  var audio = true
}

struct AppleCaptureProfile: Identifiable {
  let format: AVCaptureDevice.Format
  let height: Int32
  let fps: Int
  let hdr: Bool
  var id: String { "\(height)-\(fps)-\(hdr)" }
}

enum AppleCaptureCatalog {
  static func devices(front: Bool) -> [AVCaptureDevice] {
    AVCaptureDevice.DiscoverySession(
      deviceTypes: [.builtInTripleCamera, .builtInDualWideCamera, .builtInDualCamera,
                    .builtInWideAngleCamera, .builtInUltraWideCamera, .builtInTelephotoCamera,
                    .builtInTrueDepthCamera],
      mediaType: .video, position: front ? .front : .back
    ).devices
  }

  static func profiles(for device: AVCaptureDevice, cinematic: Bool) -> [AppleCaptureProfile] {
    var seen = Set<String>()
    var result: [AppleCaptureProfile] = []
    for format in device.formats {
      let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
      guard dimensions.width > 0, dimensions.height > 0,
        abs(Double(dimensions.width) / Double(dimensions.height) - 16.0 / 9.0) < 0.02
      else { continue }
      var ranges = format.videoSupportedFrameRateRanges
      if cinematic {
        guard #available(iOS 26.0, *), format.isCinematicVideoCaptureSupported,
          let range = format.videoFrameRateRangeForCinematicVideo else { continue }
        ranges = [range]
      }
      for fps in [24, 25, 30, 50, 60, 100, 120, 240] where ranges.contains(where: {
        $0.minFrameRate <= Double(fps) && $0.maxFrameRate >= Double(fps)
      }) {
        for hdr in [false, true] where format.supportedColorSpaces.contains(hdr ? .HLG_BT2020 : .sRGB) {
          let profile = AppleCaptureProfile(format: format, height: dimensions.height, fps: fps, hdr: hdr)
          if seen.insert(profile.id).inserted { result.append(profile) }
        }
      }
    }
    return result
  }

  static func select(_ settings: AppleCaptureSettings, from profiles: [AppleCaptureProfile]) -> AppleCaptureProfile? {
    profiles.min { score($0, settings) < score($1, settings) }
  }

  private static func score(_ profile: AppleCaptureProfile, _ settings: AppleCaptureSettings) -> Double {
    let size = abs(log(Double(profile.height) / Double(settings.height)))
    let rate = abs(Double(profile.fps - settings.fps))
    return size * 1000 + rate * 10 + (profile.hdr == settings.hdr ? 0 : 1)
  }

  static func label(_ height: Int32) -> String {
    switch height {
    case 4320: return "8K"
    case 2160: return "4K"
    case 1080: return "HD 1080"
    case 720: return "HD 720"
    default: return "\(height)p"
    }
  }
}
