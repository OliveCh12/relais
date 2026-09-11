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
              'Use one phone as the camera and another as its remote control. Open Camera to film, or Monitor to see the live view and control a saved camera.',
            rows: [],
          },
          {
            title: 'Your captures',
            footer:
              'Take photos, start or stop videos, and adjust the camera from your monitor. Full-quality originals stay in the camera phone’s gallery. The monitor receives a live preview, not a copy of the saved media.',
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
