# Physical iPhone → simulated Monitor — September 9, 2026

WebRTC preview worked from an iPhone 17 Pro on iOS 26.6.1 to a simulated iPhone 17 Pro on iOS 26.5. Both ran Relais; only the Camera used a physical sensor. No audio or video file was recorded. The product recording engine was still a stub at the time of this test.

## Installation and method

- Xcode 26.6, SDK 26.5, Debug iphoneos/arm64 build signed with a Personal Team. Full signing verification, USB installation and developer-profile trust succeeded.
- Metro LAN on 8087; signaling on 8787. WebRTC 124.0.8, host ICE, no STUN/TURN.
- Opened the lab through `relais://dev/webrtc`. React Native debugger commands started the camera, transferred the validated QR descriptor to the Monitor, read statistics and sent ping/rec-mock. These commands control the same session as the buttons; no pixels cross this JS control path.
- Visually confirmed reception in the simulator's `RTCView`. Numbers below are observations from `RTCPeerConnection.getStats()` and application ping, not estimates.

## Observations

| Check                    | Result                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Connection               | WebRTC connected on both instances; DataChannel open                                   |
| Source and codec         | 1280 × 720, 30 fps, negotiated H.264                                                   |
| iPhone encoder           | VideoToolbox, `powerEfficientEncoder=1`, 2.5 Mbps target                               |
| Simulated decoder        | VideoToolbox, `powerEfficientDecoder=0`; no physical Monitor conclusion                |
| First sample             | 4,824 decoded frames, 30 fps, `framesDropped=0`, `packetsLost=0`, `freezeCount=0`      |
| Ping                     | 10.48 ms and 7.29 ms in two sessions; observations, not percentiles                    |
| Command                  | rec-mock received and acknowledged; no recording started                               |
| New session              | Connected at 30 fps, 1,080 decoded frames; sampled loss/freeze counters still zero     |
| Code checks at that date | TypeScript, ESLint, 14 tests, boundaries and formatting passed                         |
| Release isolation        | iOS/Android/web exports passed; native bundles excluded spike and test-control markers |

The first Monitor sample was collected at 19:33:01 UTC; the new-session sample at 19:37:49 UTC. Counters cannot be compared across sessions. The first sample's cumulative inter-frame duration exceeded 160 seconds; this does not certify a long-duration run.

## Incidents and limitations

Initial ExpoModulesJSI signing failed with `errSecInternalComponent`. Signing again after approving Keychain access fixed the incremental build. iOS then blocked first launch until the developer profile was trusted. Neither step required a product-code change.

The lab screens unmounted during the test and the Monitor reported disconnection. The cause of that exit was not established. Reopening the screens and creating a session restored video. A diagnostic request after closure produced a rejected-promise warning; the test script now catches that case. This is not proof of automatic reconnection.

Not validated: a second physical phone, Android hardware, the complete QR scan/share journey, glass-to-glass latency, UI refresh rate, battery/thermal behavior, HDR, high-resolution capture or product recording. DataChannel ping is not camera-to-screen latency.

## Local artifacts

`e2e/artifacts/iphone/` is ignored by Git. Evidence includes `build-signed.log`, `first-launch-untrusted.log`, `camera-stats-start.json`, `monitor-stats-start.json`, `monitor-restart-stats.json`, `monitor-connected.json` and `monitor-live-preview.png`. The descriptor containing the session token is stored only in ignored `.native-tools/`, never in this report.
