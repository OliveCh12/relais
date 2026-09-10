import { useEffect } from 'react';
import { requireNativeModule, requireNativeView } from 'expo';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, type ViewProps } from 'react-native';

const AppleCamera = requireNativeView<ViewProps & { onClose: () => void }>('RelaisCameraEngine');

export default function CameraScreen() {
  useEffect(() => {
    if (!__DEV__) return;
    const runtime = globalThis as typeof globalThis & {
      __relaisNativeCameraTest?: (action: string) => Promise<unknown>;
    };
    runtime.__relaisNativeCameraTest = (action) =>
      requireNativeModule('RelaisCameraEngine').cameraDebug(action);
    return () => {
      delete runtime.__relaisNativeCameraTest;
    };
  }, []);
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="light" />
      <AppleCamera style={styles.camera} onClose={() => router.back()} />
    </>
  );
}

const styles = StyleSheet.create({ camera: { flex: 1, backgroundColor: '#000' } });
