import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { AppText, Badge, Button, Card, PreviewPlaceholder, Screen } from '@/components/ui';
import { useCapabilities } from '@/capabilities/useCapabilities';

export default function CameraScreen() {
  useKeepAwake();
  const { capabilities, error } = useCapabilities();
  return (
    <Screen>
      <Badge>CAMÉRA · NON CONNECTÉE</Badge>
      <PreviewPlaceholder label="PREVIEW CAMÉRA" />
      <Card>
        <AppText variant="heading">Ne pas quitter l’app</AppText>
        <AppText variant="muted">
          Pendant une session, ce téléphone gardera le fichier local. Le capteur n’est pas ouvert
          dans cette fondation.
        </AppText>
      </Card>
      <AppText variant="muted">
        {error ??
          (capabilities
            ? 'RelaisCameraEngine répond · capacités mock · capture désactivée'
            : 'Lecture du module caméra…')}
      </AppText>
      <Button
        label="Voir les profils de qualité"
        secondary
        onPress={() => router.push('/settings')}
      />
    </Screen>
  );
}
