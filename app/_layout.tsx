import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/design/tokens';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pairing" options={{ title: 'Associer les téléphones' }} />
        <Stack.Screen name="camera" options={{ title: 'Caméra' }} />
        <Stack.Screen name="monitor" options={{ title: 'Moniteur' }} />
        <Stack.Screen name="settings" options={{ title: 'Réglages', presentation: 'modal' }} />
        <Stack.Screen name="dev/webrtc" options={{ title: 'SPIKE · WebRTC' }} />
      </Stack>
    </>
  );
}
