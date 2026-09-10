import { useCallback, useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaptureSession } from '@/capture/SessionContext';
import type { CaptureAction } from '@/capture/protocol';
import { CameraIconButton } from '@/components/CameraIconButton';
import { CaptureModes } from '@/components/CaptureModes';
import { MonitorSetup } from '@/components/connection/MonitorSetup';
import { useDevices, type DeviceRow } from '@/connections/useDevices';
import { parsePairingQr } from '@/signaling/protocol';
import { RemotePreview } from '@/transport/native/RemotePreview';
import { useAppTheme } from '@/design/useAppTheme';

function report(error: unknown) {
  Alert.alert('Camera', error instanceof Error ? error.message : 'Please try again.');
}
export default function MonitorScreen() {
  useKeepAwake();
  const { connection, fill } = useCaptureSession();
  const focused = useIsFocused();
  const { active, start, command: sendCommand, connected, status, diagnostics } = connection;
  const devices = useDevices(connection.server, focused && !active);
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
  const select = (row: DeviceRow) =>
    router.push({ pathname: '/monitor/device', params: { id: row.device.id } });
  useEffect(() => {
    if (!__DEV__) return;
    const runtime = globalThis as typeof globalThis & {
      __relaisMonitorTest?: (action: string) => unknown;
    };
    runtime.__relaisMonitorTest = (action) =>
      action === 'state'
        ? {
            connected,
            remote,
            status,
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
  const close = () => connection.stop();
  return (
    <View style={{ flex: 1, backgroundColor: visible ? '#000' : theme.background }}>
      <Stack.Screen
        options={{
          headerShown: !visible,
          title: 'My cameras',
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
            <CameraIconButton icon="back" label="Back to cameras" onPress={close} />
            <View style={styles.status}>
              <Text style={styles.title}>{remote?.quality || 'Connecting…'}</Text>
              <View style={styles.device}>
                <Text style={styles.caption} numberOfLines={1} ellipsizeMode="middle">
                  {connection.device?.name ?? 'Camera'}
                </Text>
              </View>
              {recording && <Text style={styles.recording}>Recording</Text>}
            </View>
            <CameraIconButton
              icon="info"
              label="Connection details"
              onPress={() => router.push('/monitor/info')}
            />
          </View>
          <View
            style={[
              styles.bottom,
              { left: insets.left + 20, right: insets.right + 20, bottom: insets.bottom + 12 },
            ]}
          >
            {!!remote?.message && !recording && (
              <Text style={styles.message} accessibilityLiveRegion="polite">
                {remote.message}
              </Text>
            )}
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
          </View>
        </>
      ) : (
        <MonitorSetup
          rows={devices.rows}
          status={devices.error || connection.error || (active ? status : '')}
          connecting={active}
          onSelect={select}
          onRefresh={devices.refresh}
          onAdd={() => router.push('/monitor/add')}
          onSettings={() => router.push('/monitor/server')}
          onCancel={close}
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
  device: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  caption: { color: '#DDD', fontSize: 12, textAlign: 'center', flexShrink: 1 },
  recording: { color: '#FF6961', fontSize: 12, fontWeight: '600', marginTop: 3 },
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
