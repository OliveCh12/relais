# Matrice de capacités

Matrice de validation, **pas un relevé matériel**. Aucun iPhone 17 Pro ou Pixel 11 Pro n'a encore été interrogé. « À détecter » vaut non exposé dans l'UI tant que le moteur n'a pas renvoyé une combinaison valide. Les spécifications de l'app caméra constructeur ne prouvent pas l'accès tiers.

| Feature | iPhone 17 Pro / iOS 26–27 | Pixel 11 Pro / Android 16–17 | API / apps tierces ? | Relais V1 | Fallback générique iOS / Android |
| --- | --- | --- | --- | --- | --- |
| Rec locale + preview | À tester simultanément | À tester simultanément | AVFoundation / CameraX use cases ; oui selon combinaison | Oui cible, stub non | 1080p30 + preview 720p ; refuser combinaison invalide |
| 4K30 / HEVC | À détecter activeFormat + codec | À détecter profils encoder | AV capture formats / CameraX QualitySelector ; conditionnel | Oui si validé | 1080p60 puis 1080p30, H.264 |
| 4K60/120 | Non présumé | Non présumé | Formats/fps/encoder ; conditionnel | Option ultérieure, pas fondation | 4K30 ou 1080p30 |
| Ultra-wide/wide/tele | Inventaire natif requis | Logical/physical IDs requis | DiscoverySession / CameraManager ; oui selon device | Oui cible | Caméra arrière par défaut |
| Zoom 2x/8x | Ne pas assimiler à une optique | Plage logique à détecter | videoZoomFactor / zoomRatio ; conditionnel | Oui cible | Zoom 1x |
| Torch / expo | Par optique | Par optique | hasTorch, formats / CameraControl ; conditionnel | Oui cible | Contrôle absent ; AE auto |
| HDR / Dolby Vision | Formats et espace couleur à vérifier | DynamicRange + combinaison à vérifier | AVFoundation / CameraX ; conditionnel | HDR uniquement si combo validée | SDR |
| ProRes / Log 2 | Format/codec/stockage à vérifier | ProRes non proposé | AVFoundation ; conditionnel, pas preuve pour Log 2 | Non fondation | HEVC, puis H.264 |
| Pro Video Storage | API iOS 27 à confirmer par SDK et guards | Non applicable | AVProVideoStorage/usesProVideoStorage à vérifier localement | Non fondation | Écriture locale classique, contrôle espace |
| Deferred Start | isDeferredStartSupported requis | Pas d'équivalence supposée | AVCaptureOutput ; public sur OS compatible | Optimisation future | Préparer outputs avant start |
| Dual Capture | isMultiCamSupported + coûts requis | Pas de parité présumée | AVCaptureMultiCamSession / concurrent cameras ; conditionnel | Non | Une caméra |
| Center Stage / aspect carré | Formats front concernés seulement | Non présumé | supportedDynamicAspectRatios ; conditionnel | Non dynamique pendant rec | Aspect fixé 9:16 |
| HDR + 60 + stabilisation | Combinaison activeFormat | Feature Groups à valider | CameraX session support ; conditionnel | Seulement après preuve | Retirer options, priorité fichier |
| Hybrid AE / temp-tint / RAW14 | Non requis | À vérifier par SDK/device | Camera2/CameraX capabilities ; pas une promesse Pixel | Non fondation | AE/AWB auto, vidéo standard |
| Extensions / Video Boost / Magic Capture | Non applicable | App stock ≠ API publique | isExtensionSupported ; fonctions stock non garanties | Non | Pipeline standard |
| H.264 HW preview | Encode/decode à mesurer | Encode/decode à mesurer | WebRTC factories + codec négocié ; conditionnel | Oui cible | Échec explicite si budget impossible |
| Thermal / batterie | ProcessInfo / pressure + UIDevice | PowerManager thermal + BatteryManager | Oui selon OS | Events contrat, stub silencieux | Valeur inconnue, ne pas inventer |
| LAN sans internet | Permission iOS | INTERNET ou permission target 37 | Sockets locaux ; oui avec permission/topologie | Oui cible | Message AP isolé, changer de réseau |

Le moteur expose les `fileQualities` **dans chaque optique**, avec résolution/fps/HDR/codec liés. Les fixtures incluent uniquement des profils de démonstration et n'activent jamais `canRecord` ni `canPreview`. L'exposition des contrôles HDR/torch dépend du résultat, et les libellés mock restent visibles.
