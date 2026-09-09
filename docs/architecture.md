# Architecture

Fondation du 9 septembre 2026. Un seul binaire, un rôle choisi au lancement. La cible est iOS ↔ Android, sans compte ni cloud média.

```text
UI Caméra / Moniteur → session + commandes typées
                          ↓
                 RelaisCameraEngine
                          ↓
          session native VisionCamera v5
              AVFoundation / CameraX
                 propriétaire unique
                   ├─ fichier local pleine qualité
                   └─ buffers preview réduits
                          ↓ natif seulement
                WebRTC custom VideoSource
                          ↓ P2P LAN
                   RTCView Moniteur

DataChannel : commandes, ACK, état et capacités Caméra
HTTP LAN + QR : SDP / ICE uniquement
```

## Frontières

| Dossier                          | Responsabilité                                                          |
| -------------------------------- | ----------------------------------------------------------------------- |
| `app/`                           | Routes expo-router ; aucun accès direct au capteur                      |
| `src/domain/`                    | Types JSON, commandes ; zéro UI et zéro natif                           |
| `src/session/`                   | Machine d'état pure et store Zustand                                    |
| `src/signaling/`                 | Descripteur QR versionné, validation LAN et client HTTP                 |
| `src/transport/`                 | Contrat preview et DataChannel ; aucun capturer produit JS              |
| `src/camera/api.ts`              | Interface publique unique du moteur et events                           |
| `src/camera/native/`             | Adaptateur JS vers le module Expo natif                                 |
| `src/camera/web/`                | Stub web explicite                                                      |
| `src/monitor/`                   | Commandes Moniteur ; ACK requis avant de déclarer une rec               |
| `src/capabilities/`              | Validation des capacités et des combinaisons de qualité                 |
| `src/design/`, `src/components/` | Tokens et composants UI minimaux                                        |
| `modules/relais-camera-engine/`  | Binding Expo Modules, Swift, Kotlin, fixture commune                    |
| `src/spikes/webrtc-preview/`     | Expérience jetable getUserMedia ; jamais importée par le produit        |
| `scripts/`                       | Prebuild, builds, signaling LAN du spike et vérification des frontières |
| `tests/`, `e2e/`                 | Invariants et protocoles device lab/testdroid                           |

## Propriété du capteur

VisionCamera v5 est installée comme fondation native, mais aucune Camera View produit n'est montée à ce stade. Le futur module Relais doit étendre la session VisionCamera et ses outputs natifs ; il ne doit pas ouvrir sa propre session en parallèle. L'accès aux objets de session et à la VideoSource WebRTC reste à prouver par le prochain spike. Le scanner QR a un cycle court, terminé avant toute acquisition vidéo.

`RelaisCameraEngine` expose `getCapabilities`, `configure`, `startPreview`, `stopPreview`, `startRecording`, `stopRecording`, et les événements `thermal`, `battery`, `droppedFrames`, `recordingStarted`, `error`. `stopRecording` devra résoudre avec le chemin local seulement après finalisation du fichier. Le stub renvoie des capacités fictives explicites et refuse les opérations de capture ; il ne crée aucun fichier.

## Cycle de vie

Session : `idle → pairing → connected → reconnecting → connected`, puis fermeture explicite. Le rôle est fixé au début de la session. Les états d'enregistrement `idle / starting / recording / stopping / failed` sont indépendants. Les commandes nécessiteront un identifiant, déduplication et ACK contenant l'état natif confirmé. Le Moniteur ne devient jamais « REC » sur un simple clic.

Une perte réseau conserve la rec locale. Le futur reconnect reprend l'état autoritaire Caméra avant de réactiver les commandes. La fermeture explicite d'une session enregistrant doit attendre un stop/finalize confirmé. Background Caméra non pris en charge en V1 ; tester les interruptions OS et remonter une erreur explicite.

## Fondation et limites

Les écrans produit sont une maquette navigable : QR de démonstration, preview placeholder, Rec désactivé et réglages sur fixture. Le spike a sa propre session et son propre écran dev. Son serveur Node de signaling tourne sur un ordinateur du LAN, ne transporte aucun média, expire ses sessions et ne persiste rien. C'est une dérogation de spike : le produit devra héberger le signaling sur la Caméra pour fonctionner à deux téléphones seuls.

Aucune dette cachée en mode compatibilité : versions exactes, pas de désactivation de la New Architecture. Un bundle Metro ou un prebuild n'est pas une compilation Xcode/Gradle. Voir `STATUS.md` pour les preuves disponibles.
