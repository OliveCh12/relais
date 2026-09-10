# Remote preview, gallery confirmation and camera settings

Updated September 10, 2026. This pass addresses the reported green/pixelated live view and missing iPhone gallery captures, then adds native remote settings. The owner requested code/build checks and will perform the physical-device acceptance checks. The reported rendering failure has not been reproduced or verified fixed on the final binaries in this pass.

## Preview boundary

The camera's original remains an AVFoundation movie/photo or CameraX recording/photo. WebRTC only receives a separate reduced video stream; it never creates the original file.

On iOS, forwarding arbitrary AVFoundation buffers directly to `RTCCVPixelBuffer` was unsafe for HDR formats. The shared output now requests a supported native format after joining the session, retains 10-bit input when available for HDR, and uses Core Image to tone-map and convert it to 8-bit BT.709 NV12. Conversion and resizing stay on the native preview queue, using a persistent CIContext and a pixel-buffer pool capped at four outstanding allocations. Pool exhaustion drops a preview frame instead of allocating without a bound. The movie keeps its HDR/Cinematic configuration and metadata.

The iOS preview no longer accepts an unspecified preview-sized source that can be much smaller than the requested network image. Both platforms target up to a 1080-pixel short edge at 30 fps (1920 × 1080 for video; 1440 × 1080 for 4:3 photo framing). Actual CameraX output and WebRTC congestion adaptation can be lower. Rotation stays in native frame metadata. The product sender allows up to 8 Mbps; this is a ceiling, not a guaranteed bitrate. The isolated development spike retains its separate 720p/2.5 Mbps defaults.

Both native cadence gates tolerate timestamp rounding around 30 fps. The previous exact 33,333,333 ns comparison could drop alternating frames when a nominal 30 fps interval rounded slightly below that value. No video buffer crosses JavaScript.

Sources: [Apple HDR-to-SDR guidance](https://developer.apple.com/av-foundation/Incorporating-HDR-video-with-Dolby-Vision-into-your-apps.pdf), [Core Image tone-map input option](https://developer.apple.com/documentation/coreimage/ciimageoption/tonemaphdrtosdr), [CameraX ImageAnalysis](https://developer.android.com/media/camera/camerax/analyze). The installed Xcode 26.6 Core Image headers also document the tone-map option and NV12 rendering APIs.

## Capture completion belongs to the capturing phone

Previously, iOS `captureAction` resolved immediately after scheduling an operation. It now resolves on native start for `start`, and only after PhotoKit commits the asset for `photo`, `stop` and `retry-save`. Errors reject the remote command. PhotoKit uses an asset resource transaction with the original filename and capture creation date. The private file is deleted only after a successful transaction returns an asset identifier. Failures retain the file, expose the native error and allow **Retry saving on camera**, without taking another photo or video.

Android's recording controller also rejects `stop`/retry when the gallery import failed; waiting for native finalization alone is no longer reported as success. Releasing a camera still waits only for file finalization, independently of gallery permission or import latency.

The connection is retained while iOS is briefly `inactive`, such as during a Photos permission dialog. An actual application-background transition still releases transport. Network loss does not stop native recording. Commands have bounded deadlines and no automatic capture retry: an uncertain acknowledgement must never create a second original.

Successful iOS replies include the authoritative final state, so the monitor can display the result without racing a later view-state event. Ordered sequence numbers and the replay cache bind each request ID to its complete validated payload, including setting values.

Source: [PhotoKit asset creation](https://developer.apple.com/documentation/photokit/phassetcreationrequest).

## Native remote settings

**Monitor → Camera settings** is a stack page using SwiftUI Form/Picker/Toggle/Slider on iOS and Material ListItem/DropdownMenu/Switch/Slider on Android. The paired capturing phone's name and local-gallery destination are explicit. Connection measurements remain confined to Info.

The Camera publishes its actual profile catalog, active profile, supported modes, camera position, zoom range, microphone, grid and stabilization settings. The remote selects only entries in this catalog; it does not construct hypothetical resolution/FPS/HDR combinations. A settings revision rejects requests based on an obsolete camera configuration. Payload types, ranges, profile IDs, catalog size and message size are bounded. Older peers without settings remain usable for existing capture commands, but do not expose invented settings.

Configuration changes wait for native configuration callbacks. Resolution, FPS, HDR, audio, mode and camera switching are unavailable during capture/finalization. Zoom and grid can change during video recording. Native automatic focus, exposure and white balance remain automatic. Photo resolution continues to use the native quality policy rather than adding an unsupported size selector.

## Verification and limits

- Protocol/controller tests cover trusted requests, bounded settings, coherent catalogs, stale/duplicate IDs, payload identity, delayed gallery completion and retained-file retry after an import failure.
- Strict TypeScript, ESLint (zero-warning threshold), architecture boundaries and production Metro exports cover the shared and platform-specific code.
- Native builds establish compilation/signing only. They do not prove sensor output, HDR color, network bitrate, gallery visibility or sustained thermal performance.
- No device recording, screenshot or visual QA is included in the final validation at the owner's request. Test both camera/monitor directions, Photo/Video/Cinematic on supported hardware, a remote setting change and the original in the capturing phone's gallery.
