import { useEffect } from 'react';
import { requireNativeModule, requireNativeView } from 'expo';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, type ViewProps } from 'react-native';
import NativeEngine from '../../modules/relais-camera-engine/src';
import { parseCaptureState } from '@/capture/protocol';
import { useCaptureSession } from '@/capture/SessionContext';

const AppleCamera = requireNativeView<
  ViewProps & {
    onClose: () => void;
    onConnect: () => void;
    onMonitor: () => void;
    onCameraState: (event: { nativeEvent: unknown }) => void;
    connectionLabel: string;
    keepSessionAlive: boolean;
  }
>('RelaisCameraEngine');

export default function CameraScreen() {
  const { connection, updateCamera } = useCaptureSession();
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
      <AppleCamera
        style={styles.camera}
        keepSessionAlive={connection.focused}
        onClose={() => router.back()}
        onMonitor={() => router.replace('/monitor')}
        onConnect={() => router.push('/camera/connect')}
        onCameraState={({ nativeEvent }) => {
          const next = parseCaptureState(nativeEvent);
          if (next)
            updateCamera(next, (action) =>
              NativeEngine.captureAction(
                typeof action === 'string' ? action : JSON.stringify(action),
              ),
            );
        }}
        connectionLabel={
          connection.connected
            ? `Connected to ${connection.device?.name ?? 'Monitor'}`
            : connection.qr
              ? 'Ready to connect'
              : 'Connect a monitor'
        }
      />
    </>
  );
}
const styles = StyleSheet.create({ camera: { flex: 1, backgroundColor: '#000' } });
