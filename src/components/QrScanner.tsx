import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { AppText } from './ui';
import { ActionButton } from './ActionButton';

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  if (!permission) return <AppText>Checking camera permission…</AppText>;
  if (!permission.granted)
    return (
      <>
        <AppText variant="muted">
          {permission.canAskAgain
            ? 'Camera access lets you scan the QR code.'
            : 'Allow camera access in your phone’s settings to scan the QR code.'}
        </AppText>
        <ActionButton
          label={permission.canAskAgain ? 'Allow camera access' : 'Open Settings'}
          onPress={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
        />
      </>
    );
  return (
    <CameraView
      style={styles.scanner}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => {
        if (!scanned.current) {
          scanned.current = true;
          onScan(data);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  scanner: { width: '100%', height: 280, borderRadius: 16, overflow: 'hidden' },
});
