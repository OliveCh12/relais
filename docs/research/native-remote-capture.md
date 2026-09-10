# Native photo and remote capture

Implementation: September 10, 2026. Validation evidence is recorded separately in [STATUS.md](../../STATUS.md).

## User journey

Camera and Monitor are product routes. Camera opens the native viewfinder and advertises availability while foregrounded. Monitor lists remembered cameras and automatically connects when exactly one is available. Multiple available cameras require a selection. A first pairing uses a QR code or pasted code in a system sheet. Camera never mounts the QR scanner.

Photo and Video use a native segmented picker. Cinematic appears on iOS only when AVFoundation reports support. The shutter takes a photo or starts/stops a video on the Camera phone, from either endpoint. The Monitor shows the Camera's current mode, effective quality, capture phase and save result. It does not infer recording from a button press or use its own camera capabilities.

Focus, exposure, white balance and supported stabilization are automatic. There are no manual focus, exposure, aperture or focus-lock controls. Zoom, camera switching, grid and compatible video quality/audio settings remain available. Home uses native navigation, restrained system text styles and platform lists. QR/code/server sheets, settings and device details remain SwiftUI or Material sheets.

## One camera owner

### iOS

One AVFoundation session has either `AVCapturePhotoOutput` or `AVCaptureMovieFileOutput`, with `AVCaptureVideoDataOutput` for the network preview. Apple permits movie-file and video-data outputs together when linked against iOS 16 or later; the app requires iOS 16.4. The code checks `canAddOutput` instead of assuming every device/format combination can stream.

Photo capture chooses the largest supported photo dimensions of the selected native format, requests quality priority and uses HEIC when supported, otherwise JPEG. Automatic flash is requested only when supported. Video retains device-derived resolution/frame-rate/HDR combinations, HEVC where supported, automatic stabilization and Apple's public Cinematic capture APIs. No custom depth effect is added.

The native preview delegate receives YUV pixel buffers on its own serial queue, discards late frames and submits a reduced, at-most-30-fps WebRTC source. Preview-sized buffers are requested on iOS 17+. The original movie/photo never comes from this source. RotationCoordinator handles current iOS; the iOS 16.4 fallback follows window orientation. WebRTC receives quarter-turn rotation metadata.

- [Apple capture-session setup](https://developer.apple.com/documentation/avfoundation/setting-up-a-capture-session)
- [Apple output compatibility](<https://developer.apple.com/documentation/avfoundation/avcapturesession/canaddoutput(_:)>)
- [Apple photo output](https://developer.apple.com/documentation/avfoundation/avcapturephotooutput)
- [Apple video data output](https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput)

### Android

VisionCamera 5 remains the sole CameraX owner. Its public native `CameraOutput` extension hosts an `ImageAnalysis` use case. It binds alongside the viewfinder and either ImageCapture or VideoCapture. Keeping photo and video outputs mutually exclusive avoids requiring four simultaneous camera use cases. Video profiles are validated with the additional analysis output before being offered.

The analyzer uses `STRATEGY_KEEP_ONLY_LATEST`, requests YUV 1280 × 720 for Video or 960 × 720 for Photo with a native resolution fallback, closes every ImageProxy and copies plane data into native I420 buffers. Pixel and row strides are respected. WebRTC receives native frames on the analysis executor; no JavaScript frame callback, base64 conversion or worklet is involved. Actual negotiated dimensions and throughput remain hardware-dependent. Detaching a preview waits for any current delivery before releasing the WebRTC source, and idle analyzer threads expire.

- [CameraX architecture and combinations](https://developer.android.com/media/camera/camerax/architecture)
- [CameraX image analysis](https://developer.android.com/media/camera/camerax/analyze)
- [Google reference camera](https://github.com/google/jetpack-camera-app)

The small JNI/Nitro adapter registers an implementation of VisionCamera's existing generated CameraOutput interface. It does not create another CameraX provider or open another sensor. The integration uses the pinned VisionCamera, Nitro and WebRTC versions; changing those dependencies requires rebuilding and checking the adapter.

## Commands, trust and lifecycle

`PeerSession` owns signaling, peer connection, presence and the DataChannel. Its stream factory receives an already-native camera output. The development spike supplies its separate getUserMedia factory, and product code never imports it.

Capture messages are accepted only after the existing device-secret handshake completes. They have bounded payloads, validated actions, a request ID and a monotonically increasing sequence. `CommandHost` deduplicates in-flight/completed requests, rejects reused IDs and rejects expired sequences even after cache eviction. Unknown/manual-focus commands are ignored.

A reply acknowledges the operation or reports its error. The native Camera state independently reports starting, recording, capturing, saving, saved or retained-file failure. Only the actual recording callback enables the REC state. A timeout reports an uncertain result and never automatically repeats a capture.

Closing or losing the peer connection releases only the preview track. It does not stop the camera's local writer. Camera foreground recovery advertises a fresh session. A reconnect republishes current Camera state before remote capture is enabled. Explicitly closing Camera waits for capture completion; closing Monitor leaves a take running on Camera.

## Files and limits

Native finalization produces a private original. PhotoKit or MediaStore confirms the gallery import before the interface says it is saved. Failed imports retain the original for retry. Photos are validated as images; movies retain their duration/video-track validation. A network interruption cannot delete an original.

The Mac rendezvous is still required. The app must be open on both phones. Pair secrets and a QR token do not turn plaintext test-LAN signaling into authenticated public-network infrastructure. The indicator measures transport RTT/loss/jitter, not Wi-Fi RSSI.

Public APIs do not expose every private Apple Camera or Pixel Camera feature. ProRes/RAW/Log, Live Photos, Android OEM photo extensions and private computational modes are not advertised as implemented. Compilation is not proof of maximum sensor quality, HDR color accuracy, gallery behavior or fluidity on physical devices. Those checks remain part of owner testing.
