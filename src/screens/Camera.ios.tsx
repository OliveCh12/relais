import { useEffect, useState } from 'react';
import { requireNativeModule, requireNativeView } from 'expo';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, type ViewProps } from 'react-native';
import NativeEngine from '../../modules/relais-camera-engine/src';
import { emptyCaptureState, parseCaptureState } from '@/capture/protocol';
import { useConnection } from '@/capture/useConnection';
import { CameraConnection } from '@/components/connection/CameraConnection';

const AppleCamera = requireNativeView<
  ViewProps & {
    onClose: () => void;
    onConnect: () => void;
    onMonitor: () => void;
    onCameraState: (event: { nativeEvent: unknown }) => void;
    connectionLabel: string;
  }
>('RelaisCameraEngine');

export default function CameraScreen() {
  const [state, setState] = useState(emptyCaptureState);
  const [connect, setConnect] = useState(false);
  const connection = useConnection('camera', { state, perform: NativeEngine.captureAction });
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
        onClose={() => router.back()}
        onMonitor={() => router.replace('/monitor')}
        onConnect={() => setConnect(true)}
        onCameraState={({ nativeEvent }) => {
          const next = parseCaptureState(nativeEvent);
          if (next) setState(next);
        }}
        connectionLabel={
          connection.connected
            ? `Connected to ${connection.device?.name ?? 'Monitor'}`
            : connection.qr
              ? 'Ready to connect'
              : 'Connect a monitor'
        }
      />
      <CameraConnection
        connection={connection}
        visible={connect}
        onClose={() => setConnect(false)}
      />
    </>
  );
}
const styles = StyleSheet.create({ camera: { flex: 1, backgroundColor: '#000' } });
