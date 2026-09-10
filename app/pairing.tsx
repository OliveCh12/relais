import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppText, Button, Screen } from '@/components/ui';
import { QrScanner } from '@/components/QrScanner';
import { useSessionStore } from '@/session/store';
import { Icon } from '@/components/icons/Icon';
import { useAppTheme } from '@/design/useAppTheme';

const demoQr = JSON.stringify({ kind: 'relais-demo', version: 1 });

export default function PairingScreen() {
  const role = useSessionStore((state) => state.session.role);
  const theme = useAppTheme();
  const [scanning, setScanning] = useState(role === 'monitor');
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      setScanning(role === 'monitor');
      setMessage(null);
      return () => setScanning(false);
    }, [role]),
  );

  if (!role) return <Redirect href="/" />;
  const openDemo = () => {
    setScanning(false);
    router.push(role === 'camera' ? '/camera' : '/monitor');
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: role === 'camera' ? 'Pair a monitor' : 'Pair a camera' }} />
      <View style={styles.intro}>
        <AppText variant="heading" style={styles.title}>
          {role === 'camera' ? 'Scan from the other phone' : 'Point at the Camera phone’s QR code'}
        </AppText>
        <AppText variant="muted">
          {role === 'camera'
            ? 'Open Relais and choose Monitor on the other phone.'
            : 'Open Camera in Relais on the other phone.'}
        </AppText>
      </View>
      <View style={[styles.pairing, { backgroundColor: theme.surface }]}>
        {role === 'camera' ? (
          <View style={styles.qr} accessible accessibilityLabel="Relais demo QR code">
            <QRCode value={demoQr} size={188} />
          </View>
        ) : scanning ? (
          <QrScanner
            onScan={(value) => {
              setScanning(false);
              if (value === demoQr) openDemo();
              else setMessage('This is not a Relais QR code. Try again with the other phone.');
            }}
          />
        ) : (
          <>
            {message && <AppText variant="muted">{message}</AppText>}
            <Button
              label="Scan again"
              icon="qr"
              onPress={() => {
                setMessage(null);
                setScanning(true);
              }}
            />
          </>
        )}
      </View>
      <View style={styles.network}>
        <Icon name="wifi" size={18} color={theme.muted} />
        <AppText variant="muted" style={{ flex: 1 }}>
          Keep both phones on the same Wi-Fi network.
        </AppText>
      </View>
      <View style={styles.footer}>
        <Button testID="open-demo" label="Try without connecting" secondary onPress={openDemo} />
        <AppText variant="muted" style={styles.disclaimer}>
          Demo · No real connection
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 8, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  pairing: { padding: 24, borderRadius: 24, gap: 16, minHeight: 250, justifyContent: 'center' },
  qr: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, alignSelf: 'center' },
  network: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 4 },
  footer: { marginTop: 12, gap: 12 },
  disclaimer: { textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
