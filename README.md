# Relais

Un téléphone Caméra, un téléphone Moniteur. Fondation React Native iOS/Android : navigation sombre, profils mock, module caméra Swift/Kotlin et spike WebRTC jetable. **Aucun enregistrement réel.**

Lire [STATUS.md](STATUS.md) pour les résultats de build et les limites exactes.

## Démarrer

```sh
mise trust
mise install
direnv allow
pnpm install --frozen-lockfile
pnpm start
```

Un **Expo Dev Client compilé** est requis sur téléphone ; Expo Go ne contient pas les modules natifs. `pnpm web` permet de parcourir les écrans avec un stub web.

```sh
pnpm prebuild                 # CNG iOS + Android ; sans pod install ni compilation
pnpm ios                      # Xcode + CocoaPods requis
pnpm ios --device             # iPhone connecté ; signature Apple à configurer
pnpm android                  # Android Studio + SDK + device/émulateur
pnpm build:android -PreactNativeArchitectures=arm64-v8a
pnpm build:ios                # Build iOS Simulator sans signature device
pnpm check                    # TS strict, lint, 11 tests, frontières, format
pnpm bundle                   # Exports Metro production iOS/Android/web
pnpm run doctor               # Expo Doctor (pnpm doctor est une commande différente)
pnpm spike:signaling           # Serveur éphémère sur le LAN, port 8787
```

`ios/` et `android/` sont générés et ignorés. Expo SDK 57 les régénère par défaut ; placer toute modification native durable dans `modules/` ou `app.config.ts`. Ne pas éditer les sorties CNG à la main. Android utilise le JDK 17 de mise et `ANDROID_HOME` (par défaut `~/Library/Android/sdk`). Installer les SDK via Android Studio ; Gradle télécharge les composants manquants dont les licences sont déjà acceptées.

## Couple de versions verrouillé

| Couche                                  | Version                                   |
| --------------------------------------- | ----------------------------------------- |
| Node / pnpm                             | 24.20.0 / 11.25.0                         |
| Java                                    | Temurin 17.0.20+101 (runtime 17.0.20.1+1) |
| Expo / React Native / React             | 57.0.21 / 0.86.3 / 19.2.3                 |
| Expo Router / Dev Client                | 57.0.20 / 57.0.18                         |
| VisionCamera                            | 5.2.3                                     |
| Nitro Modules / Nitro Image             | 0.37.1 / 0.15.2                           |
| WebRTC / config plugin                  | 124.0.8 (M124) / 15.0.2                   |
| Worklets / Reanimated / Gesture Handler | 0.10.1 / 4.5.1 / 2.32.0                   |
| TypeScript / ESLint / Prettier          | 6.0.3 / 9.39.5 / 3.9.6                    |

RN 0.87.1 était disponible à la création, mais Expo stable 57 prend en charge RN 0.86.3. Ce couple supporté est retenu ([notes Expo 57](https://expo.dev/changelog/sdk-57)). La New Architecture reste activée. Ne pas upgrader RN/Expo, VisionCamera et WebRTC en même temps.

VisionCamera 5.2.3 embarque CameraX **1.7.0-alpha03** : c'est un risque de validation matériel consigné dans O18/O20, pas une garantie de compatibilité Pixel. Les versions transitoires sont fixées par le lockfile. ESLint 9 est conservé pour les peers des plugins Expo/React ; sa mise à jour attend leur compatibilité ESLint 10.

`patches/react-native-webrtc@124.0.8.patch` restaure uniquement l'export d'une déclaration TypeScript omise du paquet publié ; il référence les types déjà fournis dans `src/vendor`. Aucun code runtime WebRTC n'est modifié. La présence de WebRTC dans React Native Directory reste marquée non testée sur New Architecture ; voir les preuves réelles dans STATUS.

## Écrans et contrats

- Accueil : Caméra ou Moniteur, une seule app.
- Pairing : QR de démonstration et scanner, navigation explicite sans fausse connexion.
- Caméra : placeholder, keep-awake, consigne premier plan, lecture réelle du bridge stub.
- Moniteur : placeholder, batterie inconnue, Rec désactivé, feuille Réglages sur fixture distante simulée.
- Qualité : optique/résolution/fps liés ; HDR absent des profils sans support.
- `/dev/webrtc` : spike dev uniquement ; redirection vers l'accueil en release.

`RelaisCameraEngine` est la seule frontière caméra JS. Ses capacités indiquent `source: stub`, `canRecord: false`, `canPreview: false`. Les autres méthodes rejettent explicitement l'appel ; aucun chemin de fichier fictif ni événement rec réussi. Les deux modules natifs chargent la même fixture JSON.

## Spike 0 et device lab

Le spike demande **deux téléphones et un Mac sur le LAN**. Le Mac gère uniquement le signaling HTTP, le média va directement de Caméra à Moniteur. Serveur natif sur Caméra et autonomie complète à deux téléphones = étape suivante. Le spike utilise getUserMedia dans son seul dossier autorisé, audio OFF, preview 720p30 demandé, H.264 préféré, limite sender 2,5 Mbps si acceptée.

Depuis l'accueil dev, ouvrir le spike sur chaque téléphone. Caméra saisit l'URL affichée par `pnpm spike:signaling`, crée la session et montre le QR. Moniteur scanne puis rejoint. `ping` mesure le RTT ; `rec-mock` confirme un écho sans enregistrer. Fermer ou passer en background libère les ressources. Pas de reconnexion automatique dans ce spike. Le RTT n'est pas une mesure de latence vidéo.

- [ ] iPhone 17 Pro (OS exact relevé), Pixel 11 Pro (OS réellement installé).
- [ ] iPhone Caméra → Pixel Moniteur puis sens inverse.
- [ ] Box commune, hotspot Caméra dans les deux sens, internet coupé.
- [ ] Refus caméra/LAN, QR invalide/expiré, background, fermeture.
- [ ] Après injection native : coupure Wi-Fi 5 s pendant rec → fichier intact, preview retrouvé.

Protocoles détaillés : [pairing](docs/pairing.md), [énergie et performance](docs/energy-and-perf.md), [device lab/Testdroid](e2e/README.md).

## Documents de décision

[Architecture](docs/architecture.md) · [25 obstacles priorisés](docs/obstacles.md) · [Matrice de capacités](docs/capability-matrix.md) · [Règles agents](AGENTS.md).

Prochain travail précis : prouver l'injection native VisionCamera v5 → VideoSource WebRTC avec un seul propriétaire du capteur, avant toute vraie rec. Comptes, cloud média, livestream, SFU, multicam et publication Store restent hors scope.
