# Simulator audit — September 11, 2026

## Scope and environment

Actual UI interaction used an iPhone 17 Pro simulator running iOS 26.5 and the Pixel 10 Android AVD (API 36.1, ARM64). The Android emulator used the Mac webcam. iOS Simulator has no capture camera; it was the Monitor. These results do not certify physical iPhone capture, 4K/HDR/Cinematic, sustained performance, or all four platform pairings.

The user authorized ADB screenshots and taps on the Android emulator. iOS interaction used the Simulator UI. Screenshots containing webcam images, pairing secrets and local diagnostics remain in ignored `.native-tools/`; they are not published.

## Defects corrected

- The QR camera was inside a native settings host without a dependable preview height. Scanning now has a dedicated, bounded page. The scanner unmounts when unfocused, pauses in the background, refreshes permissions after returning from Settings, and exposes startup errors and retry. An iOS simulator without lenses shows an explanation instead of an empty viewfinder.
- Android camera buttons could lose touches to the viewfinder. Compose controls now receive touches through a React Native ViewGroup and a native gesture handler. Mode swipes recognize alongside native segmented-button interaction. The full-preview native gesture wrapper was removed; VisionCamera retains its native pinch-to-zoom handling.
- Android uses tap metering only. Exposure dragging remains an iOS interaction. Android reports supported metering modes, rejects unsupported focus commands, and ignores metering points outside the displayed camera image. The optional `canFocus` capability survives protocol validation while remaining compatible with older peers.
- Android's system share activity backgrounded Camera and invalidated the very pairing code being shared. **View code** now opens a selectable code page inside Relais. The app returns to Camera when pairing completes from its connection/code page, restoring the live viewfinder immediately. Both apps must remain open; codes are temporary.
- The iOS connection field uses an ASCII keyboard, disables correction/capitalization and supports the keyboard Go action.
- The existing Expo UI Kotlin patches were being bypassed by the precompiled Android AAR. The pinned autolinker matches **Gradle project names**, so `buildFromSource: ["expo-ui"]` is required; `"@expo/ui"` does not match in this version. This makes the typography inheritance and non-interactive trailing Switch fixes part of the binary.

## Observed results

| Scenario                                         | Result                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Home → Monitor → Add camera → Scan code, Android | Scanner opens and displays the Mac webcam                                                                     |
| Same journey, iOS simulator                      | Explicit no-camera explanation; Enter code fallback works                                                     |
| Invalid connection code                          | Clear error; user can correct the entry                                                                       |
| Camera → View code → iOS Enter code              | Pairing succeeds without leaving the camera app                                                               |
| Android Camera → iOS Monitor                     | Real webcam preview received; no green screen or gesture-root exception                                       |
| Photo triggered on iOS Monitor                   | Android reports Photo added to gallery; iOS receives the same confirmation; JPEG present in `Pictures/Relais` |
| Video started on Android, stopped on iOS         | Monitor changes to Recording/Stop; final MP4 present in `Movies/Relais` (19.1 seconds)                        |
| Video started on iOS, stopped on Android         | Both return to idle and report saved video; gallery contains the second MP4 (about 12 seconds)                |
| Photo → Video changed on Android                 | iOS changes mode and displays the actual emulator profile, 720p/30 fps                                        |
| Grid enabled from iOS settings                   | Android settings report the same checked value                                                                |
| Grid disabled through Android settings row       | iOS toggle changes back to off                                                                                |
| Android Gallery button                           | System photo picker opens and displays the new JPEG and both videos                                           |
| iOS saved preset                                 | Photo/Video selection updates; restored to Photo after the test                                               |
| Native back buttons / Android Back               | Tested through settings, pairing and nested capture pages                                                     |

A final pass used the actual Android Release, including the source-built UI module. Tapping the trailing Switch itself updated its parent row, the camera toolbar buttons worked, and reconnecting the remembered emulator from iOS automatically returned Android from its pairing page to Camera with a visible live preview.

The iOS edge-back gesture could not be conclusively driven by the automation; it is not counted as a pass. Native stack gestures remain enabled. No latency or frame-rate number is inferred from a Debug build or from emulator behavior while native builds run.

## Verification and release evidence

Project checks run strict TypeScript, ESLint with zero allowed warnings, 78 tests, camera/domain boundary checks and Prettier. Native Release builds and installation results are recorded in `STATUS.md`. Compiler diagnostics from pinned dependencies remain visible; a successful build is not described as globally warning-free.

The physical iPhone 17 Pro and Pixel 11 Pro were detected. No additional physical Pixel 10 was present in ADB; “Pixel 10” in this audit is the emulator. iOS capture and physical cross-platform acceptance remain separate checks.

## Physical relay acceptance

1. Keep both phones unlocked, on the same Wi-Fi network, with the local connection service available.
2. On the iPhone, open Camera → Connect a monitor. On Android, open Monitor → + → Scan code. After pairing, verify the live image and select a format advertised by the iPhone.
3. Start/stop from either screen. Check that both reflect recording and that the original appears in **Photos on the iPhone**. Change a setting from either device and confirm the other reflects it.
4. Reverse roles: Android Camera, iPhone Monitor. Repeat the same checks; originals must appear in **Android's gallery**. Repeat with two devices of the same OS when available.
5. Verify foreground/background recovery, denied/restored permissions, portrait/landscape, larger system text and physical native back gestures. Check iOS-only capture modes on the real iPhone; simulator success cannot establish hardware support.

## Sources checked

- [Expo Camera, SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/camera/): one active preview, lifecycle and readiness callbacks.
- [Precompiled Expo Modules](https://docs.expo.dev/guides/prebuilt-expo-modules/): source-build opt-out for modified native modules. The project-name matching detail was verified against the installed autolinker source.
- [Android emulator command line](https://developer.android.com/studio/run/emulator-commandline): webcam-backed emulator cameras.
- [Compose interaction handling](https://developer.android.com/develop/ui/compose/touch-input/user-interactions/handling-interactions): native component interaction behavior.
- [React Native performance](https://reactnative.dev/docs/performance): native navigation transitions and the limits of performance judgments from development builds.
