# Pairing et device lab

## Produit cible

Caméra héberge un petit serveur LAN ; QR versionné contenant adresse privée, session éphémère et token. Moniteur scanne, ferme son scanner, puis échange SDP/ICE. Média WebRTC P2P avec ICE host only, sans internet/STUN public/TURN. Hotspot Caméra à tester, pas garanti : isolation clients, routage entre hôte et client et adresses diffèrent selon OS. Bonjour pourra découvrir un service précis ; aucun service n'est annoncé dans cette fondation.

Commandes produit sur DataChannel : ID, action, ACK, état autoritaire et erreurs. L'enregistrement ne dépend jamais du canal réseau. Le QR de l'écran produit est une démonstration explicitement marquée, non accepté par le spike.

## Spike 0 livré

`THROW AWAY — not the product camera pipeline`.

Un Mac du même LAN héberge `pnpm spike:signaling`. Le terminal affiche son adresse privée et son port. Autoriser le port 8787 sur le pare-feu si nécessaire. Les deux téléphones utilisent un Dev Client compilé et ouvrent « Spike WebRTC » depuis l'accueil dev.

1. Caméra : saisir l'URL HTTP privée affichée par le serveur ; lancer « Créer une session ». Autoriser caméra. Le QR apparaît après création de l'offre.
2. Moniteur : scanner ce QR ; le scanner doit disparaître avant connexion. Le flux distant s'affiche après échange SDP/ICE ; aucun accès micro.
3. Moniteur : envoyer `ping`, puis `rec-mock`. Le premier affiche le RTT ; le second confirme un écho sans commencer de rec.
4. Quitter l'écran ou passer en background libère tracks, peer connection et timers. Créer un nouveau QR après expiration/déconnexion. Reconnexion automatique hors spike 0.

Le serveur ne transporte que SDP/ICE, conserve les sessions en mémoire 10 min, borne leur nombre et taille, et sépare les tokens Caméra/Moniteur. QR refusés si format, version, IP privée, session, token ou expiration invalides. Pas de journal des tokens/SDP, pas de médias stockés. HTTP sur LAN n'est pas une authentification forte ; rester sur un réseau de test maîtrisé. La suppression active à la fermeture Caméra et l'expiration libèrent l'état.

Le serveur Mac est un écart de spike explicite. Le fonctionnement autonome à deux téléphones demandera un serveur natif sur Caméra et une validation hotspot indépendante. Le RTT affiché n'est pas la latence glass-to-glass.

## Trois scénarios d'acceptation

| Scénario | Procédure | Attendu / état fondation |
| --- | --- | --- |
| iPhone Caméra → Pixel Moniteur | Box Wi-Fi, QR, preview 20 min, ping/rec-mock ; répéter hotspot | Pairing < 15 s, frame < 2 s, vidéo p95 < 300 ms ; à mesurer |
| Pixel Caméra → iPhone Moniteur | Même séquence inverse ; permissions refusées puis accordées | Même budgets, pas d'écran bloqué ; à mesurer |
| Wi-Fi perdu 5 s pendant rec | Après pipeline natif : lancer vrai fichier, couper Wi-Fi, rétablir, resynchroniser puis Stop | Fichier intact, preview revient, aucune commande Stop issue de la perte réseau. Invariant unitaire maintenant ; scénario matériel bloqué par stub |

## Device lab / testdroid-ready

- [ ] iPhone 17 Pro, iOS 26 puis 27 si disponible ; relever build OS exact.
- [ ] Pixel 11 Pro, Android 16/17 selon images réellement disponibles ; ne pas supposer qu'un OS antérieur est installable.
- [ ] iOS Simulator et Android emulator : navigation/permissions/stub, aucune conclusion sur qualité capteur.
- [ ] Device réel USB : build signé, démarrage, appel natif getCapabilities.
- [ ] Même box ; hotspot de chaque téléphone ; AP isolation ; internet débranché.
- [ ] Refus caméra/LAN, révocation, QR invalide/expiré, session quittée et background.
- [ ] Logs et captures anonymisés dans `e2e/artifacts/` (ignoré par git).

Les scripts de build préparent les binaires. `e2e/README.md` définit le dépôt d'artefacts et le protocole de fumée à porter dans Testdroid/Bitbar ; aucune CI device farm n'est créée.
