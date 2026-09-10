# Project status — September 10, 2026

**Camera and Monitor now share a product flow for photos, native video recording and remote shutter/start/stop.** Native focus, exposure and color are automatic. The local writer is independent of the reduced native WebRTC preview. The Mac rendezvous and physical-device validation remain required.

## Photo and remote capture integration

- Replaced the Monitor's development-spike route with product controls, native connection sheets and saved-camera discovery. A single available saved camera reconnects automatically. First pairing still uses the secure-store handshake and a QR/pasted code.
- Added native photo output and PhotoKit/MediaStore import, Photo/Video selectors and authoritative remote state. Cinematic remains an iOS hardware-dependent mode. Removed manual focus, exposure and depth controls. Home and unavailable-camera states use clearer native navigation and smaller standard controls.
- iOS streams from the same AVFoundation session. Android extends the existing CameraX owner with a native ImageAnalysis output. Frames stay native. Closing Monitor or releasing the peer track does not stop local recording.
- `pnpm check` passed with 30 tests, strict TypeScript, ESLint, architecture boundaries and formatting. Four focused command tests cover pairing requirements, payload validation, duplicate capture prevention, expired sequence rejection and native errors. Production exports for iOS, Android and web passed.
- Android ARM64 `assembleDebug` passed (603 tasks), and the final APK was installed and opened on the emulator. Native Photo mode reported ready; a capture completed with a gallery-save confirmation and a JPEG in `Pictures/Relais`. This proves the emulator photo path, not physical-sensor quality.
- The final ARM64 iOS Simulator build passed and was installed. Its Monitor paired with the final Android emulator Camera, triggered a photo, changed to Video, started and stopped one recording, and received both gallery-save confirmations. New JPEG and MP4 originals were present in Android's gallery folders. Native receive statistics showed 881 decoded frames at 640 × 480 in Photo and 3,098 accumulated decoded frames during Video; sampled receive rates were 25 and 18 fps under concurrent native builds. These are emulator functional results, not phone performance targets.
- During an earlier installation of this integration on the physical iPhone, Monitor automatically reconnected and received the Camera's authoritative state for a 4K HDR30 recording already in progress. The take was left uninterrupted. Remote shutter/start/stop and gallery finalization on the physical iPhone have not yet been verified for this integration.
- The final iPhone build passed. Both iPhone and Simulator apps passed `codesign --verify --deep --strict`; native production bundles contained none of the development capture/spike probes. Xcode reported the physical iPhone unavailable at handoff, so it still needs the final binary reinstalled. Simulator Monitor and the Android emulator remain available with Metro on 8087 and LAN signaling on 8787.
- Physical Android, sustained preview/recording, network interruptions and detailed visual QA remain owner checks. The existing O20 Android startup crash is not considered fixed. The original native files remain independent of the connection.
- [Implementation and public API sources](docs/research/native-remote-capture.md). The dated sections below describe earlier states and must not be treated as the current feature list.

## Historical evidence

## Native lifecycle hardening

- The [source audit](docs/research/native-code-audit-2026-09-10.md) and [native component reference](docs/research/native-components-and-performance.md) document the public APIs, installed versions and ordered follow-up work. No dependency or target-SDK upgrade was made.
- iOS camera appearance is idempotent. Permission and configuration completions are checked against screen lifetime; foreground recovery waits for the active application. Closing invalidates pending configuration results, and finishing a gallery import cannot reopen a closed screen. A failed configuration stops and clears the capture graph, exposing an unavailable state instead of a partly configured camera.
- iOS zoom buttons and pinch gestures share the same display-to-device conversion, including the pre-iOS-18 fallback. The SwiftUI stabilization toggle is disabled and explained when the selected connection does not support stabilization. Its value no longer advertises an unsupported request as enabled.
- Android capture follows route focus and application activity. Camera release waits for native file finalization, independently of a slow or refused gallery import. The user-facing save operation still waits for gallery confirmation and retains the private file on failure. Stale permission results cannot reopen a hidden screen.
- Android only intercepts Back while recording or saving, and only on the focused camera screen. Idle Back is left to the navigator. Existing SwiftUI/Compose controls and the one-owner native video boundary are preserved.
- `pnpm check` passed with 26 tests, strict TypeScript, ESLint, architecture boundaries and formatting. Three added regressions cover delayed gallery import, failed native startup and retrying a failed stop. These are controller tests, not physical-camera validation.
- Final iPhone and ARM64 Simulator builds passed, including `codesign --verify --deep --strict`. Android ARM64 `assembleDebug` passed in 5 min 16 s (600 tasks). All three apps were installed and opened; the Android process and Metro were confirmed running. Metro on 8087 and signaling on 8787 remain available for owner testing. TypeScript, the changed Android hook's lint check and formatting also passed after the final lifecycle adjustments.
- This is the first lifecycle/settings slice, not completion of the audit backlog. iOS interactive Back, the iOS 16.4 orientation fallback, simultaneous recording/streaming and O20 remain open. Visual QA, file playback, gallery behavior and background transitions on physical phones are left for owner testing.

## English publication pass

- Documentation, app-owned interface text, accessibility labels, native permission descriptions, errors and source comments are in English. User-defined device names and protocol identifiers are preserved. Historical audit screenshots retain their original labels.
- The camera permission description is shared across native config plugins so QR scanning does not overwrite the explanation of recording and local preview.
- Visual inspection found that the embedded iOS camera inherited light UIKit traits over its black background. Its hosting controller now explicitly uses dark appearance, keeping semantic SwiftUI text readable while Home and connection sheets follow system appearance.
- `pnpm check` passed: strict TypeScript, ESLint, 23 tests, architecture boundaries and formatting. Local documentation links were checked. A final TypeScript/config-format check also passed after the permission consolidation.
- Production exports for iOS, Android and web succeeded. Native release bundles contain no spike/debug-control markers or rec-mock command.
- Final iPhone and Simulator builds succeeded. The iPhone app passed `codesign --verify --deep --strict`. The English binaries were installed in the iOS Simulator and Android emulator; English Home and the corrected native iOS camera state were inspected. The physical iPhone was not reinstalled during this pass.
- Existing hardware limitations remain: full recording/gallery validation, simultaneous native recording plus streaming, physical Android testing and the intermittent Android startup crash below. Translation and compilation do not resolve those items.

## Latest native UI pass

- Home has two native actions: Camera and Monitor. Remembered devices are accessed through Monitor, without a duplicate entry point.
- iPhone uses a SwiftUI segmented Video/Cinematic picker, Liquid Glass action buttons on iOS 26, and compatible system button styles on older versions.
- Android places zoom above the shutter and splits native settings into Video and Framing with a Material segmented control.
- QR, manual code entry and Mac connection settings use native sheets. Closing the QR retains the session and preview; Android confirmed `active=true`, `hasStream=true`, `panel=null`. The sheet closes when the link opens.
- Connection and device sheets follow system appearance. A white-on-white iOS sheet title was found visually and corrected.
- Signed iPhone and Simulator builds passed and were installed. Home/options were inspected on iOS; Home, QR and Video/Framing settings were inspected on Android.
- Android ARM64 rebuilt successfully in 5 min 2 s (600 tasks) and was reinstalled. Its developer Tools button was intercepting the camera settings action; the button is hidden, with the default preserved in `plugins/with-dev-menu.cjs`.
- The new iPhone build reported a 4K HDR30 take in progress during user testing. It was left uninterrupted; finalization and Photos import were not verified by the agent.
- TypeScript, ESLint, formatting and architectural boundaries passed. No recording pipeline, pairing trust or dependency change was made by the UI pass.

**Open Android issue (O20):** a SIGSEGV in `MountingCoordinator::pullTransaction` occurred at the first launch after installation, at 10:54:44. It did not recur during the next two cold starts or Camera → Settings → Framing. Its cause is unknown and it is not considered fixed. An earlier Dev Client relaunch had shown the same native stack. Local log: `/tmp/relais-ux-android-crash.log`.

## Native camera implementation

- iOS has one direct AVFoundation session in `AppleCameraModel`, `AVCaptureMovieFileOutput`, Apple's preview/orientation handling and SwiftUI controls. It supports hardware-derived formats, frame rates, HDR, stabilization, zoom, exposure, continuous autofocus, hold-to-lock and Cinematic depth.
- Android retains VisionCamera/CameraX. Profiles are validated with Preview and VideoCapture together; the UI exposes compatible resolution, frame rate, HDR, stabilization, exposure and zoom. The Pixel emulator opened at 720p30; this is not Android hardware-performance evidence.
- iPhone 17 Pro on iOS 26.6.1: signed installation, native startup, capability enumeration, 4K HDR30 and Cinematic 4K HDR30 configuration succeeded. The screen stayed awake.
- SwiftUI settings were inspected on the physical iPhone; Compose settings and preview were inspected on Android. Local screenshots are in ignored `e2e/artifacts/native-camera/`. UIKit-rendered snapshots do not faithfully capture AV preview pixels or their material composition.
- Four focused profile/recording-coordination tests passed. Production exports were generated for iOS, Android and web; native release bundles excluded debug probes.
- ProRes/RAW, Log, external storage and simultaneous native recording/streaming are not implemented. Cinematic capture uses Apple's public iOS 26 API, not a custom depth effect. Android photo extensions are not advertised as video modes.

## Remembered devices and remote preview

Pairing uses random identities and per-pair secrets in SecureStore, without hardware identifiers or Bluetooth permission. Initial QR pairing is remembered on both endpoints. Presence expires after 12 seconds, renews every four seconds and disappears when occupied. Availability is checked again before reconnecting. Local rename, last connection and forget actions use native sheets.

The three-bar indicator uses measured WebRTC RTT, loss and jitter where available. It stays neutral before a measurement and does not represent Wi-Fi RSSI. The Mac still hosts the ephemeral LAN rendezvous; there is no standalone Bonjour discovery or phone-hosted signaling server.

Nine focused device/signaling tests passed during that slice, covering stored identity, handshake and presence behavior. A real iPhone Camera → iOS Simulator Monitor session confirmed pairing on both sides, 30 fps received, 6.8 ms Monitor RTT and zero packet loss in one sample. Manual persistence/reconnection and a pair of physical phones remain to be checked.

## Recording and gallery lifecycle

The local writer retains files in the private app directory and imports them through PhotoKit/MediaStore only after native finalization. Failed imports retain the file for retry. Focused tests cover stop-during-start/double-tap coordination and gallery denial with retained-file recovery. No network stream is recorded.

The remote-control capability contract remains a fixture-based stub. It is not used to configure the real local camera. Full file playback, audio, rotation, interruption recovery and gallery validation are tracked in [the recording protocol](e2e/local-recording.md).

## Earlier foundation evidence

These results describe earlier milestones and must not be mistaken for validation of every later change.

| Check                                 | Recorded result                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Strict TypeScript, ESLint, formatting | Passed through `pnpm check`                                                                    |
| Initial automated tests               | 14/14 camera/session/signaling and quality-selection invariants                                |
| Architectural boundaries              | Pure domain; no product import of spike/capturer                                               |
| pnpm peers                            | No conflict                                                                                    |
| iOS/Android prebuild                  | Passed; local modules autolinked                                                               |
| Production Metro exports              | iOS/Android Hermes and web generated; native bundles excluded spike markers and `rec-mock`     |
| Initial Android UI build              | ARM64 `assembleDebug` passed, 600 tasks, 2 min 23 s                                            |
| APK                                   | Approximately 112 MiB; native camera/Nitro/WebRTC libraries and capability fixture included    |
| Android runtime                       | Pixel_10 AVD, Android 16/API 36, 36.1 ARM64 image; Kotlin fixture and development route opened |
| iOS runtime                           | Xcode 26.6 / SDK 26.5, ARM64 Simulator build passed; Swift fixture loaded                      |
| Web                                   | Camera/Monitor scaffold navigation and dependent fixture settings inspected                    |
| Expo Doctor                           | 20/21; WebRTC New Architecture metadata and unpublished local module remain caveats            |
| Physical phones                       | iPhone tested; no physical Pixel tested                                                        |

Native UI migration checks included Android 150% text, dark mode, landscape, sheet swipe/Back and retaining 60 fps in the historical fixture picker. iOS checks included both roles, medium/large sheets, preserving selection, rotation, accessibility text and live Dynamic Type changes. These are historical scaffold tests; VoiceOver/TalkBack and predictive Back are not certified.

The old visual baseline remains in `docs/research/native-ui-2026-09-09/`. It records the former French interface. New documentation and current app copy use English. Current device artifacts and binaries remain ignored under `e2e/artifacts/` and `.native-tools/`.

## iPhone installation and WebRTC evidence

The physical iPhone was paired with the Mac and Developer Mode enabled. A Personal Team build passed `codesign --verify --deep --strict`; its provisioning profile allowed the device and debugging. An initial ExpoModulesJSI `errSecInternalComponent` signing failure was resolved by retrying signing and the incremental build. Device-side profile trust was required before the first launch.

Simulator signing must remain enabled with an ad hoc identity to retain Keychain access. `scripts/build-ios.sh` preserves this. Device binaries are generated under `.native-tools/ios-device-build/`; Simulator binaries cannot be installed on a phone.

Metro ran on LAN port 8087 and signaling on 8787. The development screen exposes temporary debugger controls that use the same session and validated descriptor as its buttons. A manual share/paste path supports the Simulator without camera scanning.

An earlier iPhone → Simulator sample received H.264 1280 × 720 at 30 fps, with 4,824 decoded frames and no reported packet loss, dropped frames or freeze. VideoToolbox reported `powerEfficientEncoder=1`; this is not evidence of hardware decoding on a physical Monitor. Ping RTT samples were 10.48 ms and 7.29 ms. The `rec-mock` echo succeeded without recording. After leaving the screens, a new session restored 30 fps and reached 1,080 decoded frames; no automatic reconnect was claimed.

## Tooling decisions

- Mise pins JDK 17; Android Studio's JBR 25 previously failed CMake.
- Xcode is selected per process, without changing global `xcode-select`.
- Hermes `250829098.0.17` archive URLs returned 404 at validation time. Source builds use `hermes-v250829098.0.17`, revision `3477757eb2475555cf8d8df24bfb1deb0613880d`.
- iPhone and Simulator source builds must run sequentially. Their separate DerivedData directories still share the Hermes `destroot`; concurrent builds produced an iOS library at Simulator link time during this pass.
- `buildReactNativeFromSource: true` and `usePrecompiledModules: false` avoid precompiled Expo modules expecting React.framework. Keep the native cache for incremental builds.
- Metro resolves Worklets, Reanimated and Nitro through root dependencies. This avoids the previous JS 0.10.1/0.12.2 Worklets duplication against the 0.10.1 native binary (`valueUnpacker not found`).
- Exact versions and the lockfile are retained. CameraX and Material alpha versions, WebRTC New Architecture compatibility and target-SDK permission changes still require device validation.

## Earlier camera milestone plan

The native-owner-to-WebRTC integration described at the top of this document now implements this milestone's capture path. Its reduced preview preserves native timestamps, buffer ownership and rotation, with audio off. Android closes each ImageProxy; no frames cross JS. Physical-device performance evidence is still required.

Validate one camera open, no leaks during 20 minutes, both physical iPhone/Android directions, 20 recording start/stop cycles and a five-second network interruption with an intact file. Keep local recording independent from transport throughout.

[Architecture](docs/architecture.md) · [Native UI](docs/native-ui-ux.md) · [Native camera APIs](docs/research/native-camera-capabilities.md) · [Obstacles](docs/obstacles.md) · [Device lab](e2e/README.md).
