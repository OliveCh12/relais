# Architecture

Foundation: September 9, 2026. Native capture updated September 10. One app selects a Camera or Monitor role; the target is iOS ↔ Android without accounts or cloud media. The native-buffer-to-WebRTC integration and product commands are implemented; physical-device evidence is tracked separately in STATUS.md.

```text
Camera / Monitor UI → session + typed commands
                            ↓
                   RelaisCameraEngine
                            ↓
                 AVFoundation on iOS
             VisionCamera / CameraX on Android
                     one capture owner
                      ├─ full-quality local file
                      └─ reduced preview buffers
                            ↓ native only
                  WebRTC custom VideoSource
                            ↓ P2P LAN
                    Monitor RTCView

DataChannel: commands, ACKs, Camera state and capabilities
HTTP LAN + QR: SDP / ICE rendezvous
```

## Boundaries

| Directory                        | Responsibility                                                            |
| -------------------------------- | ------------------------------------------------------------------------- |
| `app/`                           | Expo Router entry points; no direct sensor access                         |
| `src/domain/`                    | JSON types and commands; no UI/native imports                             |
| `src/session/`                   | Pure state machine and Zustand store                                      |
| `src/signaling/`                 | Versioned QR descriptor, LAN validation and HTTP client                   |
| `src/connections/`               | Remembered identities, secure storage, handshake and presence             |
| `src/transport/`                 | Preview/DataChannel contract; no product JS capturer                      |
| `src/camera/api.ts`              | Historical public remote-engine interface and events                      |
| `src/camera/native/`             | JS adapter for the Expo native module                                     |
| `src/camera/web/`                | Explicit web stub                                                         |
| `src/monitor/`                   | Monitor commands; ACK required before showing recording                   |
| `src/capabilities/`              | Capability validation and compatible quality selection                    |
| `src/design/`, `src/components/` | Platform presentation and shared UI semantics                             |
| `modules/relais-camera-engine/`  | Native capture, Expo bindings, gallery integration and historical fixture |
| `src/spikes/webrtc-preview/`     | Disposable getUserMedia experiment; development-only                      |
| `scripts/`                       | Build, prebuild, LAN signaling and boundary checks                        |
| `tests/`, `e2e/`                 | Invariants and physical-device protocols                                  |

See [native remote capture](research/native-remote-capture.md) for commands, photo output and platform source references.

## Native presentation

SwiftUI and Jetpack Compose/Material 3 are exposed through Expo UI. Routes select platform-specific screens under `src/screens/`; `.ios.tsx`, `.android.tsx` and `.native.tsx` separate mobile implementations from web fallbacks. Native navigation is retained.

The iOS camera itself is a SwiftUI view hosted through Expo View. Home, buttons, selectors and sheets use platform controls. Icons share intentions while keeping SF Symbols or Material drawings. The viewfinder and essential controls stay fixed; settings scroll. No per-frame JS animation drives the camera surface.

The historical remote-quality draft lives in `src/capabilities/selection.ts` and `useQualityModel`; it remains fixture-based. Real local settings configure AVFoundation/CameraX independently. See [native UI decisions](native-ui-ux.md).

## Camera ownership and files

`AppleCameraModel` owns one AVFoundation session and `AVCapturePhotoOutput` or `AVCaptureMovieFileOutput`, plus native video-data preview, on iOS. `LocalCamera.tsx` owns one VisionCamera v5 / CameraX session on Android. Direct AVFoundation replaced iOS VisionCamera to access public iOS 26 Cinematic capture. Never mount the QR scanner, spike camera and local camera simultaneously.

Local profiles come from AVFoundation formats and CameraX Preview/VideoCapture/ImageAnalysis compatibility checks, not Monitor fixtures. After native finalization, PhotoKit/MediaStore imports the file. Failed imports preserve its private copy. A reduced native WebRTC output serves the Monitor without a second camera owner. [Native API decisions](research/native-camera-capabilities.md).

The older `getCapabilities`, `configure`, `startPreview`, `stopPreview`, `startRecording`, `stopRecording` contract and `thermal`, `battery`, `droppedFrames`, `recordingStarted`, `error` events remain a remote-control stub. It returns explicitly fictional capabilities and rejects capture operations. It must never return a fake file or recording event.

## Lifecycles

The connection lifecycle progresses through `idle → pairing → connected → reconnecting → connected`, followed by explicit closure. Role is fixed per session. Recording states (`idle / starting / recording / stopping / failed`) are independent. Remote commands require identifiers, deduplication and ACKs with confirmed native state; a tap alone must not show REC.

Network loss must not stop local recording. Reconnect must restore authoritative Camera state before enabling remote controls. Explicit closure during recording must await stop/finalization. Background camera operation is outside V1; interruptions must be surfaced and finalization attempted.

## Current limitations

Native local and remote product controls are implemented. Historical demo pairing and web screens retain explicit scaffolds. The development spike has its own capture session, screen and in-memory Node rendezvous server on a LAN computer. The server carries no media. Standalone two-phone operation requires native signaling on the Camera and separate hotspot validation.

Do not hide compatibility debt by disabling New Architecture. Exact versions are locked. A Metro bundle or prebuild is not an Xcode/Gradle build. [STATUS.md](../STATUS.md) separates those proofs and records unresolved issues.
