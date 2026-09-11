# Native iOS and Android interface

Research began September 9, 2026. The requirement is to use real Apple/Google controls and camera-app conventions. SwiftUI/Compose controls, native icons, a fixed viewfinder and shared settings logic were introduced that day. This document separates the current journey from the historical audit. Exact build/device evidence is in STATUS.md.

For new component work, consult the [native components and interaction-performance reference](research/native-components-and-performance.md), checked against official documentation and the installed packages on September 10. It distinguishes current bindings from newer SDK APIs, documents native state and sheet lifecycles, and maps each Relais interaction to the appropriate platform control. The [code audit](research/native-code-audit-2026-09-10.md) contains the ordered implementation backlog.

## Current journey — September 10

| Surface              | iPhone                                                                    | Android                                                                         |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Home                 | SwiftUI Form/Section                                                      | Material ListItem actions                                                       |
| My cameras           | Native inset-grouped list, device icon and availability                   | Material Card/ListItem groups, circular device icons and availability           |
| Device details       | Native auto-saving TextField, progress/check and prominent Connect Button | Native auto-saving OutlinedTextField, progress/check and app-bar Connect Button |
| Navigation           | Native stack pages with Back for device and pairing                       | Native stack pages with Back for device and pairing                             |
| Camera modes         | Segmented Picker: Photo, Video, supported Cinematic; swipe between modes  | Material segmented buttons: Photo/Video; swipe between modes                    |
| Camera actions       | SwiftUI shutter, native gallery and SF Symbols                            | Circular shutter, rounded-square tonal gallery/flip buttons, Material Symbols   |
| Camera settings      | NavigationStack/Form with native pickers, toggles and sliders             | Material ModalBottomSheet with grouped lists                                    |
| Brightness and timer | Native exposure slider, toolbar timer and Photo settings                  | Material exposure slider, Photo timer and optional countdown light              |
| Remote settings      | Native device page identifying the capturing device                       | Native device page identifying the capturing device                             |

Home → Camera captures local originals and shares a reduced native preview. Home → Monitor lists saved devices. Tapping a device opens its details; Connect starts the paired session. Add camera, Scan code, Enter code, Connect a monitor and connection setup are dedicated pages. The scanner unmounts before joining. The session provider retains the existing transport/camera owner across stack pages.

Connection and device pages follow the system theme; capture stays dark. Native controls animate themselves. No new UI dependency or video-frame processing in JavaScript was added. Signal statistics run only on focused device/connection detail pages.

The current [controls implementation and API limits](research/native-camera-controls.md) cover auto-saving names, native buttons, gallery access, exposure units, timers, remote control and native settings presentation. Public components take priority over recreating private camera-app widgets. Physical captures, visual acceptance, screen-reader checks and display-frame-rate measurement are owned by the user for this pass; build evidence is recorded in STATUS.md.

Device pages now combine information and presets with native expandable settings groups; there is no separate Info page. Connect stays in the app bar. Touch-hold/vertical-drag provides native focus and exposure, with plain camera buttons. [Implementation and sources](research/relay-viewfinder.md), [acceptance steps](relay-testing.md).

## Architecture and platform choices

Keep Expo/React Native for domain logic, sessions, protocol and the RelaisCameraEngine contract. Use SwiftUI on iPhone and Jetpack Compose/Material 3 on Android, through `@expo/ui` bindings where sufficient. Keep web presentation independent. Native layouts may differ; SwiftUI trees remain inside coherent Host boundaries around video surfaces. [Expo UI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/), [SwiftUI interop](https://docs.expo.dev/guides/expo-ui-swift-ui/).

Compose is Google's native toolkit, shipped with the app. It does not automatically reproduce every manufacturer's customization. iOS uses styles available on the running OS. Familiar platform behavior matters more than identical pixels. [Compose](https://developer.android.com/develop/ui/compose/documentation), [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons).

## Historical audit, before migration

The initial Home → Monitor → Settings audit used Pixel_10, Android 16/API 36, 1080 × 2424, foundation commit `3f82cd1` and Metro Dev Client. Xcode/CocoaPods were unavailable, so iOS was not observed running at that point. Screenshots preserve the original French UI as historical evidence; they are not current product copy.

| Step                                                      | Finding                                                                             | Applied direction                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [Home](research/native-ui-2026-09-09/01-home.png)         | Roles were clear, but large custom cards and shared buttons looked like a prototype | Compact native sections/actions                         |
| [Monitor](research/native-ui-2026-09-09/02-monitor.png)   | Upper spacing and scrollable viewfinder pushed Settings partly offscreen            | Fixed viewfinder with anchored controls                 |
| [Settings](research/native-ui-2026-09-09/03-settings.png) | Custom selectors/sheet; swipe did not dismiss, Android Back did                     | Native selectors/sheets, retaining constrained profiles |

Code confirmed custom Pressable actions and Modal/scrim/ScrollView sheets in the original `ui.tsx`. An accessibility Button role does not prove a Compose widget. The screenshot's Tools wheel belongs to Dev Client. A placeholder also claimed 9:16 while using 9/12 and labeled the Monitor as local; aspect and source labeling needed correction.

Preserve explicit disconnected state, no fake images, disabled unsupported recording, accessible selection and valid quality combinations. The initial audit did not validate TalkBack, VoiceOver, large text or measured contrast. [Evidence and protocol](research/native-ui-2026-09-09/README.md).

## Camera-app references and reuse limits

Apple Camera organizes capture around a central lower recording action, upper camera/format controls and zoom near the viewfinder. Relais follows that hierarchy: dominant image, one recording action, accessible zoom/lenses and secondary settings. Unsupported modes are not added just to resemble a reference. [iPhone recording guide](https://support.apple.com/guide/iphone/record-videos-iph61f49e4bb/ios).

Pixel Camera groups video resolution/frame rate in settings near the recording controls. Relais uses a thumb-accessible Material sheet. Pixel stabilization and advanced processing do not become available merely by adopting its layout. [Pixel video guide](https://support.google.com/pixelcamera/answer/7064897?hl=en).

UIImagePickerController and Android camera intents support delegated capture, but do not provide the session/buffer control needed by Relais's intended file-plus-preview pipeline. Use public native controls around our camera owner. [UIImagePickerController](https://developer.apple.com/documentation/uikit/uiimagepickercontroller), [Android camera intents](https://developer.android.com/media/camera/camera-intents).

Apple's [AVCam sample](https://developer.apple.com/documentation/avfoundation/avcam-building-a-camera-app) demonstrates SwiftUI with native capture. On September 10, direct AVFoundation replaced iOS VisionCamera ownership to expose Cinematic. No second owner was added. [Camera decision](research/native-camera-capabilities.md).

## Component and layout rules

| Surface          | iOS                                                                       | Android                                                                                             |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Ordinary actions | SwiftUI Button, system role/style, SF Symbols                             | Compose Button, FilledTonalButton, IconButton, Material Symbols                                     |
| Settings         | Form/Section, menu or segmented Picker, Toggle, Slider                    | ListItem, segmented buttons for short choices, menus/radio lists for longer choices, Switch, Slider |
| Quality sheet    | Native sheet, medium/large detents, drag indicator and dismissal          | ModalBottomSheet, drag indicator, expansion, gesture and Back dismissal                             |
| Navigation       | Existing native stack, back gestures and system presentation              | Existing native stack, system Back; predictive Back needs validation                                |
| Viewfinder       | Native video surface with SwiftUI controls                                | Native video surface with Compose controls                                                          |
| Record           | Native action with camera-specific circular content and recognizable Stop | Native action with camera-specific circular content and platform feedback                           |
| Appearance       | Semantic typography/colors, system light/dark outside capture             | Material typography/semantic and dynamic colors outside capture                                     |
| Capture          | Neutral dark surface; image and recording state readable                  | Neutral dark surface; image and recording state readable                                            |

Catalogs: [Expo SwiftUI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/), [Expo Compose](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/), [Expo SwiftUI sheet](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/bottomsheet/). No universal system Record button reproduces an entire stock camera app.

Do not add tabs merely to switch exclusive Camera/Monitor session roles. Future independent Library/Sessions sections could justify tabs. Expo's SDK 57 entry point remains `expo-router/unstable-native-tabs`, requiring explicit versioning/validation if adopted. [Apple tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Expo native tabs](https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/).

Portrait uses compact upper status, central viewfinder and lower zoom/record controls. Landscape redistributes controls beside the image without stretching it or changing an active file. The global portrait lock was removed. Long settings may scroll; essential capture controls stay fixed. [Android camera form factors](https://developer.android.com/develop/adaptive-apps/guides/camera-form-factors-support).

Use supported iOS Liquid Glass controls with system fallback; avoid covering the image in glass. Android may follow the phone palette outside capture, keeping neutral camera colors and a red recording signal. [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Compose Host colors](https://docs.expo.dev/versions/v57.0.0/sdk/ui/jetpack-compose/host/).

## OS integration and accessibility

- Use native navigation, keyboard, safe areas, sheets and permission dialogs. Verify sheet dismissal before screen Back, insets and keyboard behavior.
- Provide clear labels, announced selections, adaptable text, reduced motion and states understandable without color. Unsupported recording stays disabled.
- Request permissions only after an action needs them, never at Home.
- iPhone Camera Control has public session controls/AVCaptureEventInteraction; locked launch also needs LockedCameraCapture. Treat it as a separate integration of the existing owner.
- Evaluate brief haptics carefully on the recording phone. AVAudioSession disables recording-time haptics/system sounds by default; do not promise them unconditionally.
- Widgets, Live Activities and locked launch are separate post-foundation work, not decoration.

Relais touch-target policy: at least 44 × 44 pt on iPhone and 48 × 48 dp on Android; Record is larger. The current Apple HIG distinguishes default and minimum control sizes; Relais retains the larger target for comfortable camera operation. Native controls help but do not certify the whole screen. [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Compose accessibility](https://developer.android.com/develop/ui/compose/accessibility/api-defaults), [predictive Back](https://developer.android.com/develop/ui/compose/system/predictive-back), [Camera Control](https://developer.apple.com/documentation/avfoundation/enhancing-your-app-experience-with-the-camera-control), [recording haptics](https://developer.apple.com/documentation/avfaudio/avaudiosession/allowhapticsandsystemsoundsduringrecording).

## Versions and migration boundaries

The repository pins Expo 57 and its supported RN 0.86 pair. Expo UI's resolved Material 3 dependency is 1.5.0-alpha17; alpha dependency risk remains despite a production-ready binding API. Do not override Material independently in Gradle. Validate actual controls first; use a narrow local Swift/Kotlin view only for a missing binding or reproduced failure. [Material 3 releases](https://developer.android.com/jetpack/androidx/releases/compose-material3).

Xcode 26.6/CocoaPods 1.17.0 are installed. Hermes binary archives returned 404, so iOS scripts use the exact source tag and CMake 4.4.3. The first compiled app could not launch because prebuilt ExpoModulesWorklets expected React.framework while RN used sources. CNG now builds both RN and Expo modules from sources. Final simulator compilation/launch and Swift resource loading passed; physical smoothness still needs measurement.

Platform files under `src/components/` and `src/screens/` own presentation; `app/` routes stay thin. Types, valid-profile selection and protocol logic remain shared. Migrating presentation must not change camera ownership, acknowledgement semantics or fabricate recording success.

Acceptance includes both native builds, role journeys, retained valid selections after reopening, accessible essential controls, native dismissal/Back, system theme outside capture, large text/readers, keyboard and rotation. Hardware Instruments/Profiler runs are separate. Native controls alone prove neither 60/120 fps nor camera quality or low energy use.

## Icons, text and smoothness

SwiftUI Image renders SF Symbols. Android uses individual imports from `@expo/material-symbols` 0.1.1, whose package contains 3,849 symbols. Only referenced XML assets enter Metro; no complete font catalog is bundled. Icons share intent while retaining platform artwork. [Compose icons](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/icon/).

Role actions have an icon, title and short description. Decorative icons are hidden from screen readers. Above text scale 1.3, Android profile choices become native radio lists and iOS selectors become menus. Text remains adaptable without capping accessibility sizes. A simulator issue with stale React Native measurements after live Dynamic Type changes was corrected by renewing affected text views only when scale changes. [Validation](../e2e/native-ui.md).

SwiftUI/Compose animate presses, selections, scrolling and sheets. JS handles events and profile combinations, never per-frame animation or video pixels. Viewfinder layout updates only when dimensions change.

`CADisableMinimumFrameDurationOnPhone` permits higher supported iPhone refresh rates; the OS still chooses based on display, energy and load. It does not force 120 Hz. Retain Android scheduling and measure before requesting an override. [ProMotion](https://developer.apple.com/documentation/quartzcore/optimizing-iphone-and-ipad-apps-to-support-promotion-displays), [Compose performance](https://developer.android.com/develop/ui/compose/performance).

Measure optimized builds on real phones: Home, sheets, rotation and Back, then the same actions with preview active. Record missed frames and UI/JS time on 60/90/120 Hz screens, including low-power and thermal load. Debug screenshots validate arrangement, not maximum smoothness.

## Simplification history

The first native migration still had oversized promotional text, large capsules and repeated demo explanations. A second pass used compact role rows, modest system titles, concise descriptions and native About for version information. Camera/Monitor now have distinct entry points; QR/manual setup in the development connection flow lives in native sheets rather than permanent viewfinder cards. The release Monitor entry still reaches the explicit demo scanner/fixture journey until product transport is implemented; see the code audit.

Native light/dark splash assets and an Android adaptive icon add no delay. Dev Client loading remains separate from production launch. Remembered-device pairing is now implemented, while autonomous discovery and a phone-hosted server remain unfinished. Never populate fake nearby devices or claim a connection without an actual service.
