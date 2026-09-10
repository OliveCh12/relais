# Pairing and device lab

## Current remembered-device flow

Open **Monitor** to access remembered devices. The first QR pairing saves both phones; later sharing sessions are found through an ephemeral announcement on the Mac's LAN server. Choose **Share this phone's view** on the Camera phone, then tap its **Available** name on the Monitor. Local names, last connection, forgetting and measured link quality use native interfaces. Both apps must stay open.

See [protocol and limitations](research/remembered-devices.md) and [the short check](../e2e/remembered-devices.md). Remembered devices never reuse an expired QR descriptor.

## Product target

The Camera phone should host a small LAN server. A versioned QR contains its private address, ephemeral session and token. The Monitor scans, closes its scanner, then exchanges SDP/ICE. Media uses peer-to-peer WebRTC with host ICE only: no internet, public STUN or TURN. Camera-hosted hotspots require independent testing: client isolation, host/client routing and addresses differ across operating systems. Bonjour may discover a specific service later; none is advertised now.

Product DataChannel commands carry an ID, action, acknowledgement, authoritative state and errors. Recording must never depend on the network channel. The historical product-screen demo QR is explicitly labeled and rejected by the spike.

## Delivered spike

`THROW AWAY — not the product camera pipeline`.

A Mac on the same LAN runs `pnpm spike:signaling`. Its terminal prints a private address and port. Allow port 8787 through the firewall if needed. Both phones use compiled Dev Clients. The technical spike is presented as **Monitor** / live preview in the app.

1. Camera: use the private HTTP server address, then share this phone's view. Grant camera access. The QR appears after the offer is created.
2. Monitor: scan the QR, or paste its descriptor in connection options. The scanner unmounts before joining. Remote video appears after SDP/ICE exchange; the microphone is not accessed.
3. Developer diagnostics can send `ping` and `rec-mock`. Ping measures RTT; rec-mock acknowledges an echo without starting recording.
4. Leaving the screen or backgrounding releases tracks, peer connection and timers. Create a new sharing session after expiration or failure. Remembered-device selection simplifies joining a new session; it does not silently reopen the camera.

The server transports only SDP/ICE, retains sessions in memory for ten minutes, bounds their number and size, and separates Camera/Monitor tokens. Invalid format, version, private IP, session, token or expiration causes rejection. Tokens and SDP are not logged; media is not stored. HTTP on a LAN is not strong authentication. Active Camera closure and expiration release server state.

The Mac server is an explicit prototype limitation. Standalone two-phone operation needs a native server on the Camera and separate hotspot validation. Displayed RTT is not glass-to-glass latency.

## Acceptance scenarios

| Scenario                               | Procedure                                                                                               | Target / current limitation                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone Camera → Pixel Monitor          | Wi-Fi router, QR, 20-minute preview, ping/rec-mock; repeat with hotspot                                 | Pairing < 15 s, first rendered frame < 2 s, video p95 < 300 ms; measurement pending                                                                        |
| Pixel Camera → iPhone Monitor          | Reverse direction; deny then grant permissions                                                          | Same budgets; no blocked navigation; measurement pending                                                                                                   |
| Five-second Wi-Fi loss while recording | After native streaming integration: start a real file, disable Wi-Fi, restore, resynchronize, then stop | Intact file, preview returns, no Stop caused by network loss. Unit invariant exists; simultaneous hardware scenario remains blocked by missing integration |

## Device lab checklist

- [ ] iPhone 17 Pro: record exact iOS build; test newer OS versions only when available.
- [ ] Physical Pixel: record exact model and available Android image; do not assume an older OS is installable.
- [ ] Simulators/emulators: navigation, permissions and fixture behavior only; no sensor-quality conclusions.
- [ ] USB hardware: signed build, startup and native capability discovery.
- [ ] Same router, each phone's hotspot, AP isolation and disconnected internet.
- [ ] Permission denial/revocation, invalid/expired QR, closed session and backgrounding.
- [ ] Anonymized logs and screenshots in ignored `e2e/artifacts/`.

Build scripts prepare binaries. [e2e/README.md](../e2e/README.md) describes artifacts and smoke checks for a future Testdroid/Bitbar integration. No device-farm CI has been created.
