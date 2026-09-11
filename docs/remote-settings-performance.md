# Remote settings responsiveness

## Findings — September 11, 2026

The device settings screen disabled navigation rows while a command was awaiting the native camera acknowledgement. Selection markers also waited for that acknowledgement. Every mounted settings page consumed the changing session context, and a settings-cache update rewrote both native format chunks even when the catalogue was unchanged.

The Pixel's Dev Client history contained only the primary checkout's Metro URL on port 8087. The newer UI branch used port 8088. Installing another Debug APK did not ensure that its JavaScript came from the updated checkout. Both performance and version checks must distinguish the installed binary from the loaded JavaScript.

These are code and deployment findings, not physical network-latency measurements.

## Implementation

- Settings navigation remains available while the camera applies a change. The existing native stack freezes background settings pages; the Camera/Monitor index and session provider remain active so native capture, preview and acknowledgements continue.
- `RemoteSettingsQueue` projects pending values into the device settings UI immediately. The monitor's shutter, recording, readiness and gallery indicators continue to use confirmed camera state.
- Only one command is in flight. Repeated queued edits to the same setting use the latest requested value. Mode/lens changes form ordering boundaries because they can replace the capability catalogue.
- Each dispatch reads the latest camera revision and revalidates the requested setting against actual native capabilities. Native validation remains the final authority. Pending mode/lens changes hide the previous format catalogue until a real acknowledgement provides the new one.
- Native rejection, missing acknowledgement or disconnection clears pending edits. The UI returns to the latest camera-reported values, and dependent commands are cancelled. An old connection's completion cannot affect a new connection's queue. Coalesced callers share the final acknowledgement; one failed batch produces one device-settings alert.
- Identical remote snapshots no longer republish React state. The host no longer forces an extra snapshot after sending its reply. Regular camera-state publication remains active.
- Settings subpages do not repeatedly query presence. Link metrics remain limited to the focused Connection page. Unchanged format chunks are not rewritten to SecureStore.

No dependency upgrade, new transport, video-frame processing in JavaScript, recording pipeline change or speculative capture confirmation is introduced.

## Verification

Targeted tests cover immediate projection before acknowledgement, authoritative capture state, native-revision refresh, coalescing, rejection and rollback, disconnect/reconnect, mode/lens boundaries, changed capabilities, recording restrictions and missing acknowledgements. A burst of 20 zoom edits plus one grid edit dispatches three commands while retaining the final requested values. This proves command reduction under that scenario; it is not an end-to-end latency benchmark.

A cache regression verifies one write for a grid change instead of three, no writes for an identical snapshot, and catalogue preservation after restart. The full code gate includes strict TypeScript, zero-warning ESLint, tests, architecture boundaries and formatting.

## Device builds

Use Release builds with embedded JavaScript when evaluating responsiveness. A locally installed Android Release APK currently uses the project's existing development signing key, preserving the installed app's identity and data; it is not a Store distribution build. iOS uses the configured development provisioning. No Metro URL is needed for these builds.

The prototype rendezvous service still needs to run on the Mac. The build can receive `EXPO_PUBLIC_SIGNALING_URL` for the current LAN, and saved app/device connection settings remain available. An embedded build removes the dependency on Metro, not the rendezvous service.

From the isolated worktree:

```sh
source scripts/android-env.sh
EXPO_PUBLIC_SIGNALING_URL=http://MAC_LAN_IP:8787 ./android/gradlew -p android :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 --no-daemon --console=plain

source scripts/ios-env.sh
EXPO_PUBLIC_SIGNALING_URL=http://MAC_LAN_IP:8787 xcodebuild -jobs 4 -workspace ios/Relais.xcworkspace -scheme Relais -configuration Release -destination 'generic/platform=iOS' -derivedDataPath .native-tools/ios-device-build -allowProvisioningUpdates build
```

Open Camera on the Pixel and Monitor on the iPhone, connect, then open Camera Settings and change several values. Check that selection feedback and Back navigation remain responsive, that the camera eventually reports the effective values, and that a disconnect removes pending changes. Repeat with the roles reversed. Leave lens/mode transitions time to return their new capability catalogue. Physical network/camera latency and visual acceptance remain owner-run; zero transport latency is not claimed.

## Installed build evidence

Source commit: `c51cc55` on `codex/native-settings-navigation`.

- Android ARM64 Release: build passed (6m 6s), embedded settings UI/queue markers verified, signing certificate matches the existing app. Installed on the Pixel 11 Pro without clearing data; package flags confirm Release, the process is running and Relais is the focused activity. The installed APK SHA-256 matches the local artifact: `9b96d8d0a2986d3e430495f181e85ca19c6f54748f15f7598003775d79175e44`.
- iOS device Release: build passed, strict code-signature verification passed, and updated settings UI/queue markers verified in `main.jsbundle`. Installed and launched on the paired iPhone 17 Pro through CoreDevice. Bundle SHA-256: `debe07650f0bc4a3a30207515bec5d51d6f08cb60388bacff9a0876cf8244e4f`.
- All 64 tests passed. Strict TypeScript, zero-warning ESLint, architecture boundaries and formatting passed. Native dependency/toolchain warnings were not suppressed. These are build, deployment and code checks; no physical capture, end-to-end latency benchmark or extended visual QA was performed.

## Primary references

- [React Native performance](https://reactnative.dev/docs/performance): native stack transitions and Release builds for performance evaluation.
- [React Navigation native stack](https://reactnavigation.org/docs/native-stack-navigator/#freezeonblur): suspend inactive screen rendering without replacing system navigation.
