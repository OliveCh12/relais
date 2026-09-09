# Device lab / Testdroid

Tests matériels manuels pour la fondation. Aucun runner cloud ni compte créé.

- Android : `pnpm build:android -PreactNativeArchitectures=arm64-v8a` produit `android/app/build/outputs/apk/debug/app-debug.apk`.
- iOS Simulator : `pnpm build:ios` produit l'app dans `.native-tools/ios-build/Build/Products/Debug-iphonesimulator/`.
- iPhone réel : `pnpm ios --device` ; sélectionner une équipe Apple dans Xcode pour la signature. Export IPA device signé requis pour Testdroid/Bitbar, le .app simulateur ne suffit pas.
- Tests de fumée : accueil → Caméra → QR démo → écran Caméra → qualité → retour ; puis Moniteur → QR démo → preview placeholder → sheet Réglages. Rec reste désactivé.
- Identifiants accessibles : `choose-camera`, `choose-monitor`, `open-demo` ; compléter le runner Appium lors de la première intégration farm.
- Tests transport : suivre `docs/pairing.md`. Un émulateur ne valide pas les capteurs, la chauffe, le LAN inter-OS ni le fichier.
- Artefacts ignorés dans `e2e/artifacts/` : logs de build, captures, mesures CSV et rapport daté avec device/OS/network. Ne pas y inclure tokens ou SDP réels.
