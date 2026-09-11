import { Stack } from 'expo-router';
import { SessionProvider } from '@/capture/SessionContext';
import { useStackOptions } from '@/navigation/useStackOptions';

export default function CaptureLayout({ role }: { role: 'camera' | 'monitor' }) {
  const screenOptions = useStackOptions();
  return (
    <SessionProvider role={role}>
      <Stack.Screen options={{ gestureEnabled: role !== 'camera' }} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen
          name="index"
          options={{
            // Keep the capture owner and its remote acknowledgements alive under settings pages.
            freezeOnBlur: false,
            title: role === 'camera' ? 'Camera' : 'My cameras',
            headerShown: role !== 'camera',
          }}
        />
      </Stack>
    </SessionProvider>
  );
}
