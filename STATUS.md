# Project status — September 11, 2026

**Camera and Monitor now share a product flow for photos, native video recording and remote shutter/start/stop.** Continuous native focus, exposure and color remain automatic, with optional native tap metering and exposure compensation. The local writer is independent of the reduced native WebRTC preview. The Mac rendezvous and physical-device validation remain required.

## Remote settings responsiveness

- Settings selections now update optimistically while the camera remains authoritative for capture, readiness and gallery completion. A bounded queue serializes native changes, coalesces repeated values and revalidates against the latest revision/capabilities. Native errors and disconnects clear pending edits; old replies cannot affect a replacement connection.
- Device submenus stay navigable during changes. Background settings pages freeze their rendering while Camera/Monitor and transport remain active. Duplicate remote snapshots, redundant format-cache writes and settings-subpage presence scans are reduced.
- Deployment investigation found that the Pixel still remembered the old Metro URL on port 8087. This explains why installing the previous Debug APK did not reliably load this UI branch. Release builds now embed the current JavaScript for owner testing without Metro.
- Strict TypeScript, zero-warning ESLint, formatting and architecture checks passed. All 64 tests passed, including the added cache-write regression. A burst test reduces 21 setting edits to three dispatched commands; this is command-count evidence, not physical network-latency measurement.
- Android ARM64 Release built successfully in 6m 6s and was installed on the Pixel 11 Pro without clearing data. Package flags confirm a non-debug build; the installed APK SHA-256 matches the built artifact, and its embedded bytecode contains the updated settings flow and queue. Relais is the focused activity. The iOS device Release build also passed, including strict signature and embedded-code verification; it was installed and launched successfully on the paired iPhone 17 Pro. Source commit: `c51cc55`. Both builds contain their JavaScript and use the existing Mac rendezvous service. Native dependency/toolchain warnings remain unsuppressed; physical relay latency and capture/gallery acceptance remain owner-run.
- [Implementation, scope, primary references and test procedure](docs/remote-settings-performance.md).

## Home, app Settings and device stack pages

- Follow-up: the device overview now has one Camera Settings entry. Capture, Video, Photo, Brightness and Preset live on its child pages. Navigation rows consistently use colored SF Symbol badges on iOS and tonal Material Symbol circles on Android, including Home, My cameras, Settings and pairing pages. TypeScript, zero-warning ESLint, architecture boundaries and all-platform production exports passed; incremental iOS and Android builds passed.

- Developed in `codex/native-settings-navigation`, an isolated worktree based on cleanup commit `8aa090a`; the primary checkout remains untouched.
- Home has Camera / Monitor in native grouped rows and a Settings gear. Preferred quality, Connection settings and About live under Settings with system Back navigation.
- Device categories and individual choices open stack pages. Connect remains at the top right; the device header holds the single availability indicator. Connection contains editable name/network and scoped link measurements. Forget remains destructive at the bottom of the device page.
- Text auto-saves on blur, Done and leaving the page, with serialized storage writes and native progress/check feedback. Quality, network defaults, per-camera overrides, pending presets and monitor framing are durable; no Save action is added to these flows.
- Remote video defaults target supported 4K60 with compatible fallback. Explicit device presets take priority, photo mode is unchanged, and automatic quality selection never continuously overrides live manual edits.
- Validation: strict TypeScript, ESLint with zero project warnings, formatting, 54 tests and architecture boundaries passed; production bundles for all three platforms passed. Android ARM64 and signed iOS device builds passed. Both were installed on the paired Pixel 11 Pro and iPhone 17 Pro without clearing data, and both launch commands succeeded. iOS strict signature verification passed. This branch is served by its own Metro on port 8088; the primary checkout and its Metro on 8087 remain unchanged. Application source: `25c5573`. Third-party native deprecation/toolchain warnings remain visible and are not suppressed. No physical capture or extended visual QA was performed.
- [Implementation and native references](docs/native-ui-ux.md#app-settings-and-camera-settings-navigation--september-11-2026).

## Relay root, viewfinder and unified device page

- GestureHandlerRootView now surrounds the complete navigator. The remote video has a non-collapsible native container, correct Android layer ordering and dimension-aware focus mapping.
- Hold/drag adjusts native focus and exposure locally and remotely; UI-thread square/sun/rail feedback does not process camera frames in JavaScript. Plain camera controls use native icons with comfortable targets.
- Device information and camera settings use native expandable groups on one device page, with Connect/Live in the app bar. Offline presets and the last native capability catalog persist across restart. Every queued change is validated against fresh acknowledgements on connection.
- Unused CaptureScreen/sheets/camera-settings aliases were removed. Relais-owned Android/iOS compiles have zero project warnings after replacing deprecated Camera2CameraInfo; Expo/RN/Pods deprecations remain and are not suppressed.
- Code checks currently pass: strict TypeScript, zero ESLint warnings/errors, 49 tests, boundaries and formatting. Final production bundles for iOS, Android and web passed. iPhone and Android ARM64 native builds passed and were installed on the paired iPhone 17 Pro and Pixel 11 Pro, preserving app data; strict iOS signature verification passed. Native dependencies still emit compiler/linker and Gradle deprecation warnings; these are not suppressed.
- Physical relay, metering accuracy and gallery acceptance remain owner-run. [Bidirectional test guide](docs/relay-testing.md), [implementation and primary sources](docs/research/relay-viewfinder.md).

## Native camera controls and device details

- Device names auto-save on blur/keyboard Done, with serialized writes, native progress/check indicators and retryable errors. Connect is now in the native app bar; device and pairing navigation stays in platform stacks.
- Both platforms expose native exposure compensation, Photo timer and flash choices locally and remotely. The capture phone owns the countdown and cancels it on interruption. Android optionally lights the native torch during countdown. Camera settings use a SwiftUI stack page on iOS and a Material grouped bottom sheet on Android.
- Camera selectors support swiping between real modes. Android gallery/flip actions use native rounded-square tonal buttons. iOS gallery selection uses PhotosPicker/Quick Look; Android delegates to the system gallery app. The existing recording/preview owners and original-media saving paths remain intact.
- Android exposure indices are converted using the sensor's native compensation step; the shared UI/protocol use applied EV values. Pixel-specific shadows and manual white balance stay automatic because the installed owner does not expose those controls.
- Validation: strict TypeScript, ESLint with zero project warnings, all 40 tests, architecture boundaries and formatting passed. iOS, Android and web production exports passed. iOS device and Android ARM64 builds passed; iOS strict signature verification passed. The Pixel received the new APK without clearing data. Both phones now have the updated native development build, as recorded above. Native dependencies still emit compiler/linker and Gradle deprecation warnings; they are not suppressed. The owner performs physical capture and visual acceptance; no camera operation was performed as QA in this pass.
- [Native controls, implementation and primary sources](docs/research/native-camera-controls.md).

## Photo and remote capture integration

### Remote media reliability and native settings

- iOS converts the shared AVFoundation output to bounded 8-bit BT.709 NV12 with native Core Image tone mapping. The original HDR/Cinematic movie is unchanged. Product previews target up to 1080p30 with an adaptive 8 Mbps ceiling, and both native cadence gates tolerate timestamp rounding. The isolated spike keeps its existing defaults.
- iOS remote commands now wait for native start or PhotoKit asset commitment. Android propagates gallery-import failures. Failed originals remain private for retry from either phone. Transient iOS inactivity during permission dialogs no longer immediately disconnects the peer.
- Monitor has a native Camera settings page for the named capturing phone: supported modes, front/rear camera, zoom, resolution, frame rate, HDR, microphone, stabilization and grid. Validated native profile catalogs and revisioned commands prevent stale or invented setting combinations. Zoom/grid remain available while recording; format changes wait until capture finishes.
- Strict TypeScript, ESLint, 34 protocol/controller tests, architecture boundaries and formatting passed. Production exports for iOS, Android and web passed. Project Swift exception-conformance warnings were corrected, and a CNG plugin removes redundant app linker flags and declares the development launcher's always-run script accurately. Third-party native compilation/Gradle deprecations remain dependency warnings; they are not suppressed or described as project-code errors.
- Final iPhone and Android ARM64 builds passed and were installed on the physical phones; the iPhone app passed strict signature verification. These are development clients loading the current code from Metro.
- The owner explicitly took over physical capture and visual acceptance checks. No final-device capture or gallery validation is claimed for this pass. Compilation does not establish that the reported green-frame failure is resolved on the two phones.
- [Implementation, sources and acceptance limits](docs/research/remote-media-reliability.md). No camera/WebRTC dependency version was changed.

### Settings-style lists and native stack pages

- Android uses Material Card/ListItem groups and circular Surface device icons. iOS keeps SwiftUI inset-grouped List rows. The whole device row opens a page, including offline devices. Basic online/offline presence stays in the list; no signal statistics are collected there.
- Add camera, Scan code, Enter code, Connect a monitor, device details, Info, connection settings and About now use real native stack pages with Back. Camera capture settings remain native camera controls. Remembered connections are opened explicitly from their device page.
- A session provider sits above each Camera/Monitor stack, preserving the transport across child pages. Android keeps its existing camera owner active within that stack. iOS retains the same AVFoundation owner while its view is temporarily detached by a pushed page, releases it when the view is destroyed, and retains its existing application-background handling. Scanning is limited to the focused scanner page, and joining waits until Monitor is shown.
- Product WebRTC statistics and application pings are disabled by default, enabled only while the connected device's Settings page is focused, and stopped on exit. Basic presence discovery runs only in the visible list or selected-device page. Native media transport and ICE maintain the connection independently.
- iPhone and Android ARM64 builds passed and were installed on both physical devices, preserving data. The iPhone binary passed strict signature verification. Both phones were locked afterward, preventing runtime verification of the final navigation; capture continuity across pages still needs owner testing. No new visual QA or recording test was performed in this pass.
- Code gates passed: strict TypeScript, ESLint, 30 existing tests, architecture boundaries and formatting. Production exports for iOS, Android and web also passed. No build success is treated as physical capture-continuity evidence.
- Public references: [Expo Router layouts](https://docs.expo.dev/router/basics/navigation-layouts/), [SwiftUI List](https://developer.apple.com/documentation/swiftui/list), [Material Card](https://developer.android.com/develop/ui/compose/components/card). No dependency was added or upgraded.

### Native device-list refinement

- Monitor now starts with a SwiftUI grouped List on iOS or Material LazyColumn/ListItem rows on Android. A native toolbar + on iOS and floating + on Android open a separate Add camera sheet. Refresh and connection settings live in the native overflow menu.
- The connected preview places the remote device name and measured link indicator together below its effective quality. Back returns to the camera list and suppresses immediate automatic reconnection. Connection failures remain visible; the local recording lifecycle is unchanged.
- Android's shutter uses a native OutlinedIconButton with Google's filled circle/stop symbols. Its circular shape explicitly supplies a radius because the installed native binding defaults to zero. The iOS QR scanner unmounts when its sheet closes, including during dismissal animation.
- Targeted screenshots confirmed the physical Pixel list, add sheet and filled shutter, plus the iOS Simulator grouped list and connected preview from the Pixel. The owner separately reported successful use between the two physical phones. No new photo or recording was triggered in this UI pass; sustained capture and O20 remain owner checks.
- Incremental iPhone and Android builds passed; both physical phones received the binaries and Relais was opened. The final interface is delivered by Metro, as this pass changes no native module or dependency. [Decisions and sources](docs/research/native-device-list.md).
- Final `pnpm check` passed (30 tests, TypeScript, ESLint, boundaries and formatting), as did production exports for iOS, Android and web. The iPhone app passed strict signature verification.

### Earlier capture integration validation

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
