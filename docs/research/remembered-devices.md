# Remembered devices

## Delivered flow

**Monitor** opens the device list in the development client. First-time QR pairing establishes video, then both phones exchange identities and persist their pairing. Camera confirmation waits for the Monitor's persistence acknowledgement. No demo device is injected into this list.

To reconnect later, open Monitor on both phones and choose **Share this phone's view** on the capturing phone. The receiving phone sees it as **Available** and connects by tapping its name, without another QR. Roles can be reversed in another session. Sharing must be explicitly opened; launching the app does not activate the camera.

The list retains a local name, last connection time, random identity and pair-specific secret. The information button opens a native sheet for renaming, last connection and forgetting. Forgetting removes the local secret; a new QR can pair again. No persistent video session is saved.

## Native integration

- iOS: SwiftUI buttons, separators, fields, Form and sheet; SF Symbols. Android: Compose Material ListItem, IconButton, field and sheet; individual Material Symbols imports.
- Storage: `expo-secure-store` 57.0.3, compatible with the installed SDK. iOS Keychain uses `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; Android uses encrypted SharedPreferences with Keystore. The plugin excludes keys from Android backups. One entry per device, capped at twelve; storage errors never count as successful pairing. [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
- `expo-crypto` 57.0.2 generates 16-byte identifiers and 24-byte secrets. No Bluetooth, advertising identifier, hardware serial or location permission. [Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/).

## Availability and reconnecting

The existing LAN server provides private announcements per pair/device. Only the holder of a session's Camera token can publish; lookup requires the pair secret. Announcements expire after twelve seconds, renew every four seconds and disappear when a session is occupied or deleted. There is no public device directory.

The Monitor looks up only known devices while this screen is foregrounded. **Offline** means the service responded without an available announcement; **Network unavailable** means lookup failed. Selecting a device revalidates its announcement before joining. The first connected exchange checks identity and the saved secret; identity alone cannot reuse an existing secret. New QR pairing rotates the pair's keys.

The server stores only ephemeral state in memory. Restarting it preserves phone device lists, but sharing must restart to publish a new session. The current development Mac address is preferred when available, otherwise the last saved address. Bonjour discovery and an autonomous phone server are not implemented.

Preparation still uses HTTP on a test LAN. Encryption at rest does not authenticate this transport against a LAN attacker. This is not a production-ready discovery/trust system.

## Quality bars

iOS offers no general Wi-Fi signal-strength API for this use. Bars therefore describe the established link using round-trip delay, interval packet loss and jitter when WebRTC supplies them. Values remain absent before measurement; the Camera may have only RTT, without inbound video statistics. [Apple signal discussion](https://developer.apple.com/forums/thread/721067), [W3C WebRTC statistics](https://www.w3.org/TR/webrtc-stats/).

Thresholds are UX guides, not quality certification: good up to 120 ms, 1.5% loss and 25 ms jitter; weak above 300 ms, 5% loss or 50 ms jitter. Other valid measurements yield **Fair connection**. An unanswered ping after four seconds remains weak until a response arrives. This measures neither RSSI nor complete camera-to-screen latency.

## Verification and limitations

Focused tests cover restart persistence, rename, forget, storage failure, agreement on both devices, reconnection, role reversal, rejection of a forgotten key, expired/occupied/renewed announcements and unmeasured quality. Tests use isolated stores and a temporary local server; they do not certify Keychain or physical-phone behavior.

Local recording and remote preview remain separate. Apps must stay open and both phones plus the Mac must share a LAN. Waiting shares expire with their ten-minute session. Reconnection never silently activates the camera. Two-phone hardware checks and Wi-Fi changes are still pending.
