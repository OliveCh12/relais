# SPIKE 0 — WebRTC preview

**THROW AWAY — not the product camera pipeline**

Seul dossier autorisé à ouvrir getUserMedia. Audio OFF, aucune rec, aucune dépendance au moteur produit. Point d'entrée `/dev/webrtc`, accessible seulement en dev ; écran web explicite sans import natif.

Serveur Node local : `pnpm spike:signaling`. Deux Dev Clients sur le même LAN, Caméra saisit l'URL du Mac et affiche un QR ; Moniteur scanne. SDP avec ICE host rassemblés avant publication (pas de trickle). Le QR ne contient pas le SDP. Aucun STUN/TURN/cloud.

`session.ts` possède la peer connection, les tracks et les timers. Quitter l'écran/background/échec ferme les ressources. La permission caméra iOS peut rendre l'app inactive temporairement : seul background ferme le spike. Le scanner est démonté avant de lancer la connexion Moniteur. Un échec réseau exige une nouvelle session : aucune reconnection produit prétendue ici.

RTT ping/pong mesuré avec `performance.now` sur un seul device. Stats inbound vidéo toutes les secondes ; valeurs manquantes affichées « — ». `rec-mock` est un écho, jamais une action caméra. Voir `docs/pairing.md` et `docs/energy-and-perf.md` pour la validation sur matériel.
