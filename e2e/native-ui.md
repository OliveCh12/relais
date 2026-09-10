# Native interface validation

Historical observations from September 9, 2026, followed by later UI passes. Local screenshots/accessibility trees are in ignored `artifacts/native-ui/`. Original foundation screenshots are separately dated in `docs/research/native-ui-2026-09-09/`. Old screenshots retain French labels as evidence; current application copy is English.

## Android — first native migration

ARM64 Dev Client on Pixel_10 AVD, Android 16/API 36, image 36.1, 1080 × 2424. Actual compileSdk/targetSdk 36. Compose controls use Material 3 1.5.0-alpha17.

| Journey                               | Observation at that date                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Home → Monitor → pairing → viewfinder | Icons/descriptions/native actions visible; no fake connection                |
| Camera route                          | Kotlin fixture capabilities loaded, explicit placeholder, recording disabled |
| Quality sheet                         | Full opening, drag indicator, selectors and Done visible                     |
| Select 60 fps, swipe closed, reopen   | Selection retained in sheet and viewfinder                                   |
| System Back with sheet open           | Sheet closes, Monitor remains                                                |
| 150% text, dark theme                 | Home/settings readable, dynamic colors and native radios                     |
| Front camera with large text          | Unsupported 720p/60 fps choices disappear; 1080p30 remains                   |
| Landscape Monitor, 150% text          | 16:9 frame and essential controls visible                                    |

Default emulator rendering encountered ColorBuffer errors and a hang; software rendering was too expensive. Remaining checks used `-gpu host -feature -Vulkan -memory 2048 -cores 2`. A System UI alert preceded testing. These AVD incidents are not a Relais performance profile. Initial preferences were restored and the emulator stopped after that run.

## iOS — first native migration

Xcode 26.6, SDK/runtime 26.5, iPhone 17 Pro simulator. The first universal build compiled but could not launch: prebuilt ExpoModulesWorklets expected React.framework while RN used sources because binary archives were unavailable. CNG now compiles RN and Expo modules from sources. Simulator builds use the Mac architecture and preserve caches.

The final arm64 build succeeded with exit 0, installed and launched. Moving the podspec to the module root included the shared fixture in RelaisCameraEngineResources.bundle.

| Journey                                       | Observation at that date                                       |
| --------------------------------------------- | -------------------------------------------------------------- |
| Home → Camera/Monitor → pairing → viewfinder  | SwiftUI controls, SF Symbols, descriptions; recording disabled |
| Camera capabilities                           | Swift getCapabilities loaded fixture without resource error    |
| Quality sheet                                 | Native medium/large detents, Form and Picker visible           |
| Select 60 fps, Done, reopen                   | Selection retained on Monitor and sheet                        |
| Landscape then portrait                       | Viewfinder/actions visible; selection retained                 |
| accessibility-medium Dynamic Type, dark theme | Native menus replace segments; readable, scrollable settings   |
| Live text-scale change                        | Full text after fixing stale RN text measurements              |
| Front-camera fixture                          | Choices narrow to 1080p30 from Swift bridge capabilities       |
| System Cancel then reopen                     | Returns to viewfinder, retains front lens; Done also works     |

Automation could not reproduce the iOS touch swipe. System accessibility Cancel verified the native dismissal path, not the physical gesture. Text/appearance preferences were restored.

Artifacts: `ios-home.png`, `ios-camera.png`, `ios-monitor.png`, `ios-settings-front.png`, `ios-landscape.png`, `ios-large-dark.png` under local `artifacts/native-ui/`.

Metro used IPv4-first because Node 24 otherwise listened on IPv6 while the simulator requested IPv4:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  mise exec -- node --dns-result-order=ipv4first node_modules/expo/bin/cli start --dev-client --localhost --port 8087
```

## Remaining physical checks

1. Run both roles on real iPhone and Pixel: light/dark, standard/accessibility text, portrait/landscape.
2. Use VoiceOver/TalkBack to check announcements, focus order, reduced motion, Android predictive Back and iOS back gestures.
3. Deny/grant scanner camera access and verify unmount/release before capture. No permission dialog should appear at Home.
4. Measure an optimized build with Instruments/Perfetto during sheets, selection, scrolling and rotation; repeat with active preview.

These layout tests establish no 60/90/120 Hz refresh guarantee or video latency. Historical file-fps fixtures were independent of UI refresh.

## Second pass — compact Home and pairing

Screenshots suffixed `polished` supersede earlier layouts for that pass. Compared with `ios-home-before-polish.png`, iOS uses a smaller title, no oversized capsules/repeated paragraphs, and two icon/title/description rows. Android uses the same hierarchy with Compose and dynamic colors.

- Builds passed: iOS BUILD SUCCEEDED, Android BUILD SUCCESSFUL in 5 min 23 s; binaries installed.
- At that date, pnpm check passed TypeScript, lint, fourteen tests, boundaries and format; iOS/Android/web bundles generated.
- iOS Home, both pairing roles, explicit Monitor permission and viewfinder access passed; clean binary restart passed.
- Android cold Dev Client launch followed by its recent project entry displayed compact Home. Camera's historical demo QR/instruction/action had no clipped controls.
- Real-device QR scanning and automatic transition were not validated by screenshots.
- Splash resources entered both builds. Exact production launch remains to check outside Dev Client.

Android reserve: the AVD had system ANRs, a WebView update killed Relais, and a deep-link relaunch produced SIGSEGV in MountingCoordinator::pullTransaction. Cold launch through the recent project entry then worked. The exact cause is not fixed or attributed to UI. Reproduction and optimized-build checks remain necessary; no RN workaround or dependency patch was added.

Artifacts: `ios-home-polished.png`, `ios-pairing-monitor-polished.png`, `android-home-polished.png`, `android-pairing-camera-polished.png`. The floating wheel was Dev Client, not product settings. It was subsequently hidden by native configuration.

## September 10 coherence pass

Current Home uses SwiftUI Form/Section and Compose ListItem. QR, manual code and server options use native sheets. iOS camera uses native segmented Video/Cinematic selection; Android settings use Video/Framing sections and zoom above Record. Signed iPhone, simulator and Android builds passed and installed. iOS Home/options and Android Home/QR/camera settings were inspected. QR dismissal retained sharing. See STATUS.md and [current UI decisions](../docs/native-ui-ux.md) for remaining checks and the later Android incident.
