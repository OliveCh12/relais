import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsPage } from '@/components/SettingsPage';
import { useAppTheme } from '@/design/useAppTheme';
export default function About() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom }}>
      <SettingsPage
        sections={[
          {
            title: 'Two phones, one camera',
            footer:
              'Open Camera on one phone and Monitor on the other. Add your camera once, then find it in My cameras.',
            rows: [],
          },
          {
            title: 'Your captures',
            footer:
              'Take photos and start or stop videos from either phone. Originals are saved in the camera phone’s gallery.',
            rows: [],
          },
          {
            title: 'Test version',
            footer:
              'Keep both apps open on the same Wi-Fi network. The Mac currently prepares the connection.',
            rows: [],
          },
        ]}
      />
    </View>
  );
}
