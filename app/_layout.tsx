import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { requireOptionalNativeModule } from 'expo';
import { useAppTheme } from '@/design/useAppTheme';

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__ && Platform.OS !== 'web') {
      const preferences = requireOptionalNativeModule<{
        setPreferencesAsync: (settings: { showFloatingActionButton: boolean }) => Promise<void>;
      }>('DevMenuPreferences');
      void preferences?.setPreferencesAsync({ showFloatingActionButton: false }).catch(() => {});
    }
  }, []);
  const theme = useAppTheme();
  const base = theme.dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: theme.accent,
          background: theme.background,
          card: theme.background,
          text: theme.text,
          border: theme.border,
        },
      }}
    >
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: Platform.OS === 'ios' ? theme.accent : theme.text,
          headerTitleStyle: { color: theme.text },
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pairing" options={{ title: 'Pair phones' }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="monitor" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ title: 'About Relais' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        <Stack.Screen name="dev/webrtc" options={{ title: 'Live preview', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
