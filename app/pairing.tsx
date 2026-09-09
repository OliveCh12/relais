import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppText, Badge, Button, Card, Screen } from '@/components/ui';
import { QrScanner } from '@/components/QrScanner';
import { useSessionStore } from '@/session/store';

const demoQr = JSON.stringify({ kind: 'relais-demo', version: 1 });

export default function PairingScreen() {
  const role = useSessionStore((state) => state.session.role);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(useCallback(() => () => setScanning(false), []));
  if (!role) return <Redirect href="/" />;
  return (
    <Screen>
      <Badge>
        {role === 'camera' ? 'CE TÉLÉPHONE EST LA CAMÉRA' : 'CE TÉLÉPHONE EST LE MONITEUR'}
      </Badge>
      <AppText variant="title">À deux,{'\n'}sur le même Wi-Fi.</AppText>
      <AppText variant="muted">
        Le pairing produit est en préparation. Explorez les écrans ou testez la connexion depuis le
        spike dev.
      </AppText>
      <Card>
        {role === 'camera' ? (
          <>
            <View
              style={{
                padding: 16,
                backgroundColor: 'white',
                alignSelf: 'center',
                borderRadius: 12,
              }}
            >
              <QRCode value={demoQr} size={200} />
            </View>
            <AppText variant="muted">QR de démonstration · N’établit aucune connexion</AppText>
          </>
        ) : scanning ? (
          <QrScanner
            onScan={(value) => {
              setScanning(false);
              setMessage(
                value === demoQr
                  ? 'QR de démonstration reconnu. Aucun téléphone connecté.'
                  : 'Ce QR ne correspond pas à la démonstration Relais.',
              );
            }}
          />
        ) : (
          <Button
            label="Scanner un QR de démonstration"
            secondary
            onPress={() => {
              setMessage(null);
              setScanning(true);
            }}
          />
        )}
      </Card>
      {message && <AppText variant="muted">{message}</AppText>}
      {scanning && <Button label="Annuler le scan" secondary onPress={() => setScanning(false)} />}
      <Button
        testID="open-demo"
        label={role === 'camera' ? 'Explorer l’écran Caméra' : 'Explorer l’écran Moniteur'}
        onPress={() => router.push(role === 'camera' ? '/camera' : '/monitor')}
      />
    </Screen>
  );
}
