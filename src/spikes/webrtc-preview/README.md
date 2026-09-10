# SPIKE 0 — WebRTC preview

**THROW AWAY — not the product camera pipeline**

This is the only directory allowed to open `getUserMedia`. Audio is off, recording is unavailable, and the spike does not depend on the product camera engine. Its `/dev/webrtc` entry point is development-only; the web screen imports no native implementation.

Run `pnpm spike:signaling` on a Mac on the same LAN as both compiled Dev Clients. The Camera phone uses the Mac's private HTTP address and displays a QR code; the Monitor scans it. Host ICE candidates are gathered before SDP publication, without trickle ICE. The QR does not contain SDP. There is no STUN, TURN or cloud service.

For an iOS Simulator monitor, use **Share code** on the Camera iPhone and the system Copy action. Transfer that text to the Mac clipboard, using Universal Clipboard if available, then paste it through the Monitor's connection options. This is the same QR descriptor, with the same token and expiration checks. Keep the Camera app in the foreground: backgrounding closes its session. iPhone-to-simulator reception was verified at 720p30 using the test commands below; the complete sharing/clipboard journey still needs a manual check.

`session.ts` owns the peer connection, tracks and timers. Leaving the screen, backgrounding or failure releases them. An iOS permission prompt can temporarily make the app inactive; only background closes the spike. Unmount the QR scanner before connecting the Monitor. A failed session requires a new session; this is not automatic product reconnection.

Ping/pong RTT uses `performance.now()` on one device. Inbound video statistics update once per second; missing values appear as “—”. `rec-mock` is an echo, never a camera action. See `docs/pairing.md` and `docs/energy-and-perf.md` for hardware validation.

A mounted screen exposes `globalThis.__relaisSpikeTest` only in development: `camera(url)`, `monitor(codeJson)`, `snapshot()`, `diagnostics()`, `ping()`, `recMock()` and `stop()`. These use the same session as the buttons and create no second camera owner. The probe is removed on unmount. `diagnostics()` reads WebRTC statistics, never pixels. Never copy snapshot tokens into shared reports.
