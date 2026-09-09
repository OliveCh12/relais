// THROW AWAY — not the product camera pipeline
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { RTCView, type MediaStream } from 'react-native-webrtc';
import QRCode from 'react-native-qrcode-svg';
import { AppText, Badge, Button, Card, Field, Screen } from '../../components/ui';
import { QrScanner } from '../../components/QrScanner';
import { parsePairingQr, type PairingDescriptor } from '../../signaling/protocol';
import { SpikeSession } from './session';

export default function SpikeScreen() {
  useKeepAwake();
  const [server, setServer] = useState('');
  const [status, setStatus] = useState('Lancez pnpm spike:signaling sur le Mac du même LAN.');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [qr, setQr] = useState<PairingDescriptor | null>(null);
  const [channelOpen, setChannelOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pendingQr, setPendingQr] = useState<PairingDescriptor | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [stats, setStats] = useState<{ fps: number | null; kbps: number | null }>({
    fps: null,
    kbps: null,
  });
  const session = useRef<SpikeSession | null>(null);
  const generation = useRef(0);

  const stop = useCallback(() => {
    generation.current += 1;
    session.current?.dispose();
    session.current = null;
    setActive(false);
    setStream(null);
    setQr(null);
    setChannelOpen(false);
    setScanning(false);
    setPendingQr(null);
    setRtt(null);
    setStats({ fps: null, kbps: null });
  }, []);

  useFocusEffect(useCallback(() => () => stop(), [stop]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        stop();
        setStatus('Spike fermé en background. Créez une nouvelle session.');
      }
    });
    return () => subscription.remove();
  }, [stop]);

  const start = useCallback(
    async (descriptor?: PairingDescriptor) => {
      stop();
      const current = generation.current;
      const guard =
        <T,>(callback: (value: T) => void) =>
        (value: T) => {
          if (generation.current === current) callback(value);
        };
      setActive(true);
      try {
        const next = new SpikeSession({
          status: guard(setStatus),
          stream: guard(setStream),
          qr: guard(setQr),
          channel: guard(setChannelOpen),
          rtt: guard(setRtt),
          stats: guard(setStats),
        });
        session.current = next;
        if (descriptor) await next.startMonitor(descriptor);
        else await next.startCamera(server);
      } catch (error) {
        if (current !== generation.current) return;
        stop();
        setStatus(error instanceof Error ? error.message : 'Échec du spike.');
      }
    },
    [server, stop],
  );

  return (
    <Screen>
      <Badge>SPIKE 0 · PREVIEW SEULEMENT</Badge>
      <AppText variant="muted">THROW AWAY — not the product camera pipeline</AppText>
      <AppText>{status}</AppText>
      {!active && !scanning && !pendingQr && (
        <Card>
          <Field
            label="URL DU SERVEUR LAN (MAC)"
            value={server}
            onChangeText={setServer}
            placeholder="http://192.168.1.10:8787"
            keyboardType="url"
          />
          <Button
            label="Caméra · Créer une session"
            onPress={() => {
              void start();
            }}
            disabled={!server.trim()}
          />
          <Button label="Moniteur · Scanner le QR" secondary onPress={() => setScanning(true)} />
        </Card>
      )}
      {scanning && (
        <QrScanner
          onScan={(text) => {
            setScanning(false);
            try {
              setPendingQr(parsePairingQr(text));
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'QR invalide.');
            }
          }}
        />
      )}
      {pendingQr && !scanning && !active && (
        <Card>
          <AppText>Caméra trouvée sur {pendingQr.server}</AppText>
          <AppText variant="muted">Scanner fermé. Prêt à recevoir le preview.</AppText>
          <Button
            label="Rejoindre la Caméra"
            onPress={() => {
              void start(pendingQr);
            }}
          />
          <Button label="Annuler" secondary onPress={stop} />
        </Card>
      )}
      {stream && (
        <RTCView
          streamURL={stream.toURL()}
          style={styles.video}
          objectFit="contain"
          mirror={false}
        />
      )}
      {qr && (
        <Card>
          <View style={styles.qr}>
            <QRCode value={JSON.stringify(qr)} size={230} />
          </View>
          <AppText variant="muted">
            À scanner sur le Moniteur · expiration {new Date(qr.expiresAt).toLocaleTimeString()}
          </AppText>
        </Card>
      )}
      <Card>
        <AppText variant="heading">RTT {rtt === null ? '—' : `${rtt.toFixed(0)} ms`}</AppText>
        <AppText variant="muted">
          Vidéo reçue : {stats.fps?.toFixed(1) ?? '—'} fps · {stats.kbps?.toFixed(0) ?? '—'} kbps
        </AppText>
        <AppText variant="muted">
          RTT DataChannel ≠ latence vidéo. Audio OFF. Aucun fichier.
        </AppText>
        <Button label="Ping" disabled={!channelOpen} onPress={() => session.current?.ping()} />
        <Button
          label="rec-mock · Tester l’écho"
          secondary
          disabled={!channelOpen}
          onPress={() => session.current?.recMock()}
        />
      </Card>
      {(active || scanning) && (
        <Button
          label="Fermer le spike"
          secondary
          onPress={() => {
            stop();
            setStatus('Ressources libérées.');
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', aspectRatio: 9 / 16, maxHeight: 440, backgroundColor: 'black' },
  qr: { backgroundColor: 'white', padding: 16, alignSelf: 'center', borderRadius: 12 },
});
