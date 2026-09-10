import { AppText, Screen } from '../../components/ui';

export default function SpikeScreen() {
  return (
    <Screen>
      <AppText variant="heading">Live preview requires Dev Client</AppText>
      <AppText variant="muted">
        Use two iOS/Android phones. The web shows the prototype screens.
      </AppText>
    </Screen>
  );
}
