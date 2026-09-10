import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnection } from '@/capture/useConnection';
import type { CaptureAction } from '@/capture/protocol';
import { ConnectionQuality } from '@/components/ConnectionQuality';
import { CameraIconButton } from '@/components/CameraIconButton';
import { CaptureModes } from '@/components/CaptureModes';
import { DeviceDetails } from '@/components/DeviceList';
import { MonitorSetup } from '@/components/connection/MonitorSetup';
import { ScanSheet } from '@/components/connection/ScanSheet';
import { ConnectionSheet } from '@/components/connection/ConnectionSheet';
import type { ConnectionPanel } from '@/components/connection/ConnectionSheet.types';
import { useDevices, type DeviceRow } from '@/connections/useDevices';
import { deviceRegistry } from '@/connections/storage';
import { linkQuality } from '@/connections/quality';
import { parsePairingQr, privateLanOrigin, type PairingDescriptor } from '@/signaling/protocol';
import { RemotePreview } from '@/transport/native/RemotePreview';
import { useAppTheme } from '@/design/useAppTheme';

function report(error: unknown) {
  Alert.alert('Camera', error instanceof Error ? error.message : 'Please try again.');
}
export default function MonitorScreen() {
  useKeepAwake();
  const connection = useConnection('monitor');
  const {
    active,
    focused,
    start,
    command: sendCommand,
    connected,
    status,
    diagnostics,
  } = connection;
  const [panel, setPanel] = useState<ConnectionPanel | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<PairingDescriptor | null>(null);
  const [details, setDetails] = useState<DeviceRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fill, setFill] = useState(false);
  const autoAttempt = useRef('');
  const devices = useDevices(connection.server, focused && !active && !scanning);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const remote = connection.remote;
  const recording = remote?.phase === 'recording';
  const visible = !!connection.stream;
  const command = useCallback(
    (action: CaptureAction) => {
      void sendCommand(action).catch(report);
    },
    [sendCommand],
  );
  const select = (row: DeviceRow) => {
    if (!row.descriptor) {
      Alert.alert(
        row.device.name,
        'Open Camera on this phone and keep both apps on the same Wi-Fi network.',
      );
      return;
    }
    setDetails(null);
    void start(row.descriptor, row.device);
  };
  useEffect(() => {
    if (active || !focused || scanning || panel || details) return;
    const available = devices.rows.filter((row) => row.descriptor);
    const row = available.length === 1 ? available[0] : undefined;
    if (!row?.descriptor || autoAttempt.current === row.descriptor.sessionId) return;
    autoAttempt.current = row.descriptor.sessionId;
    void start(row.descriptor, row.device);
  }, [active, focused, start, devices.rows, scanning, panel, details]);
  useEffect(() => {
    if (!scanned || scanning) return;
    const descriptor = scanned;
    void start(descriptor).finally(() => setScanned(null));
  }, [scanned, scanning, start]);
  useEffect(() => {
    if (!__DEV__) return;
    const runtime = globalThis as typeof globalThis & {
      __relaisMonitorTest?: (action: string) => unknown;
    };
    runtime.__relaisMonitorTest = (action) =>
      action === 'state'
        ? {
            connected: connected,
            remote,
            status: status,
            devices: devices.rows.map((row) => ({
              name: row.device.name,
              availability: row.availability,
            })),
          }
        : action === 'diagnostics'
          ? diagnostics()
          : action.startsWith('connect:')
            ? start(parsePairingQr(action.slice(8)))
            : sendCommand(action as CaptureAction);
    return () => {
      delete runtime.__relaisMonitorTest;
    };
  }, [connected, sendCommand, status, remote, devices.rows, start, diagnostics]);
  const readCode = (value: string) => {
    try {
      const descriptor = parsePairingQr(value);
      setError(null);
      setPanel(null);
      setScanning(false);
      setScanned(descriptor);
    } catch {
      setScanning(false);
      setError('This code is invalid or expired. Open a new connection code on the camera phone.');
    }
  };
  const close = () => {
    connection.stop();
    router.back();
  };
  return (
    <View style={{ flex: 1, backgroundColor: visible ? '#000' : theme.background }}>
      <Stack.Screen
        options={{
          headerShown: !visible,
          title: 'Monitor',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />
      <StatusBar style={visible ? 'light' : 'auto'} />
      {visible && connection.stream ? (
        <>
          <RemotePreview stream={connection.stream} fill={fill} />
          <View
            style={[
              styles.top,
              { top: insets.top + 6, left: insets.left + 12, right: insets.right + 12 },
            ]}
          >
            <CameraIconButton icon="close" label="Close Monitor" onPress={close} />
            <View style={styles.status}>
              <Text style={styles.title}>
                {recording ? '● Recording' : remote?.quality || 'Connecting…'}
              </Text>
              <Text style={styles.caption}>{connection.device?.name ?? 'Camera'}</Text>
            </View>
            <CameraIconButton
              icon="info"
              label="Connection details"
              onPress={() => setPanel('options')}
            />
          </View>
          <View
            style={[
              styles.bottom,
              { left: insets.left + 20, right: insets.right + 20, bottom: insets.bottom + 12 },
            ]}
          >
            <Text style={styles.message} accessibilityLiveRegion="polite">
              {remote?.message ||
                (connected ? 'Saved on the camera phone' : 'Connecting securely…')}
            </Text>
            <View style={styles.shutter}>
              <CameraIconButton
                large
                photo={remote?.mode === 'photo'}
                icon={recording ? 'stop' : 'record'}
                label={
                  recording
                    ? 'Stop recording on camera'
                    : remote?.mode === 'photo'
                      ? 'Take a photo on camera'
                      : 'Record a video on camera'
                }
                disabled={!connected || connection.sending || (!recording && !remote?.canCapture)}
                onPress={() =>
                  command(recording ? 'stop' : remote?.mode === 'photo' ? 'photo' : 'start')
                }
              />
            </View>
            {remote && (
              <CaptureModes
                mode={remote.mode}
                modes={remote.modes}
                disabled={connection.sending || !remote.canCapture || recording}
                onMode={(mode) => command(`mode-${mode}`)}
              />
            )}
            <ConnectionQuality sample={connection.quality} />
          </View>
        </>
      ) : (
        <MonitorSetup
          rows={devices.rows}
          status={error || devices.error || status}
          connecting={active}
          onSelect={select}
          onDetails={setDetails}
          onRefresh={() => {
            autoAttempt.current = '';
            devices.refresh();
          }}
          onScan={() => setScanning(true)}
          onCode={() => setPanel('code')}
          onSettings={() => setPanel('server')}
          onCancel={connection.stop}
        />
      )}
      {scanning && <ScanSheet onScan={readCode} onClose={() => setScanning(false)} />}
      <ConnectionSheet
        panel={panel}
        qr={null}
        active={connected}
        fill={fill}
        status={linkQuality(connection.quality).label}
        deviceName={connection.device?.name}
        server={connection.server}
        error={error}
        onClose={() => {
          setPanel(null);
          setError(null);
        }}
        onPanel={setPanel}
        onFill={setFill}
        onShare={() => {}}
        onCode={readCode}
        onServer={(value) => {
          try {
            connection.setServer(privateLanOrigin(value));
            setPanel(null);
            setError(null);
            devices.refresh();
          } catch {
            setError('Enter the Mac’s local address, for example http://192.168.1.10:8787.');
          }
        }}
      />
      {details && (
        <DeviceDetails
          row={details}
          onClose={() => setDetails(null)}
          onConnect={() => select(details)}
          onRename={(name) => {
            void deviceRegistry
              .rename(details.device.id, name)
              .then(() => setDetails(null))
              .catch(report);
          }}
          onForget={() => {
            Alert.alert('Forget this camera?', 'You can pair it again with its connection code.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Forget',
                style: 'destructive',
                onPress: () => {
                  void deviceRegistry
                    .forget(details.device.id)
                    .then(() => setDetails(null))
                    .catch(report);
                },
              },
            ]);
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: {
    flexShrink: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#00000080',
  },
  title: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  caption: { color: '#DDD', fontSize: 12, textAlign: 'center' },
  bottom: { position: 'absolute', gap: 12 },
  shutter: { alignItems: 'center' },
  message: {
    color: '#FFF',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#00000080',
    padding: 8,
    borderRadius: 8,
  },
});
