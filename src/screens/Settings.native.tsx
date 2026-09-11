import { Alert, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsPage } from '@/components/SettingsPage';
import type { SettingsPageProps } from '@/components/SettingsPage.types';
import { useAppTheme } from '@/design/useAppTheme';
import { appPreferences, detectedServer, usePreferences } from '@/preferences/usePreferences';
import { qualityOptions } from '@/preferences/Preferences';

export default function SettingsScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const preferences = usePreferences();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const open = (page: string) => router.push({ pathname: '/app-settings', params: { page } });
  const report = (error: unknown) =>
    Alert.alert('App settings', error instanceof Error ? error.message : 'Please try again.');
  const title =
    page === 'quality'
      ? 'Preferred quality'
      : page === 'connection'
        ? 'Connection settings'
        : 'Settings';
  let sections: SettingsPageProps['sections'];
  if (!preferences.loaded)
    sections = [
      {
        title: preferences.error ? 'Settings unavailable' : 'Loading settings…',
        footer: preferences.error,
        rows: preferences.error
          ? [
              {
                kind: 'action',
                label: 'Try again',
                onPress: () => {
                  void appPreferences.load().catch(report);
                },
              },
            ]
          : [],
      },
    ];
  else if (page === 'quality')
    sections = [
      {
        title: 'Original video on the camera phone',
        rows: qualityOptions.map((option) => ({
          kind: 'option',
          label: option.label,
          subtitle: option.subtitle,
          selected: preferences.value.quality === option.value,
          onPress: () => {
            void appPreferences.update({ quality: option.value }).catch(report);
          },
        })),
        footer:
          'Applied when you connect and when you switch to a new video mode or lens. A saved camera preset takes priority. Only formats supported by that camera are used; photo resolution and the live preview are unchanged.',
      },
    ];
  else if (page === 'connection')
    sections = [
      {
        title: 'Network',
        rows: [
          {
            kind: 'name',
            id: 'app-server',
            label: 'Connection service address',
            value: preferences.value.server,
            maxLength: 300,
            validate: () => undefined,
            onSave: (server) => appPreferences.update({ server }),
          },
          { kind: 'value', label: 'Automatic address', value: detectedServer() || 'Not detected' },
        ],
        footer:
          'Leave the address empty to use automatic detection. In this test version, your Mac prepares the connection. Keep both phones on the same Wi-Fi network. Changes apply to the next connection.',
      },
      {
        title: 'Pairing',
        rows: [
          {
            kind: 'navigation',
            label: 'My cameras',
            subtitle: 'Manage names, saved settings and pairing.',
            icon: 'device',
            onPress: () => router.push('/monitor'),
          },
        ],
        footer:
          'Open Camera on the phone that will capture, then scan its code from Monitor on the other phone. Saved cameras can reconnect while both apps are open.',
      },
    ];
  else
    sections = [
      {
        title: 'Capture',
        rows: [
          {
            kind: 'navigation',
            label: 'Preferred quality',
            subtitle: qualityOptions.find((option) => option.value === preferences.value.quality)!
              .label,
            icon: 'camera',
            onPress: () => open('quality'),
          },
        ],
      },
      {
        title: 'App',
        rows: [
          {
            kind: 'navigation',
            label: 'Connection settings',
            subtitle: 'Network and pairing',
            icon: 'wifi',
            onPress: () => open('connection'),
          },
          {
            kind: 'navigation',
            label: 'About',
            subtitle: 'How Relais works and where captures are saved',
            icon: 'info',
            onPress: () => router.push('/about'),
          },
        ],
      },
    ];
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title, headerShown: true }} />
      <SettingsPage sections={sections} />
    </View>
  );
}
