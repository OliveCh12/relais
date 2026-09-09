# Énergie et performance

Budgets d'acceptation, aucune mesure matérielle acquise dans la fondation.

| Métrique                   | Budget V1 local                                                   |
| -------------------------- | ----------------------------------------------------------------- |
| Pairing réussi             | < 15 s depuis affichage QR jusqu'à DataChannel ouvert             |
| Premier frame Moniteur     | < 2 s après connexion, à mesurer sur rendu                        |
| Preview glass-to-glass p95 | < 300 ms                                                          |
| Preview                    | 720p30 défaut, 1080p30 maximum                                    |
| Bitrate preview            | ≤ 6 Mbps ; cible initiale 2,5 Mbps                                |
| Fichier local              | 4K30 si validé, sinon 1080p60 puis 1080p30                        |
| Frames fichier perdues     | 0 hors thermal critique                                           |
| CPU Moniteur               | Décodage matériel vérifié par profiling                           |
| Chauffe Caméra             | Réduire preview avant qualité fichier                             |
| Batterie après 20 min      | > 20 % en partant de 80 %, cible initiale peu exigeante à affiner |

## Instrumentation du spike

Ping/echo DataChannel avec horloge monotone du même téléphone : RTT courant. Le Moniteur lit `inbound-rtp` via getStats : fps reçu/décodé, frames décodées, débit reçu quand disponibles. Les champs non fournis restent « — ». Un RTT bas ne démontre pas une faible latence vidéo. Les timestamps capture/rendu de deux appareils ne se soustraient pas sans synchronisation et estimation d'erreur.

Le spike demande 720p30, audio OFF, H.264 en priorité et maxBitrate 2,5 Mbps/maxFramerate 30 sur le sender lorsque supporté. La négociation effective peut différer : consigner stats et codec. Un seul RTCView, pas de filtre JS, pas de flux fichier. Ni fps ni RTT ne doivent être remplis par des valeurs arbitraires.

## Protocole matériel

1. Départ 80 % batterie, même luminosité basse, température ambiante notée, appareils hors charge. Relever modèles, OS, réseau, distance, codec et versions.
2. Tester les deux directions sur box puis hotspot Caméra, internet coupé. Mesurer dix pairings froids et chauds.
3. Filmer une horloge/clignotement et le Moniteur côte à côte avec une troisième caméra rapide. Échantillonner au moins 100 transitions ; publier p50/p95/max et méthode. Distinguer premier paquet, première frame décodée et première frame rendue.
4. Session 20 min : batterie, thermal, fps, débit toutes les 10 s. Instruments/Perfetto pour encode/decode HW, CPU/GPU et copies mémoire.
5. Après injection native : répéter avec fichier 4K30 puis 4K60/stab si supporté. Vérifier durée, piste audio, timestamps, décodage intégral et drops du fichier.

## Dégradation

Au premier niveau pressure sérieux : 30 → 24 → 15 fps preview ; puis 1080 → 720 → 480 ; retirer overlays coûteux. Au niveau critique, prévenir et proposer réduction du fichier uniquement après avoir sacrifié le preview. Ne pas changer format/aspect en plein fichier sans politique explicite de finalisation. Si l'OS coupe le capteur, remonter l'interruption et finaliser au mieux ; ne pas prétendre garantir zéro drop.

La politique thermique native et les events batterie/droppedFrames restent à implémenter. Le keep-awake protège uniquement de la veille automatique, pas du background ni de l'arrêt OS.
