import { View } from 'react-native';
import { useCapabilities } from '@/capabilities/useCapabilities';
import { QualitySettings } from '@/components/QualitySettings';
import { AppText } from '@/components/ui';
import { useAppTheme } from '@/design/useAppTheme';

export default function SettingsScreen() {
  const { capabilities, error } = useCapabilities();
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {capabilities ? (
        <QualitySettings capabilities={capabilities} />
      ) : (
        <AppText>{error ?? 'Reading capabilities…'}</AppText>
      )}
    </View>
  );
}
