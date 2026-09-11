# Native camera and device controls

Implementation reviewed September 10, 2026, against the installed Expo UI 57.0.17, VisionCamera 5.2.3 and Xcode 26.6 SDK. Package versions remain unchanged. The owner handles visual and physical capture acceptance.

## Device details

The device page uses a SwiftUI Form/Section on iOS and Material Card/ListItem groups on Android. A platform device icon, title and short explanation identify the selected camera. Connect is a full-width SwiftUI bordered-prominent Button or Material filled Button, with native disabled state and Android ripple.

The native name field saves on focus loss or keyboard Done. Duplicate events coalesce, writes serialize, and a native progress indicator/check reflects durable storage completion. Invalid or failed names stay editable and retryable. The field keeps its identity across saved-name updates. Device details, pairing and connection measurements share the camera Settings stack page. Signal metrics run only while that page is focused.

## Camera presentation

- Photo/Video selectors remain actual SwiftUI segmented Pickers or Material segmented buttons. Native-recognized horizontal swipes select adjacent supported modes. iOS exposes Cinematic only when the current device supports the public capture API.
- Android uses a circular outlined shutter with a white photo/red video center and smaller stop icon. Native filled-tonal rounded-square gallery and flip actions flank it. iOS retains its SwiftUI camera shutter and native icon controls. The QR action moves to the top toolbar.
- Android's gallery action resolves the standard `ACTION_MAIN` + `CATEGORY_APP_GALLERY` intent. On the connected Pixel, Android resolved it to Google Photos without opening the app. iOS uses PhotosPicker followed by Quick Look for the selected image/movie; selection grants access without broad photo-library read permission. Review copies stay temporary and are removed after dismissal.
- iOS camera settings are a NavigationStack destination with a native Back button and Form. Android uses an actual Material ModalBottomSheet with grouped settings content. Remote settings identify the capturing phone and reuse the same control descriptors. A settings screen does not create another capture owner.

## Exposure and photo timer

Tap the local viewfinder to meter the scene and drag exposure. On the monitor, a tap sends the same focus point to the camera and can drag exposure; the mapping is unvalidated on hardware. Exposure is also available in camera settings. Continuous autofocus, auto exposure and auto white balance remain the baseline.

iOS calls AVFoundation `setExposureTargetBias` on the camera queue and publishes the applied value. The installed VisionCamera Android implementation reads/writes CameraX **compensation indices**, despite naming them exposure bias. Relais reads `CONTROL_AE_COMPENSATION_STEP` from Camera2 metadata without opening a camera, converts indices to EV for the shared protocol, and rounds EV back to a supported index when applying. The displayed value comes from the applied native index. Unsupported exposure ranges stay hidden.

Photo timer values are Off, 3 seconds and 10 seconds. The capturing phone owns the countdown for local and remote shutter commands. Its published countdown makes the shutter a Cancel action. Backgrounding, camera interruption and leaving Camera invalidate delayed capture. Android optionally keeps its native torch on during the countdown (Timer light), then turns it off before invoking the photo output. This is a steady light, not a recreation of Pixel's proprietary timer animation. iOS provides the timer in the top toolbar and Photo settings; Android exposes it in Photo settings. Flash Auto/Off/On is shown only for a flash-capable photo camera.

Revisioned settings messages add bounded exposure, timer, flash and optional timer-light values. Older peers can omit the controls catalog. Timer cancellation can interrupt an outstanding photo command without superseding unrelated settings requests. Original-file finalization and PhotoKit/MediaStore import retain their existing paths.

## Public API limits

Pixel Camera's shadows and manual white-balance UI do not map to the installed CameraX/VisionCamera owner. Its Android controller does not implement the iOS-only manual white-balance methods. Relais keeps these adjustments automatic, rather than presenting inactive sliders or introducing a competing camera pipeline. This is an implementation boundary, not a claim that no Android Camera2 API can ever control white balance.

The complete Apple/Pixel camera interface is not a distributable component. Relais uses public native UI and capture APIs; it does not claim every vendor camera feature, identical computational photography, or measured 120 Hz rendering.

## Primary references

- [Apple exposure compensation](<https://developer.apple.com/documentation/avfoundation/avcapturedevice/setexposuretargetbias(_:completionhandler:)>)
- [CameraX controls, metering and exposure compensation](https://developer.android.com/media/camera/camerax/configuration)
- [Camera2 capture characteristics](https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics#CONTROL_AE_COMPENSATION_STEP)
- [Material bottom sheets](https://developer.android.com/develop/ui/compose/components/bottom-sheets)
- [Material 3 component APIs](https://developer.android.com/reference/kotlin/androidx/compose/material3/package-summary)
- [Apple PhotosPicker](https://developer.apple.com/documentation/photosui/photospicker)
- [Android gallery category](https://developer.android.com/reference/android/content/Intent#CATEGORY_APP_GALLERY)
