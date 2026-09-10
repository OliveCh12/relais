import { router } from 'expo-router';
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
  router.push('/about');
}

export function useChooseRole() {
  const dispatch = useSessionStore((state) => state.dispatch);
  return (role: Role) => {
    dispatch({ type: 'close' });
    dispatch({ type: 'choose-role', role });
    router.push(role === 'camera' ? '/camera' : '/monitor');
  };
}
