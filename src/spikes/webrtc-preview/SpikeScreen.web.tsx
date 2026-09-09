import { AppText, Screen } from '../../components/ui';

export default function SpikeScreen() {
  return (
    <Screen>
      <AppText variant="heading">Spike réservé au Dev Client</AppText>
      <AppText variant="muted">
        Utilisez deux téléphones iOS/Android. Le web permet de consulter les écrans squelette.
      </AppText>
    </Screen>
  );
}
