# Native camera capabilities — September 10, 2026

## Decision

The former 1080p30 limit came from the local code (`RECORDING_RESOLUTION` and a fixed constraint), not the iPhone. The network demonstration has separate constraints and does not determine original-file quality.

iOS now uses an AVFoundation session owned directly by `RelaisCameraEngine`, with SwiftUI controls. This replaces VisionCamera ownership on that platform without adding concurrent capture. Android retains VisionCamera v5 over CameraX and Compose controls. Pixel processing, depth effects and autofocus are not rewritten in JavaScript.

The initial preference is 4K30 HDR, falling back to an actually supported profile. The catalog is not arbitrarily capped at 1080p. High frame rates are recording rates; playback is not automatically an edited slow-motion video.

## Public APIs and implementation

| Feature                                                                          | iOS                                                   | Android                                                             | Relais status                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Continuous autofocus, automatic exposure and white balance                       | AVFoundation                                          | CameraX                                                             | Native; tap to focus and exposure adjustment                                   |
| Resolution and frame rate                                                        | Per-camera formats and ranges                         | Preview + VideoCapture capabilities                                 | Hardware-based choices; effective configuration displayed                      |
| HDR video                                                                        | HLG BT.2020 format + HEVC                             | Compatible 10-bit HLG                                               | Connected; no Dolby Vision certification claimed                               |
| Stabilization                                                                    | AVFoundation connection                               | CameraX VideoCapture                                                | Native, subject to camera and profile support                                  |
| Zoom and lens switching                                                          | Virtual camera and native transition factors          | CameraX controller                                                  | Native gestures and shortcuts; factors do not all imply optical zoom           |
| Cinematic depth and focus transitions                                            | Public capture APIs since iOS 26                      | No universal video equivalent in CameraX extensions                 | Native iOS integration, simulated aperture and tap tracking                    |
| ProRes, ProRes RAW, Log and external storage                                     | Specific APIs and constraints                         | Hardware/vendor dependent                                           | Not exposed or validated yet                                                   |
| Action mode, photographic styles, Night photos, Video Boost and vendor-app modes | Not all have equivalent public APIs                   | HDR/night/bokeh extensions are limited to preview and still capture | No misleading controls or homemade substitute effects                          |
| Original video and mirror simultaneously                                         | Reduced native preview output into WebRTC VideoSource | Same                                                                | Implemented; original file stays on the capture phone. Two-phone proof pending |

Apple advertises up to 4K Dolby Vision at 120 fps on the iPhone 17 Pro's main Fusion camera, and Cinematic up to 4K30. Those are capabilities of Apple's camera experience. Relais queries device formats rather than treating the specification as a third-party compatibility matrix. Quality also depends on sensor, temperature, codec and storage.

## Interface and lifecycle

The supplied Apple Camera references mostly show still photography. Relais follows their viewfinder organization, circular controls, lens shortcuts and settings access without adding unsupported photo modes. iPhone controls use SwiftUI, SF Symbols, Menu, Form, Slider and a system sheet. `AVCaptureVideoPreviewLayer` displays the viewfinder; Apple's RotationCoordinator supplies orientation. Android uses Compose controls, profile selectors and CameraX gestures.

The camera screen stays awake while visible. Session configuration and startup run on a dedicated queue; frames never pass through React. Backgrounding finalizes recording, and the private file is retained if adding it to Photos fails.

## Primary sources

- [iPhone 17 Pro specifications](https://www.apple.com/iphone-17-pro/specs/): advertised device capabilities.
- [Capture Cinematic video in your app — WWDC25](https://developer.apple.com/videos/play/wwdc2025/319/): capture, simulated aperture, focus tracking, metadata and insufficient light.
- [Apple Cinematic capture sample](https://developer.apple.com/documentation/avfoundation/capturing-cinematic-video): iOS 26 and a physical device required.
- [CameraX video capture](https://developer.android.com/media/camera/camerax/video-capture): quality and Recorder configuration.
- [Android HDR video](https://developer.android.com/media/camera/camera2/hdr-video-capture): HDR and 10-bit HLG.
- [Android camera extensions](https://developer.android.com/media/camera/camera-extensions): vendor extensions limited to still capture and preview.

Exact signatures were also checked against the installed Xcode 26.5 SDK and local VisionCamera 5.2.3 / CameraX 1.7.0-alpha03 sources. Expo, React Native and VisionCamera were not upgraded for this change.
