# Local recording — manual hardware check

## Starting state

September 10 update: iOS capture now uses direct AVFoundation and SwiftUI. The physical iPhone opened at 4K HDR30 in Video and Apple's Cinematic mode, with the screen kept awake. The device reported 4K120 profiles; recording at that rate has not been measured. Android ARM64 compiled with native CameraX profile discovery. The file checks below are still pending; previous evidence remains in local artifacts.

- TypeScript, ESLint and architecture boundaries passed.
- Focused coordination tests passed: early stop/double tap, and gallery import failure/retry.
- Android ARM64 built with the MediaStore module. The historical APK is in `e2e/artifacts/recording/relais-recording-arm64.apk`.
- Production iOS, Android and web bundles were generated; native production bundles excluded prototype markers.
- Simulator presentation showed SF Symbols and an explicit unavailable-camera state. This does not validate capture.
- The signed iPhone build installed over USB and included the Photos add permission. Native finalization and playback of a real file still need verification.
- Duplicate Worklets packages caused an iPhone startup crash. Metro now resolves one 0.10.1 runtime and Babel plugin; simulator and iPhone restarts succeeded on September 10.

## Short iPhone check

1. Open **Camera** from Home. Grant camera and microphone access if requested. Choose **4K / 30**, open settings and check **Record audio**. **Cinematic** uses Apple's effect and depth control.
2. Frame a subject, pinch to zoom and tap to focus. Press the red button, record and speak for about ten seconds.
3. Stop. Allow adding to Photos if requested, then wait for **Video added to Photos**.
4. Open Photos and play the video. Check image, sound, duration and orientation. Make one more recording with the iPhone held in landscape from the start.

If Photos rejects the import, Relais retains the private file and offers **Add to gallery**. Remaining files can also be imported after reopening Camera. An interrupted, unfinalized file may be retained without being playable; file repair is not implemented.

Test remote preview separately through **Monitor**. It does not record and requires the Mac connection service. Remote triggering and simultaneous local capture still need integration.

## Hardware results to complete

| Check                                  | Result                     |
| -------------------------------------- | -------------------------- |
| Real iPhone recording                  | Pending                    |
| Photos import and playback             | Pending                    |
| Audio                                  | Pending                    |
| Portrait / landscape                   | Pending                    |
| Physical Android recording and gallery | No Android phone available |
