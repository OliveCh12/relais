# Energy and performance

These are acceptance budgets, not measured foundation results. Existing short transport observations are recorded separately in [the iPhone report](../e2e/iphone-webrtc.md).

| Metric                     | Local V1 budget                                       |
| -------------------------- | ----------------------------------------------------- |
| Successful pairing         | < 15 s from visible QR to open DataChannel            |
| First Monitor frame        | < 2 s after connection, measured at rendering         |
| Preview glass-to-glass p95 | < 300 ms                                              |
| Preview                    | Product target up to 1080p30; adaptive below it       |
| Preview bitrate            | Product ceiling 8 Mbps; spike ceiling 2.5 Mbps        |
| Local file                 | Validated 4K30, otherwise 1080p60 then 1080p30        |
| Dropped file frames        | Zero outside critical thermal conditions              |
| Monitor CPU                | Hardware decoding verified by profiling               |
| Camera temperature         | Reduce preview before file quality                    |
| Battery after 20 minutes   | > 20% starting at 80%; initial loose target to refine |

## Spike instrumentation

DataChannel ping/echo uses one phone's monotonic clock to measure current RTT. The Monitor reads `inbound-rtp` through `getStats()`: received/decoded fps, decoded frames and inbound bitrate when available. Missing fields remain “—”. Low RTT does not establish low video latency. Capture and rendering timestamps from two phones cannot be subtracted without synchronization and an error estimate.

The spike requests 720p30, audio off, H.264 preference and sender `maxBitrate` 2.5 Mbps / `maxFramerate` 30 when supported. Negotiation may differ: record the actual codec and statistics. There is one RTCView, no JS frame filter and no file stream. Never fill missing fps or RTT with arbitrary values.

## Hardware protocol

1. Start at 80% battery, unplugged, with the same low brightness. Record ambient temperature, models, OS, network, distance, codec and versions.
2. Test both directions on a router and Camera hotspot, with internet disconnected. Measure ten cold and warm pairings.
3. Film a clock/flashing source beside the Monitor with a third high-speed camera. Sample at least 100 transitions; publish p50/p95/max and the method. Distinguish first packet, first decoded frame and first rendered frame.
4. Run for 20 minutes, sampling battery, thermal state, fps and bitrate every ten seconds. Use Instruments/Perfetto for hardware encode/decode, CPU/GPU and memory copies.
5. After native frame injection, repeat while writing 4K30, then supported 4K60 with stabilization. Verify duration, audio track, timestamps, full-file decoding and dropped frames.

## Degradation policy

At serious pressure, reduce preview from 30 → 24 → 15 fps, then 1080 → 720 → 480, and remove expensive overlays. At critical pressure, warn and offer lower file quality only after reducing preview. Never change format/aspect mid-file without an explicit finalization policy. If the OS stops capture, report the interruption and finalize as far as possible; do not promise zero drops.

Native thermal policy and battery/dropped-frame events remain unimplemented. Keep-awake prevents automatic locking, not background suspension or OS shutdown.

## UI refresh rate

UI refresh rate is independent of file and preview fps. SwiftUI/Compose handle gestures, sheet transitions and scrolling. No per-frame JS timer or animation drives the viewfinder. `app.config.ts` declares ProMotion support without guaranteeing a refresh rate; the system decides based on hardware and energy.

Pending optimized-build checks on physical iPhone/Pixel: twenty settings open/close cycles, rapid selections, large-text scrolling, rotation and background/return. Measure with Instruments/Perfetto, cold and under preview/thermal load, on 60/90/120 Hz screens. Record effective refresh, missed frames and long UI/JS tasks. Dev Client results are not release-performance proof. See [UI decisions](native-ui-ux.md).
