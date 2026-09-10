import { Stack } from 'expo-router';
export default function CaptureLayout({ role }: { role: 'camera' | 'monitor' }) {
  return <Stack screenOptions={{ title: role === 'camera' ? 'Camera' : 'Monitor' }} />;
}
