import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useSessionStore } from '@/session/store';
import type { Role } from '@/domain/camera';

export const roles = [
  {
    id: 'camera',
    title: 'Camera',
    description: 'Take photos and videos on this phone.',
  },
  {
    id: 'monitor',
    title: 'Monitor',
    description: 'See and control your other camera.',
  },
] as const;

export function showAbout() {
  Alert.alert(
    'Relais · Test version',
    'Open Camera on one phone and Monitor on the other. Capture photos and videos remotely; originals stay on the camera phone. Both apps must stay open on the same Wi-Fi network. This test version uses the Mac to connect.',
    [
      ...(__DEV__ ? [{ text: 'Live preview', onPress: () => router.push('/dev/webrtc') }] : []),
      { text: 'Close', style: 'cancel' },
    ],
  );
}

export function useChooseRole() {
  const dispatch = useSessionStore((state) => state.dispatch);
  return (role: Role) => {
    dispatch({ type: 'close' });
    dispatch({ type: 'choose-role', role });
    router.push(role === 'camera' ? '/camera' : '/monitor');
  };
}
