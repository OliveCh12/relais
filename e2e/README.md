# Device lab / Testdroid

Manual hardware checks. No cloud runner or account has been created.

- Android: `pnpm build:android -PreactNativeArchitectures=arm64-v8a` produces `android/app/build/outputs/apk/debug/app-debug.apk`.
- iOS Simulator: `pnpm build:ios` produces the app in `.native-tools/ios-build/Build/Products/Debug-iphonesimulator/`.
- Physical iPhone: `pnpm ios --device`; select your Apple team in Xcode for signing. Testdroid/Bitbar needs a signed device IPA, not a simulator `.app`.
- Current smoke checks: Home → Camera → Settings → return; Home → Monitor → connection options → dismiss. Recording and remote preview remain separate. Follow the dedicated recording and pairing protocols below.
- Historical fixture checks: demo pairing → placeholder Monitor → quality sheet. The remote-control stub must keep recording disabled.
- Accessibility identifiers include `choose-camera`, `choose-monitor` and `open-demo`. Add an Appium runner when integrating a device farm.
- Transport: follow `docs/pairing.md`. Emulators do not validate sensors, thermal behavior, cross-platform LAN operation or recorded files.
- Save build logs, screenshots, CSV measurements and dated device/OS/network reports in ignored `e2e/artifacts/`. Never include live tokens or SDP in shared reports.

Protocols: [local recording](local-recording.md), [remembered devices](remembered-devices.md), [native UI](native-ui.md), [iPhone-to-simulator evidence](iphone-webrtc.md).
