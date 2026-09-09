import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { AppText, Button } from './ui';

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  if (!permission) return <AppText>Vérification de la permission caméra…</AppText>;
  if (!permission.granted)
    return (
      <>
        <AppText variant="muted">Autorisez la caméra pour lire le QR de l’autre téléphone.</AppText>
        <Button
          label={
            permission.canAskAgain
              ? 'Autoriser la caméra'
              : 'Caméra refusée — ouvrir les réglages système'
          }
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
