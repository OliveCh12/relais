import { AppText, Screen } from '@/components/ui';
import { QualitySettings } from '@/components/QualitySettings';
import { useCapabilities } from '@/capabilities/useCapabilities';

export default function SettingsScreen() {
  const { capabilities, error } = useCapabilities();
  return (
    <Screen>
      {capabilities ? (
        <QualitySettings capabilities={capabilities} />
      ) : (
        <AppText>{error ?? 'Lecture des capacités…'}</AppText>
      )}
    </Screen>
  );
}
