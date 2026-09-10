import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useSessionStore } from '@/session/store';
import type { Role } from '@/domain/camera';

export const roles = [
  {
    id: 'camera',
    title: 'Camera',
    description: 'Record and keep video on this phone.',
  },
  {
    id: 'monitor',
    title: 'Monitor',
    description: 'View another phone’s camera.',
  },
] as const;

export function showAbout() {
  Alert.alert(
    'Relais · Test version',
    'Camera records on this phone. Live preview between phones is available separately for testing.',
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
    router.push(role === 'camera' ? '/camera' : __DEV__ ? '/dev/webrtc' : '/pairing');
  };
}
