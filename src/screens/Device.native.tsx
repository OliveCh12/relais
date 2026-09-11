import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCaptureSession } from '@/capture/SessionContext';
import { cameraSettingsSections } from '@/components/cameraSettingsSections';
import { previewPreset } from '@/capture/presets';
import type { CaptureAction } from '@/capture/protocol';
import { SettingsPage } from '@/components/SettingsPage';
import type { IconName } from '@/components/icons/types';
import type { SettingsPageProps, SettingsRow } from '@/components/SettingsPage.types';
import { DeviceConnect } from '@/components/connection/DeviceConnect';
import { useDevices } from '@/connections/useDevices';
import { deviceRegistry } from '@/connections/storage';
import { availabilityLabels } from '@/connections/model';
import { linkQuality } from '@/connections/quality';
import { useAppTheme } from '@/design/useAppTheme';

const categoryIcons: Record<string, IconName> = {
  capture: 'camera',
  video: 'video',
  photo: 'photo',
  brightness: 'sun',
};
const choiceIcons: Record<string, IconName> = {
  Timer: 'timer',
  Flash: 'torch',
  Camera: 'flip',
  'Capture mode': 'camera',
  Resolution: 'video',
  'Frame rate': 'video',
};

const reportedErrors = new WeakSet<Error>();
function report(error: unknown) {
  if (error instanceof Error) {
    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);
  }
  Alert.alert('Camera settings', error instanceof Error ? error.message : 'Please try again.');
}
export default function DeviceScreen() {
  const { connection, connectTo, fill, setFill, applyingPreset } = useCaptureSession();
  const params = useLocalSearchParams<{ id?: string; page?: string; field?: string }>();
  const page = params.page;
  const field = params.field;
  const id = params.id || connection.device?.id;
  const focused = useIsFocused();
  const connected = connection.connected && connection.device?.id === id;
  const devices = useDevices(
    connection.server,
    focused && !connected && (!page || page === 'connection'),
    id,
  );
  const row = devices.rows.find((item) => item.device.id === id);
  const saved = row?.device;
  const theme = useAppTheme();
  const { setMetricsEnabled } = connection;
  useEffect(() => {
    if (!focused) return;
    setMetricsEnabled(connected && page === 'connection');
    return () => setMetricsEnabled(false);
  }, [focused, connected, page, setMetricsEnabled]);
  const state = connected
    ? connection.settingsPreview
    : saved?.camera
      ? previewPreset(saved.camera, saved.preset)
      : null;
  const hardware = state?.hardware;
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
  const open = (page: string, field?: string) => {
    if (id)
      router.push({
        pathname: '/monitor/device-settings',
        params: { id, page, ...(field ? { field } : {}) },
      });
  };
  const configuring = connection.settingsPending && ['idle', 'saved'].includes(state?.phase ?? '');
  const capturePending = connection.sending && !connection.settingsPending;
  const disabled =
    applyingPreset || (connected && (capturePending || (!state?.canCapture && !configuring)));
  const framingDisabled =
    applyingPreset ||
    (connected &&
      (capturePending ||
        ((!state?.ready || !(state.canCapture || state.phase === 'recording')) && !configuring)));
  const categories = state
    ? cameraSettingsSections(state, command, disabled, framingDisabled).filter(
        (section) => section.id,
      )
    : [];
  if (!categories.some((section) => section.id === 'capture'))
    categories.unshift({
      id: 'capture',
      title: 'Capture',
      rows: [
        {
          kind: 'choice',
          label: 'Capture mode',
          value: saved?.preset?.mode ?? 'photo',
          disabled,
          options: [
            { label: 'Photo', value: 'photo' },
            { label: 'Video', value: 'video' },
          ],
          onChange: (mode) => command(mode === 'photo' ? 'mode-photo' : 'mode-video'),
        },
      ],
      footer: 'Connect once to load the camera’s available formats and controls.',
    });
  if (!categories.some((section) => section.id === 'video'))
    categories.push({
      id: 'video',
      title: 'Video',
      rows:
        state?.mode === 'photo'
          ? [
              {
                kind: 'action',
                label: 'Use Video mode',
                icon: 'record',
                disabled,
                onPress: () => command('mode-video'),
              },
            ]
          : [],
      footer:
        state?.mode === 'photo'
          ? 'Choose Video mode to edit its recording quality, audio and stabilization.'
          : 'Connect to load the video formats available with this mode and lens.',
    });
  const context = connected
    ? `${connection.settingsPending ? 'Applying changes… ' : ''}Changes apply to ${saved?.name ?? 'the camera phone'}. Originals stay in its gallery.`
    : 'Changes are saved for this camera and applied when you connect. Available formats are checked again on the camera phone.';
  let title = saved?.name ?? 'Camera';
  let sections: SettingsPageProps['sections'] = [];
  if (!saved)
    sections = [
      {
        title: 'Camera unavailable',
        rows: [],
        footer: 'Return to My cameras and select a saved device.',
      },
    ];
  else if (page === 'connection') {
    title = 'Connection';
    sections = [
      {
        title: saved.name,
        rows: [
          {
            kind: 'name',
            id: saved.id,
            label: 'Name on this phone',
            value: saved.name,
            onSave: (name) => deviceRegistry.rename(saved.id, name),
          },
        ],
        footer: 'This name helps you identify the camera on this phone.',
      },
      {
        title: 'Camera phone',
        rows: hardware
          ? [
              { kind: 'value', label: 'Manufacturer', value: hardware.manufacturer },
              { kind: 'value', label: 'Hardware model', value: hardware.model },
              {
                kind: 'value',
                label: 'Operating system',
                value: `${hardware.platform === 'ios' ? 'iOS' : 'Android'} ${hardware.osVersion}`,
              },
            ]
          : [],
        footer: hardware
          ? 'Reported by the camera phone. Available formats are checked against its active camera, not inferred from its name.'
          : 'Connect to load this camera phone’s hardware information.',
      },
      {
        title: 'Network',
        rows: [
          {
            kind: 'name',
            id: `${saved.id}-server`,
            label: 'Connection service address',
            value: saved.serverOverride ?? '',
            maxLength: 300,
            validate: () => undefined,
            onSave: (value) => deviceRegistry.setServerOverride(saved.id, value),
          },
          { kind: 'value', label: 'Default address', value: connection.server || saved.server },
        ],
        footer:
          'Leave empty to use the app’s connection settings. Changes apply to the next connection. Keep Camera open on the other phone and both phones on the same Wi-Fi network.',
      },
      {
        title: 'Connection details',
        rows: [
          { kind: 'value', label: 'Availability', value: availability },
          { kind: 'value', label: 'Signal quality', value: quality?.label ?? 'Connect to measure' },
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
            value: sample?.loss != null ? `${(sample.loss * 100).toFixed(1)}%` : 'Not measured',
          },
        ],
        footer:
          'Link measurements run only while this page is visible. Pairing stays saved until you forget this camera.',
      },
    ];
  } else if (page === 'settings') {
    title = 'Camera Settings';
    sections = [
      {
        title: saved.name,
        footer: context,
        rows: [
          ...categories.map((section): SettingsRow => ({
            kind: 'navigation',
            label: section.title,
            icon: categoryIcons[section.id ?? ''] ?? 'gear',
            onPress: () => open(section.id!),
          })),
          {
            kind: 'navigation',
            label: 'Preset',
            subtitle: saved.preset
              ? 'Changes ready for the next connection'
              : 'Prepare settings before connecting',
            icon: 'preset',
            onPress: () => open('preset'),
          },
        ],
      },
    ];
  } else if (page === 'preset') {
    title = 'Preset';
    sections = [
      {
        title: saved.name,
        footer: context,
        rows: [
          {
            kind: 'value',
            label: 'Saved changes',
            value: saved.preset
              ? `${saved.preset.settings.length + (saved.preset.mode ? 1 : 0)} pending`
              : 'No pending changes',
          },
          ...categories.map((section): SettingsRow => ({
            kind: 'navigation',
            label: section.title,
            icon: categoryIcons[section.id ?? ''] ?? 'gear',
            onPress: () => open(section.id!),
          })),
          ...(saved.preset
            ? [
                {
                  kind: 'action' as const,
                  label: 'Discard pending changes',
                  destructive: true,
                  disabled: applyingPreset,
                  onPress: () => {
                    void deviceRegistry.savePreset(saved.id, () => undefined).catch(report);
                  },
                },
              ]
            : []),
        ],
      },
    ];
  } else if (page === 'preview') {
    title = 'Monitor preview';
    sections = [
      {
        title: 'On this monitor',
        rows: [{ kind: 'toggle', label: 'Fill preview screen', value: fill, onChange: setFill }],
        footer:
          'Only the view on this monitor changes. The original photo or video keeps its camera format.',
      },
    ];
  } else if (page) {
    const section = categories.find((section) => section.id === page);
    title = section?.title ?? 'Camera settings';
    const choice = section?.rows.find((row) => row.kind === 'choice' && row.label === field);
    if (choice?.kind === 'choice') {
      title = choice.label;
      sections = [
        {
          title: saved.name,
          footer: context,
          rows: choice.options.map((option) => ({
            kind: 'option',
            label: option.label,
            selected: choice.value === option.value,
            disabled: choice.disabled ?? false,
            onPress: () => choice.onChange(option.value),
          })),
        },
      ];
    } else if (section)
      sections = [
        {
          ...section,
          footer: `${context} ${section.footer ?? ''}`,
          rows: section.rows.map((row): SettingsRow =>
            row.kind === 'choice'
              ? {
                  kind: 'navigation',
                  label: row.label,
                  subtitle:
                    row.options.find((option) => option.value === row.value)?.label ?? row.value,
                  icon: choiceIcons[row.label] ?? categoryIcons[page] ?? 'gear',
                  onPress: () => open(page, row.label),
                }
              : row,
          ),
        },
      ];
    else
      sections = [
        {
          title: 'Settings unavailable',
          footer:
            'Return to the camera page. These controls may have changed with the capture mode.',
          rows: [],
        },
      ];
  } else {
    sections = [
      {
        title: 'This camera',
        rows: [
          {
            kind: 'navigation',
            label: 'Connection',
            subtitle: 'Name, network and pairing',
            icon: 'wifi',
            onPress: () => open('connection'),
          },
          {
            kind: 'navigation',
            label: 'Camera Settings',
            subtitle: 'Capture options and saved presets',
            icon: 'gear',
            onPress: () => open('settings'),
          },
        ],
      },
      {
        title: 'On this monitor',
        rows: [
          { kind: 'navigation', label: 'Preview', icon: 'monitor', onPress: () => open('preview') },
        ],
      },
      {
        title: 'Pairing',
        rows: [
          {
            kind: 'action',
            label: 'Forget this camera',
            destructive: true,
            onPress: () =>
              Alert.alert(
                'Forget this camera?',
                'You can pair it again with its connection code.',
                [
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
                ],
              ),
          },
        ],
      },
    ];
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: page ? title : 'Camera', headerShown: true }} />
      {!page && (
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
      )}
      <StatusBar style="auto" />
      <SettingsPage
        sections={sections}
        {...(saved && !page
          ? {
              header: {
                title: saved.name,
                subtitle: availability,
                icon: 'device' as const,
                online: connected || row?.availability === 'available',
              },
            }
          : {})}
      />
    </View>
  );
}
