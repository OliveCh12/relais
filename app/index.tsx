import { router } from 'expo-router';
import { AppText, Badge, Button, Card, Screen } from '@/components/ui';
import { useSessionStore } from '@/session/store';
import type { Role } from '@/domain/camera';

export default function HomeScreen() {
  const dispatch = useSessionStore((state) => state.dispatch);
  const chooseRole = (role: Role) => {
    dispatch({ type: 'close' });
    dispatch({ type: 'choose-role', role });
    router.push('/pairing');
  };
  return (
    <Screen>
      <Badge>RELAIS · FONDATION</Badge>
      <AppText variant="title">Un téléphone filme.{'\n'}L’autre cadre.</AppText>
      <AppText variant="muted">Choisissez le rôle de ce téléphone.</AppText>
      <Card>
        <AppText variant="label">01 / SUR LE TRÉPIED</AppText>
        <AppText variant="heading">Caméra</AppText>
        <AppText variant="muted">
          Le fichier restera sur ce téléphone. Gardez-le au premier plan.
        </AppText>
        <Button
          testID="choose-camera"
          label="Utiliser comme Caméra"
          onPress={() => chooseRole('camera')}
        />
      </Card>
      <Card>
        <AppText variant="label">02 / DANS LA MAIN</AppText>
        <AppText variant="heading">Moniteur</AppText>
        <AppText variant="muted">
          Cadrez et contrôlez la prise depuis l’autre côté de l’objectif.
        </AppText>
        <Button
          testID="choose-monitor"
          label="Utiliser comme Moniteur"
          secondary
          onPress={() => chooseRole('monitor')}
        />
      </Card>
      <AppText variant="muted">Maquette navigable · Capture et connexion produit à venir.</AppText>
      {__DEV__ && (
        <Button
          label="Ouvrir le spike WebRTC"
          secondary
          onPress={() => router.push('/dev/webrtc')}
        />
      )}
    </Screen>
  );
}
