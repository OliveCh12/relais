import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useCaptureSession } from '@/capture/SessionContext';
import type { CameraSetting } from '@/capture/settings';
import type { CaptureAction } from '@/capture/protocol';
import { SettingsPage } from '@/components/SettingsPage';
import type { SettingsPageProps, SettingsRow } from '@/components/SettingsPage.types';
import {
  closestRecordingProfile,
  recordingResolutionLabel,
} from '../../modules/relais-camera-engine/src/recordingProfiles';

export default function RemoteSettings() {
  const { connection } = useCaptureSession();
  const remote = connection.remote;
  const settings = remote?.settings;
  const name = connection.device?.name ?? 'Camera phone';
  const disabled = !connection.connected || connection.sending || !remote?.canCapture;
  const framingDisabled =
    !connection.connected ||
    connection.sending ||
    !remote?.ready ||
    !(remote.canCapture || remote.phase === 'recording');
  const command = (action: CaptureAction) => {
    const framing = typeof action === 'object' && ['zoom', 'grid'].includes(action.key);
    if (framing ? framingDisabled : disabled) return;
    void connection
      .command(action)
      .catch((error: unknown) =>
        Alert.alert(
          name,
          error instanceof Error ? error.message : 'Could not change camera settings.',
        ),
      );
  };
  const change = (value: CameraSetting) => {
    if (settings) command({ type: 'settings', revision: settings.revision, ...value });
  };
  const sections: SettingsPageProps['sections'] = [
    {
      title: name,
      footer:
        'These settings apply to the phone capturing your photos and videos. Originals are saved in that phone’s gallery.',
      rows: [
        {
          kind: 'value',
          label: 'Camera settings',
          value: connection.connected
            ? connection.sending
              ? 'Applying on camera…'
              : remote?.quality || 'Waiting for camera…'
            : 'Disconnected',
          icon: 'camera',
        },
      ],
    },
  ];
  if (settings && remote && connection.connected) {
    const selected = settings.profiles.find((p) => p.id === settings.profile);
    const selectProfile = (patch: Partial<NonNullable<typeof selected>>) => {
      if (!selected) return;
      const next = closestRecordingProfile(settings.profiles, { ...selected, ...patch });
      if (next) {
        const profile = settings.profiles.find(
          (p) => p.height === next.height && p.fps === next.fps && p.hdr === next.hdr,
        );
        if (profile) change({ key: 'profile', value: profile.id });
      }
    };
    const captureRows: SettingsRow[] = [
      {
        kind: 'choice',
        label: 'Capture mode',
        value: remote.mode,
        disabled,
        options: remote.modes.map((value) => ({
          value,
          label: value === 'cinematic' ? 'Cinematic' : value === 'photo' ? 'Photo' : 'Video',
        })),
        onChange: (value) => {
          if (remote.modes.includes(value as typeof remote.mode))
            command(`mode-${value}` as CaptureAction);
        },
      },
      {
        kind: 'choice',
        label: 'Camera',
        value: settings.position,
        disabled: disabled || !settings.canFlip,
        options: [
          { label: 'Rear camera', value: 'back' },
          { label: 'Front camera', value: 'front' },
        ],
        onChange: (value) => {
          if (value === 'front' || value === 'back') change({ key: 'position', value });
        },
      },
    ];
    if (settings.maxZoom > settings.minZoom)
      captureRows.push({
        kind: 'slider',
        label: `Zoom · ${Number(settings.zoom.toFixed(1))}×`,
        value: settings.zoom,
        min: settings.minZoom,
        max: settings.maxZoom,
        disabled: framingDisabled,
        onChange: (value) => change({ key: 'zoom', value }),
      });
    captureRows.push({
      kind: 'toggle',
      label: 'Grid on camera',
      value: settings.grid,
      disabled: framingDisabled,
      onChange: (value) => change({ key: 'grid', value }),
    });
    sections.push({
      title: 'Capture',
      rows: captureRows,
      footer: 'Focus, exposure and white balance adjust automatically on the camera phone.',
    });
    if (remote.mode !== 'photo' && selected) {
      const heights = [...new Set(settings.profiles.map((p) => p.height))].sort((a, b) => b - a);
      const rates = [
        ...new Set(
          settings.profiles
            .filter((p) => p.height === selected.height && p.hdr === selected.hdr)
            .map((p) => p.fps),
        ),
      ].sort((a, b) => a - b);
      sections.push({
        title: 'Original video',
        rows: [
          {
            kind: 'choice',
            label: 'Resolution',
            value: String(selected.height),
            disabled,
            options: heights.map((height) => ({
              value: String(height),
              label: recordingResolutionLabel(height),
            })),
            onChange: (value) => selectProfile({ height: Number(value) }),
          },
          {
            kind: 'choice',
            label: 'Frame rate',
            value: String(selected.fps),
            disabled,
            options: rates.map((fps) => ({ value: String(fps), label: `${fps} fps` })),
            onChange: (value) => selectProfile({ fps: Number(value) }),
          },
          {
            kind: 'toggle',
            label: 'HDR video',
            value: selected.hdr,
            disabled:
              disabled ||
              !settings.profiles.some(
                (p) =>
                  p.height === selected.height && p.fps === selected.fps && p.hdr !== selected.hdr,
              ),
            onChange: (hdr) => selectProfile({ hdr }),
          },
          {
            kind: 'toggle',
            label: 'Record audio',
            value: settings.audio,
            disabled,
            onChange: (value) => change({ key: 'audio', value }),
          },
          {
            kind: 'toggle',
            label: 'Stabilization',
            value: settings.stabilization,
            disabled: disabled || !settings.canStabilize,
            onChange: (value) => change({ key: 'stabilization', value }),
          },
        ],
        footer:
          'Options come from the camera phone. Changing a setting may briefly pause the live view. The shared preview uses a separate, reduced SDR stream.',
      });
    }
  } else if (connection.connected) {
    sections.push({
      title: 'Camera',
      rows: [],
      footer:
        'Waiting for camera settings. Make sure both phones have the latest version of Relais.',
    });
  }
  sections.push({
    title: 'Connection',
    rows: [
      {
        kind: 'action',
        label: 'Connection information',
        icon: 'info',
        onPress: () => router.push('/monitor/info'),
      },
    ],
  });
  return (
    <>
      <Stack.Screen options={{ title: 'Camera settings' }} />
      <SettingsPage sections={sections} />
    </>
  );
}
