# Relais — règles de fondation

- App unique iOS/Android, rôle Caméra ou Moniteur. Expo CNG + Dev Client, jamais Expo Go.
- pnpm, TypeScript strict, versions exactes, commits SSH signés. Docs en français, code en anglais.
- Le capteur a UN propriétaire natif : session VisionCamera v5 (AVFoundation/CameraX), pilotée uniquement par `RelaisCameraEngine`. Ne pas créer une deuxième session dans le module Relais.
- Le fichier local sort du pipeline natif. Le preview réduit sort vers une VideoSource WebRTC native. Aucune frame ne traverse JS ; aucun enregistrement du flux WebRTC.
- `getUserMedia` est autorisé uniquement dans `src/spikes/webrtc-preview/`. Aucun import du spike depuis le produit ; entrée dev séparée et interdite en release.
- `expo-camera` ne sert qu'au QR ; démonter le scanner avant d'ouvrir la caméra WebRTC ou produit.
- La rec locale et l'état du transport ont des cycles de vie distincts. Une déconnexion ne commande jamais stopRecording.
- Le stub annonce `source: stub`, `canRecord: false`, `canPreview: false`. Ne pas simuler un fichier réussi, un device détecté, un build natif ni une mesure de latence.
- Les réglages sont des combinaisons valides par optique, pas le produit cartésien de listes indépendantes. Revalider côté natif avant chaque configure.
- Les capacités viennent du téléphone Caméra ; ne pas utiliser celles du Moniteur pour piloter la Caméra. Fixtures clairement identifiées tant que l'échange n'est pas branché.
- Ne pas upgrader Expo/RN, WebRTC et VisionCamera ensemble. Vérifier O20 et consigner les versions et résultats dans STATUS.md.
- `ios/` et `android/` sont générés. Les modifications durables vont dans les plugins de configuration et `modules/`.
- Stop fondation : docs, navigation squelette, bridge stub, spike isolé, contrôles TS/lint/tests/bundles/prebuild. Les builds natifs et essais matériels restent distincts ; signaler tout prérequis manquant.
- Hors scope : comptes, média cloud, SFU/TURN, diffusion publique, multicam produit, traitement couleur, publication Store.
