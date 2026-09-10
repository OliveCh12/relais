# Relais

Use one phone as a camera and another as a monitor. Relais combines React Native navigation with native platform interfaces: **AVFoundation and SwiftUI on iPhone; CameraX and Jetpack Compose on Android**.

This is a development prototype. **Local recording and the remote video feed are currently separate flows.** Recording and gallery import are implemented; complete file, audio and Photos/MediaStore validation remains a physical-device task. Read [STATUS.md](STATUS.md) for evidence and known issues.

## Current features

- **Camera:** native viewfinder, recording controls, hardware-derived resolution/frame-rate profiles, HDR when supported, stabilization, microphone, torch, camera switching, zoom, focus, exposure and a framing grid.
- **iPhone Cinematic capture:** Apple's public iOS 26 APIs provide depth and focus transitions on supported cameras. An iPhone 17 Pro successfully opened 4K HDR30 in Video and Cinematic modes. Its catalog also exposed 4K120 profiles; recording at that rate has not been validated.
- **Monitor:** a development-only WebRTC preview, with remembered devices and measured link-quality bars. The Mac currently provides LAN signaling; video travels directly between endpoints.
- **Native interaction:** SwiftUI Forms, segmented pickers, SF Symbols and system sheets on iOS; Material lists, segmented controls, sheets and symbols on Android. The web uses independent scaffold screens.

Open **Camera** to record locally. The red button starts/stops a take; settings expose compatible formats and framing options. A video is reported as saved only after the gallery confirms its import. Failed imports retain the private file for retry.

Open **Monitor** for remembered devices and remote preview. On the sending phone, choose **Share this phone's view**. On the receiving phone, choose **Scan a QR code**, or open options to paste a shared code. After the first pairing, select the sender when it becomes **Available**. Both apps must remain open on the same Wi-Fi. Closing the native QR sheet keeps sharing active.

## Get started

```sh
mise trust
mise install
direnv allow
pnpm install --frozen-lockfile
pnpm start
```

A **compiled Expo Dev Client** is required on mobile; Expo Go does not include the native modules. After the initial build, React views driving SwiftUI/Compose support Fast Refresh. Rebuild when native sources, dependencies or native configuration change. Use `pnpm web` to inspect the web scaffolds.

```sh
pnpm prebuild                 # Generate iOS/Android projects, without installing pods
pnpm ios                      # Requires Xcode and CocoaPods
pnpm ios --device             # Select a connected iPhone; configure Apple signing
pnpm android                  # Requires Android SDK and a device/emulator
pnpm build:android -PreactNativeArchitectures=arm64-v8a
pnpm build:ios                # iOS Simulator build with ad hoc signing
pnpm check                    # Types, lint, tests, boundaries and formatting
pnpm bundle                   # Production Metro exports for iOS/Android/web
pnpm run doctor               # Expo Doctor; pnpm doctor is a different command
pnpm spike:signaling           # Ephemeral LAN signaling server, port 8787
```

The generated `ios/` and `android/` directories are ignored. Expo SDK 57 regenerates them by default: place durable changes in `modules/`, config plugins or `app.config.ts`. The build scripts preserve generated projects with `--no-clean` when available.

Android uses mise's JDK 17 and `ANDROID_HOME`, defaulting to `~/Library/Android/sdk`. Install SDKs with Android Studio. Gradle can download missing components whose licenses have already been accepted.

For iOS, install full Xcode, the iOS Simulator runtime, CocoaPods and CMake (`brew install cocoapods cmake`). The scripts select `/Applications/Xcode.app` for their process without changing global `xcode-select`. At the recorded validation date, Hermes `250829098.0.17` binary archives returned 404, so the build used the exact source tag `hermes-v250829098.0.17`. React Native and Expo modules also build from source to avoid a precompiled-module dependency on an unavailable React.framework. Initial builds are slower; Xcode concurrency is limited to four jobs. Set `RCT_BUILD_HERMES_FROM_SOURCE=false` only when testing archive availability again.

### Install on a connected iPhone

Xcode installs the native Relais binary; no separate Expo app is needed. Connect and unlock the iPhone, trust the Mac, then enable **Settings → Privacy & Security → Developer Mode**, restart and confirm. Add your Apple account in **Xcode → Settings → Apple Accounts**. A free Personal Team supports personal testing, with signing renewed after seven days. [Apple account information](https://developer.apple.com/help/account/basics/about-your-developer-account).

Run `pnpm ios --device`. A Simulator binary cannot be installed on a physical iPhone. The debug client loads JavaScript from Metro on the Mac: use LAN mode, keep both devices on the same Wi-Fi, and allow local-network access. USB installs the binary; JavaScript loading and WebRTC testing use the LAN.

If iOS blocks an untrusted developer, trust the account's profile under **Settings → General → VPN & Device Management**. Valid signing does not replace this device-side confirmation.

Set `RELAIS_APPLE_TEAM_ID` in ignored `.env.local`, using `.env.example`, to preserve your signing team across CNG regeneration. Do not commit certificates, provisioning profiles, credentials or local device identifiers.

## Pinned stack

| Layer                                   | Version                                   |
| --------------------------------------- | ----------------------------------------- |
| Node / pnpm                             | 24.20.0 / 11.25.0                         |
| Java                                    | Temurin 17.0.20+101 (runtime 17.0.20.1+1) |
| Expo / React Native / React             | 57.0.21 / 0.86.3 / 19.2.3                 |
| Expo Router / Dev Client                | 57.0.20 / 57.0.18                         |
| Expo UI / Material Symbols              | 57.0.17 / 0.1.1                           |
| VisionCamera                            | 5.2.3                                     |
| Nitro Modules / Nitro Image             | 0.37.1 / 0.15.2                           |
| WebRTC / config plugin                  | 124.0.8 (M124) / 15.0.2                   |
| Worklets / Reanimated / Gesture Handler | 0.10.1 / 4.5.1 / 2.32.0                   |
| TypeScript / ESLint / Prettier          | 6.0.3 / 9.39.5 / 3.9.6                    |

Expo 57 supports RN 0.86.3; the newer RN release available at project creation was deliberately not adopted. Keep New Architecture enabled and do not upgrade Expo/RN, VisionCamera and WebRTC simultaneously. [Expo 57 notes](https://expo.dev/changelog/sdk-57).

VisionCamera 5.2.3 includes **CameraX 1.7.0-alpha03**; Expo UI includes **Material 3 1.5.0-alpha17**. These require device validation. The lockfile pins transitive dependencies. ESLint 9 remains until the Expo/React plugins support ESLint 10.

`patches/react-native-webrtc@124.0.8.patch` restores a missing TypeScript declaration export using types already shipped in `src/vendor`; it does not change WebRTC runtime code. React Native Directory's New Architecture warning remains an open validation concern.

## Contracts and development boundaries

`RelaisCameraEngine` owns native local capture. Its older **remote-control contract** still reports fixture capabilities (`source: stub`, `canRecord: false`, `canPreview: false`) and rejects capture commands. Do not confuse that contract with the working local camera implementations. Web and demo-pairing screens retain explicit placeholders and disabled recording.

`/dev/webrtc` is excluded from native release bundles. The isolated spike is the only place allowed to call `getUserMedia`. It requests an audio-free 720p30 preview, prefers H.264 and requests a 2.5 Mbps sender cap when supported. Actual negotiation may differ. Debug probes can measure ping RTT and a non-recording `rec-mock` echo; these are not production camera controls.

The Node server carries only SDP/ICE and ephemeral presence, not media. Standalone two-phone operation needs native signaling and independent hotspot validation. HTTP signaling on a test LAN is not strong peer authentication. A low ping RTT does not measure camera-to-display latency.

## Device lab and next steps

An iPhone Camera → iOS Simulator Monitor session received H.264 1280 × 720 at 30 fps. This does not prove physical Android compatibility, hardware decoding, battery performance or video latency. The Android Dev Client has an unresolved intermittent native startup crash documented under O20.

- [ ] Test two physical phones in both iPhone/Android directions.
- [ ] Test shared Wi-Fi and Camera-hosted hotspots without internet.
- [ ] Test denied permissions, expired QR codes, interruption and background behavior.
- [ ] Connect the native recording owner to a reduced WebRTC VideoSource.
- [ ] While recording, interrupt Wi-Fi for five seconds and verify an intact file and restored preview.
- [ ] Measure UI frame pacing, thermal load, video latency, audio and gallery output on real devices.

Accounts, cloud media, public livestreaming, SFU/TURN, product multicam and Store publication remain out of scope.

## Documentation

[Architecture](docs/architecture.md) · [Status](STATUS.md) · [Obstacles](docs/obstacles.md) · [Capability matrix](docs/capability-matrix.md) · [Native camera APIs](docs/research/native-camera-capabilities.md) · [Native UI](docs/native-ui-ux.md) · [Pairing](docs/pairing.md) · [Remembered devices](docs/research/remembered-devices.md) · [Performance](docs/energy-and-perf.md) · [Device lab](e2e/README.md) · [Development rules](AGENTS.md).
