import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { ActionButton } from './ActionButton';

export function QrScanner({
  onScan,
  fill = false,
}: {
  onScan: (value: string) => void | boolean;
  fill?: boolean;
}) {
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [rejected, setRejected] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const scanned = useRef(false);
  const camera = useRef<CameraView>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active')
        void refreshPermission().catch(() => setFailure('Could not check camera access.'));
      else setReady(false);
    });
    return () => subscription.remove();
  }, [refreshPermission]);
  useEffect(() => {
    if (!active || !permission?.granted || ready || failure) return;
    const timeout = setTimeout(() => {
      setFailure('The camera did not start. Try again, or enter the connection code instead.');
    }, 12000);
    return () => clearTimeout(timeout);
  }, [active, permission?.granted, ready, failure, attempt]);
  const retry = () => {
    scanned.current = false;
    setRejected(false);
    setFailure('');
    setReady(false);
    setAttempt((value) => value + 1);
  };
  return (
    <View style={fill ? styles.fill : styles.scanner}>
      {!permission ? (
        <View style={styles.message}>
          <ActivityIndicator />
          <AppText>Checking camera access…</AppText>
        </View>
      ) : !permission.granted ? (
        <View style={styles.message}>
          <AppText>
            {permission.canAskAgain
              ? 'Allow camera access to scan the code on your other phone.'
              : 'Allow camera access in Settings to scan the code.'}
          </AppText>
          <ActionButton
            label={permission.canAskAgain ? 'Allow camera access' : 'Open Settings'}
            onPress={() => {
              const action = permission.canAskAgain ? requestPermission() : Linking.openSettings();
              void action.catch(() =>
                setFailure('Could not open camera permissions. Please try again.'),
              );
            }}
          />
          {!!failure && <AppText accessibilityRole="alert">{failure}</AppText>}
        </View>
      ) : failure || rejected ? (
        <View style={styles.message}>
          <AppText accessibilityRole="alert">
            {failure || 'This code is invalid or expired. Show a new code on the camera phone.'}
          </AppText>
          <ActionButton label="Try again" onPress={retry} />
        </View>
      ) : active ? (
        <View style={styles.preview}>
          <CameraView
            ref={camera}
            key={attempt}
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onCameraReady={() => {
              setReady(true);
              if (Platform.OS === 'ios') {
                const preview = camera.current;
                void preview
                  ?.getAvailableLensesAsync()
                  .then((lenses) => {
                    if (camera.current === preview && lenses.length === 0)
                      setFailure(
                        'No camera is available on this device. Enter the connection code instead.',
                      );
                  })
                  .catch(() => {
                    if (camera.current === preview)
                      setFailure('Could not start the camera. Please try again.');
                  });
              }
            }}
            onMountError={() =>
              setFailure('Camera unavailable. Try again, or enter the connection code instead.')
            }
            onBarcodeScanned={({ data }) => {
              if (scanned.current) return;
              scanned.current = true;
              if (onScan(data) === false) setRejected(true);
            }}
          />
          {!ready && <ActivityIndicator style={StyleSheet.absoluteFill} color="white" />}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 200 },
  scanner: { width: '100%', height: 280 },
  preview: { flex: 1, backgroundColor: 'black', overflow: 'hidden' },
  message: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
});
