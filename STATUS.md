# État de la fondation — 9 septembre 2026

**Fondation runnable ; Android compilé et démarré. iOS généré et bundlé, compilation native encore bloquée par l'absence de Xcode/CocoaPods. Aucun enregistrement réel.**

## Livré

- Projet Git local, documentation d'architecture écrite et commitée avant le code.
- Les 25 obstacles priorisés avec statut, owner, stratégie, métrique et risque ; matrice de capacités non présentée comme un relevé matériel.
- Expo SDK 57 / RN 0.86.3, TypeScript strict, pnpm workspace à une seule app, versions exactes et lockfile, JDK 17 via mise.
- Accueil Caméra/Moniteur, pairing QR de démonstration/scanner, placeholders, Rec désactivé, feuille Réglages et écran qualité sur combinaisons mock.
- `RelaisCameraEngine` : interface JS unique, autolinking Swift/Kotlin, fixture JSON commune. `getCapabilities()` fonctionne sur Android ; opérations capture rejetées explicitement, events déclarés sans faux événements.
- Spike séparé : getUserMedia uniquement dans son dossier, QR, signaling LAN éphémère sur Mac, SDP/ICE host, RTCView, DataChannel ping/rec-mock, RTT et stats inbound, libération au départ/background.
- Scripts build/prebuild/validation, protocoles device lab et dossiers d'artefacts prêts pour Testdroid/Bitbar.

## Preuves

| Vérification                          | Résultat                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict + ESLint + Prettier | Passent via `pnpm check`                                                                                                                                       |
| Tests                                 | 11/11, dont serveur HTTP réel sur loopback : auth par rôle, publication unique, expiration, payload borné                                                      |
| Frontières architecture               | Test statique : domaine pur, aucun import spike/capturer dans le produit                                                                                       |
| Peers pnpm                            | Aucun conflit                                                                                                                                                  |
| Prebuild iOS + Android                | Réussi ; modules locaux détectés sur les deux plateformes                                                                                                      |
| Metro production                      | iOS Hermes, Android Hermes, web générés ; marqueurs spike et rec-mock absents des bundles natifs release                                                       |
| Metro dev                             | iOS et Android générés avec le spike                                                                                                                           |
| Android natif                         | `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a` : BUILD SUCCESSFUL, 600 tâches, 4 min 48 s lors de la validation                                     |
| APK                                   | 112 MiB environ, arm64, contient libVisionCamera/libNitro/libWebRTC et `assets/capabilities.json`                                                              |
| Runtime Android                       | Installation et lancement OK sur AVD Pixel_10, Android 16/API 36, image 36.1/arm64 ; route Réglages affiche les profils issus de Kotlin, route spike se charge |
| Runtime web                           | Parcours Caméra et Moniteur vérifiés ; profils masqués selon l'optique, Rec désactivé, sheet navigable                                                         |
| iOS natif                             | **Non compilé** : Xcode absent, CocoaPods absent. Autolinking et bundle JS ne remplacent pas ce build                                                          |
| Expo Doctor                           | 19/21 contrôles passent. Réserves laissées visibles : tooling CocoaPods ; metadata WebRTC New Architecture et module local non publié                          |
| iPhone / Pixel réels                  | Non disponibles ; pairing croisé, preview et rec matérielle non testés                                                                                         |

Copie locale de l'APK : `e2e/artifacts/relais-debug-arm64.apk`. Logs et captures de validation dans `e2e/artifacts/`, ignorés par Git. Les sources Swift/Kotlin et la fixture sont suivies par Git ; les sorties CNG et Gradle ne le sont pas.

## Limites à conserver visibles

1. Produit : aucune session caméra native réelle, injection de frames, rec, commande distante, reconnexion ou mesure thermique. Les capacités sont explicitement fictives.
2. Spike : nécessite un Mac LAN en plus des deux téléphones ; pas encore de signaling hébergé sur la Caméra, pas de validation hotspot autonome. HTTP/token LAN n'est pas une authentification forte.
3. Pas de promesse 4K, p95 < 300 ms, pairing < 15 s, decode matériel ou budget batterie : ce sont des critères d'acceptation documentés, pas des résultats.
4. Compatibilité iOS, WebRTC New Architecture sur device, intégration de CameraX 1.7 alpha embarquée par VisionCamera, permissions target Android 37 et APIs iOS 27 restent à valider.
5. L'APK est un Dev Client debug arm64, nécessite Metro pour charger le JS ; ce n'est ni un binaire Store ni un build autonome de production.

## Prochain spike exact : injection native

Créer une expérience distincte de `webrtc-preview` sans getUserMedia : **une session VisionCamera v5 → output natif réduit → VideoSource WebRTC**, d'abord 720p30 SDR/H.264, audio OFF.

- Identifier et documenter l'extension native v5 qui donne accès aux buffers/session existants. Si v5 ne permet pas l'ownership partagé requis, documenter ce blocage avant d'ouvrir une autre session.
- iOS : buffers AVFoundation vers RTCVideoFrame/VideoSource, timestamps de la clock native conservés ; gestion retain/release et rotation.
- Android : ImageProxy/CameraX vers capturerObserver.onFrameCaptured ; conversion YUV native bornée, fermeture de chaque buffer, aucune copie vers JS.
- Valider un seul open device, pas de fuite après 20 min, backpressure qui sacrifie le preview, puis iPhone ↔ Pixel dans les deux sens.
- Ajouter ensuite le writer local au même propriétaire ; vérifier 20 cycles start/stop et coupure réseau 5 s avec fichier intact. Aucun vrai fichier avant cette preuve de propriété unique.

Prérequis immédiat pour compléter la validation de fondation : installer Xcode complet et CocoaPods, lancer `pnpm build:ios`, puis un Dev Client sur iPhone réel. L'installation de Xcode n'a pas été lancée automatiquement.
