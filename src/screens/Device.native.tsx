import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCaptureSession } from '@/capture/SessionContext';
import { remoteSettingsSections } from '@/capture/remoteSettingsSections';
import { previewPreset } from '@/capture/presets';
import type { CaptureAction } from '@/capture/protocol';
import { SettingsPage } from '@/components/SettingsPage';
import type { SettingsPageProps } from '@/components/SettingsPage.types';
import { DeviceConnect } from '@/components/connection/DeviceConnect';
import { useDevices } from '@/connections/useDevices';
import { deviceRegistry } from '@/connections/storage';
import { availabilityLabels } from '@/connections/model';
import { linkQuality } from '@/connections/quality';
import { useAppTheme } from '@/design/useAppTheme';

function report(error: unknown) {
  Alert.alert('Camera settings', error instanceof Error ? error.message : 'Please try again.');
}
export default function DeviceScreen() {
  const { connection, connectTo, fill, setFill, applyingPreset } = useCaptureSession();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || connection.device?.id;
  const focused = useIsFocused();
  const connected = connection.connected && connection.device?.id === id;
  const devices = useDevices(connection.server, focused && !connected, id);
  const row = devices.rows.find((item) => item.device.id === id);
  const saved = row?.device;
  const theme = useAppTheme();
  const { setMetricsEnabled } = connection;
  useEffect(() => {
    setMetricsEnabled(focused && connected);
    return () => setMetricsEnabled(false);
  }, [focused, connected, setMetricsEnabled]);
  const state = connected
    ? connection.remote
    : saved?.camera
      ? previewPreset(saved.camera, saved.preset)
      : null;
  const command = (action: CaptureAction) => {
    if (!saved || applyingPreset) return;
    if (connected) {
      const current = connection.getRemote()?.settings;
      void connection
        .command(
          typeof action === 'object' && current
            ? { ...action, revision: current.revision }
            : action,
        )
        .catch(report);
    } else {
      void deviceRegistry
        .savePreset(saved.id, (previous) => {
          const preset = previous ?? { settings: [] };
          if (typeof action === 'string') {
            if (action === 'mode-photo' || action === 'mode-video' || action === 'mode-cinematic')
              return {
                ...preset,
                mode:
                  action === 'mode-photo'
                    ? 'photo'
                    : action === 'mode-video'
                      ? 'video'
                      : 'cinematic',
                settings: preset.settings.filter(
                  (s) =>
                    !['profile', 'timer', 'flash', 'timerLight', 'stabilization', 'audio'].includes(
                      s.key,
                    ),
                ),
              };
            return preset;
          }
          if (action.key === 'focus') return preset;
          return {
            ...preset,
            settings: [
              ...preset.settings.filter(
                (s) =>
                  s.key !== action.key &&
                  !(
                    action.key === 'position' &&
                    ['profile', 'zoom', 'exposure', 'flash'].includes(s.key)
                  ),
              ),
              { key: action.key, value: action.value },
            ],
          } as typeof preset;
        })
        .catch(report);
    }
  };
  const quality = connected ? linkQuality(connection.quality) : null;
  const sample = connected ? connection.quality : null;
  const availability = connected
    ? 'Connected'
    : row
      ? availabilityLabels[row.availability]
      : 'Not connected';
  const sections: SettingsPageProps['sections'] = saved
    ? [
        {
          title: 'This camera',
          rows: [
            {
              kind: 'name',
              id: saved.id,
              label: 'Name on this phone',
              value: saved.name,
              onSave: (name) => deviceRegistry.rename(saved.id, name),
            },
            {
              kind: 'group',
              label: 'Connection',
              icon: quality ? `link${quality.bars}` : 'wifi',
              rows: [
                { kind: 'value', label: 'Availability', value: availability, icon: 'device' },
                {
                  kind: 'value',
                  label: 'Signal quality',
                  value: quality?.label ?? 'Connect to measure',
                },
                {
                  kind: 'value',
                  label: 'Last connected',
                  value: new Date(saved.lastConnectedAt).toLocaleString('en-US'),
                },
                {
                  kind: 'value',
                  label: 'Round-trip delay',
                  value: sample?.rtt != null ? `${Math.round(sample.rtt)} ms` : 'Not measured',
                },
                {
                  kind: 'value',
                  label: 'Packet loss',
                  value:
                    sample?.loss != null ? `${(sample.loss * 100).toFixed(1)}%` : 'Not measured',
                },
                { kind: 'value', label: 'Connection service', value: saved.server },
              ],
            },
          ],
          footer:
            'Keep Camera open on this phone, with both phones on the same Wi-Fi network. Link measurements run only on this page.',
        },
      ]
    : [
        {
          title: 'Camera unavailable',
          rows: [],
          footer: 'Return to My cameras and select a saved device.',
        },
      ];
  if (state) {
    const disabled = applyingPreset || (connected && (connection.sending || !state.canCapture));
    const framingDisabled =
      applyingPreset ||
      (connected &&
        (connection.sending || !state.ready || !(state.canCapture || state.phase === 'recording')));
    sections.push({
      title: connected ? 'Settings on camera phone' : 'Preset for next connection',
      rows: remoteSettingsSections(state, command, disabled, framingDisabled)
        .filter((s) => s.rows.length)
        .map((section) => ({
          kind: 'group',
          label: section.title,
          icon: section.title === 'Capture' ? 'camera' : 'settings',
          rows: section.rows,
        })),
      footer: connected
        ? 'Changes apply to the phone capturing the image. Originals are saved in its gallery.'
        : 'Options are from this camera’s last connection. Saved choices are checked and applied when you connect. A mode or lens change may require connecting to load its formats.',
    });
  } else if (saved) {
    sections.push({
      title: 'Preset for next connection',
      rows: [
        {
          kind: 'choice',
          label: 'Capture mode',
          value: saved.preset?.mode ?? 'photo',
          options: [
            { label: 'Photo', value: 'photo' },
            { label: 'Video', value: 'video' },
          ],
          onChange: (mode) => command(mode === 'photo' ? 'mode-photo' : 'mode-video'),
        },
      ],
      footer: 'Connect once with this version to load the camera’s available formats and controls.',
    });
  }
  if (connected)
    sections.push({
      title: 'On this monitor',
      rows: [{ kind: 'toggle', label: 'Fill preview screen', value: fill, onChange: setFill }],
    });
  if (saved?.preset)
    sections.push({
      title: 'Saved preset',
      rows: [
        {
          kind: 'action',
          label: applyingPreset ? 'Applying preset…' : 'Discard preset',
          icon: 'settings',
          disabled: applyingPreset,
          onPress: () => {
            void deviceRegistry.savePreset(saved.id, () => undefined).catch(report);
          },
        },
      ],
      footer: 'The preset stays saved until every change has been confirmed by the camera.',
    });
  if (saved)
    sections.push({
      title: 'Pairing',
      rows: [
        {
          kind: 'action',
          label: 'Forget this camera',
          destructive: true,
          onPress: () =>
            Alert.alert('Forget this camera?', 'You can pair it again with its connection code.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Forget',
                style: 'destructive',
                onPress: () => {
                  if (connected) connection.stop();
                  void deviceRegistry
                    .forget(saved.id)
                    .then(() => router.dismissTo('/monitor'))
                    .catch(report);
                },
              },
            ]),
        },
      ],
    });
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Camera', headerShown: true }} />
      <DeviceConnect
        connected={connected}
        disabled={applyingPreset || (!connected && !row?.descriptor)}
        onConnect={() => {
          if (connected) router.dismissTo('/monitor');
          else if (row?.descriptor) {
            const descriptor = row.descriptor;
            void deviceRegistry
              .getDevice(row.device.id)
              .then((latest) => {
                if (latest) connectTo(descriptor, latest);
              })
              .catch(report);
          }
        }}
      />
      <StatusBar style="auto" />
      <SettingsPage
        sections={sections}
        {...(saved
          ? { header: { title: saved.name, subtitle: availability, icon: 'device' as const } }
          : {})}
      />
    </View>
  );
}
