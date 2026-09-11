import { useEffect, useSyncExternalStore } from 'react';
import Constants from 'expo-constants';
import { secureStorage } from '../connections/storage';
import { privateLanOrigin } from '../signaling/protocol';
import { PreferenceStore } from './Preferences';

export const appPreferences = new PreferenceStore(secureStorage);
export function detectedServer() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  try {
    return privateLanOrigin(process.env.EXPO_PUBLIC_SIGNALING_URL || `http://${host}:8787`);
  } catch {
    return '';
  }
}
export function usePreferences() {
  const snapshot = useSyncExternalStore(appPreferences.subscribe, appPreferences.getSnapshot);
  useEffect(() => {
    void appPreferences.load().catch(() => {});
  }, []);
  return snapshot;
}
