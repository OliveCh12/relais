import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { DeviceRegistry } from './registry';

async function secureStore() {
  if (!requireOptionalNativeModule('ExpoSecureStore'))
    throw new Error('Install the latest version of Relais to save devices.');
  try {
    return await import('expo-secure-store');
  } catch {
    throw new Error('Install the latest version of Relais to save devices.');
  }
}
export const deviceRegistry = new DeviceRegistry(
  {
    get: async (key) => (await secureStore()).getItemAsync(key),
    set: async (key, value) => {
      const store = await secureStore();
      await store.setItemAsync(key, value, {
        keychainAccessible: store.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    },
    remove: async (key) => (await secureStore()).deleteItemAsync(key),
  },
  async (size) => {
    const crypto = await import('expo-crypto');
    return Array.from(await crypto.getRandomBytesAsync(size), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  },
  Constants.deviceName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Android'),
);
