import { Stack } from 'expo-router';
import { SessionProvider } from '@/capture/SessionContext';
import { useAppTheme } from '@/design/useAppTheme';

export default function CaptureLayout({ role }: { role: 'camera' | 'monitor' }) {
  const theme = useAppTheme();
  return (
    <SessionProvider role={role}>
      <Stack.Screen options={{ gestureEnabled: role !== 'camera' }} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          freezeOnBlur: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: role === 'camera' ? 'Camera' : 'My cameras',
            headerShown: role !== 'camera',
          }}
        />
      </Stack>
    </SessionProvider>
  );
}
