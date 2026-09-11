import { ViewfinderGesture } from '@/components/ViewfinderGesture';
import { videoPoint, type Size } from '@/capture/viewfinder';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaptureSession } from '@/capture/SessionContext';
import type { CaptureAction } from '@/capture/protocol';
import { ActionButton } from '@/components/ActionButton';
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
  const { connection, fill, applyingPreset } = useCaptureSession();
  const focused = useIsFocused();
  const { active, start, command: sendCommand, connected, status, diagnostics } = connection;
  const devices = useDevices(connection.server, focused && !active);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const remote = connection.remote;
  const [videoSize, setVideoSize] = useState<Size>({ width: 0, height: 0 });
  const controls = remote?.settings?.controls;
  const recording = remote?.phase === 'recording';
  const countdown = remote?.phase === 'countdown';
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
            : sendCommand(
                action.startsWith('settings:')
                  ? (JSON.parse(action.slice(9)) as CaptureAction)
                  : (action as CaptureAction),
              );
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
          <ViewfinderGesture
            key={connection.stream.toURL()}
            videoSize={videoSize}
            fill={fill}
            enabled={
              !applyingPreset && connected && !!remote?.ready && (remote.canCapture || recording)
            }
            {...(controls ? { controls } : {})}
            onFocus={async (point, size) => {
              const normalized = videoPoint(point, size, videoSize, fill);
              const settings = connection.getRemote()?.settings;
              if (normalized && settings)
                await sendCommand({
                  type: 'settings',
                  key: 'focus',
                  value: normalized,
                  revision: settings.revision,
                });
            }}
            onExposure={async (value) => {
              const settings = connection.getRemote()?.settings;
              if (settings)
                await sendCommand({
                  type: 'settings',
                  key: 'exposure',
                  value,
                  revision: settings.revision,
                });
            }}
            onError={report}
          >
            <RemotePreview
              stream={connection.stream}
              fill={fill}
              onDimensionsChange={(size) => {
                setVideoSize((current) =>
                  current.width === size.width && current.height === size.height ? current : size,
                );
              }}
            />
          </ViewfinderGesture>
          <View
            style={[
              styles.top,
              { top: insets.top + 6, left: insets.left + 12, right: insets.right + 12 },
            ]}
          >
            <CameraIconButton icon="back" label="Back to cameras" onPress={close} />
            <View style={styles.status}>
              <Text style={styles.title}>
                {applyingPreset ? 'Applying camera preset…' : remote?.quality || 'Connecting…'}
              </Text>
              <View style={styles.device}>
                <Text style={styles.caption} numberOfLines={1} ellipsizeMode="middle">
                  {connection.device?.name ?? 'Camera'}
                </Text>
              </View>
              {recording && <Text style={styles.recording}>Recording</Text>}
            </View>
            <CameraIconButton
              icon="settings"
              label="Settings on camera phone"
              onPress={() =>
                router.push({
                  pathname: '/monitor/device',
                  params: { id: connection.device?.id ?? '' },
                })
              }
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
            {remote?.phase === 'pending' && (
              <ActionButton
                dark
                label="Retry saving on camera"
                onPress={() => command('retry-save')}
                disabled={connection.sending || !connected}
              />
            )}
            <View style={styles.shutter}>
              <CameraIconButton
                large
                photo={remote?.mode === 'photo'}
                icon={recording || countdown ? 'stop' : 'record'}
                label={
                  countdown
                    ? 'Cancel photo timer'
                    : recording
                      ? 'Stop recording on camera'
                      : remote?.mode === 'photo'
                        ? 'Take a photo on camera'
                        : 'Record a video on camera'
                }
                disabled={
                  applyingPreset ||
                  !connected ||
                  (!countdown && (connection.sending || (!recording && !remote?.canCapture)))
                }
                onPress={() =>
                  command(
                    countdown
                      ? 'cancel-timer'
                      : recording
                        ? 'stop'
                        : remote?.mode === 'photo'
                          ? 'photo'
                          : 'start',
                  )
                }
              />
            </View>
            {remote && (
              <CaptureModes
                mode={remote.mode}
                modes={remote.modes}
                disabled={applyingPreset || connection.sending || !remote.canCapture || recording}
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
