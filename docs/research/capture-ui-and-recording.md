# Native camera and local recording — September 9, 2026

Historical snapshot of the first local-recording implementation. Current product truth: [native-remote-capture.md](native-remote-capture.md), [remote-media-reliability.md](remote-media-reliability.md), [STATUS.md](../../STATUS.md). Do not treat the unfinished-tee sentences below as current.

On September 10, iOS migrated from VisionCamera to direct AVFoundation for Apple's Cinematic APIs and hardware-derived profiles. See [the current camera decision](native-camera-capabilities.md).

## Interface choices

- iOS: SwiftUI buttons, SF Symbols and system `glass` styling on iOS 26, with compatible system styling on older versions. Settings use a SwiftUI sheet, Form, Section and Toggle. The viewfinder uses the available surface. [Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass), [Apple toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars).
- Android: Compose IconButton, Material Symbols, Switch and ModalBottomSheet. Secondary actions have 48 dp targets; the shutter is 88 dp. [Google icon buttons](https://developer.android.com/develop/ui/compose/components/icon-button).
- Controls move beside the image in landscape. Images are never stretched. Remote preview can fill the screen by cropping.
- The Dev Client floating menu is hidden; it is not a Relais setting.
- “WebRTC spike” remains a technical term in code/docs. User-facing copy describes live preview. Measurements and secondary options are outside the viewfinder; the QR closes when the phones connect.

## Original recording implementation

`modules/relais-camera-engine/src/LocalCamera.tsx` originally owned one VisionCamera 5.2.3 session with Preview and CameraVideoOutput on both platforms. It remains the Android owner. Native MOV/MP4 output was written to the persistent private `Recordings` directory. No frames crossed JavaScript and no network stream was recorded. Pinch zoom and tap focus used native VisionCamera gestures.

The first request was fixed at 1920 × 1080 / 30 fps. Native negotiation determined the actual format shown in the UI. This cap has since been replaced by supported-profile discovery; see the current capability document. Microphone and lens changes remain blocked while recording.

After native finalization, iOS validates duration and a video track with AVFoundation, requests Photos `.addOnly` access and creates a PHAsset. Android validates through MediaMetadataRetriever, copies into `Movies/Relais` using MediaStore and publishes after writing with `IS_PENDING`. Android 10+ needs no general library-read permission. [PHPhotoLibrary](https://developer.apple.com/documentation/photokit/phphotolibrary), [Android shared media](https://developer.android.com/training/data-storage/shared/media).

Delete the private file only after gallery confirmation. On failure, retain it; reopening Camera offers remaining files for import. Interrupted, unfinalized files are retained but may be rejected on import. Damaged-file repair is not implemented.

## Explicit limits

At the time of this snapshot, local recording and the isolated network prototype were separate journeys. The product later connected a reduced native output to WebRTC without a second camera session. Recording and transport keep independent lifecycles. See [remote-media-reliability.md](remote-media-reliability.md).

The historical remote-capability contract is a labeled stub and does not feed the local camera. Physical recording, Photos playback, rotation, audio and interruption tests remain pending. Selected file fps does not measure UI smoothness.

## Native module resolution

The isolated pnpm installation exposed another Worklets version through Nitro's optional integration: the bundle contained 0.10.1 and 0.12.2 while the binary used 0.10.1. iPhone startup failed in `Serializable.cpp` (`valueUnpacker not found`). `metro.config.cjs` now resolves Worklets, Reanimated and Nitro from root dependencies, including subpaths; workspace overrides pin animation versions. Expo's Babel preset already resolves the plugin from the project, so no extra Babel configuration was needed. The corrected bundle and cold simulator startup passed; subsequent physical confirmation is recorded in STATUS.md.
