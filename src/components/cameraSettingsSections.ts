import { cameraControlSections } from '@/components/CameraControlRows';
import type { CameraSetting } from '@/capture/settings';
import type { CaptureAction, CaptureState } from '@/capture/protocol';
import type { SettingsPageProps, SettingsRow } from '@/components/SettingsPage.types';
import {
  closestRecordingProfile,
  recordingResolutionLabel,
} from '../../modules/relais-camera-engine/src/recordingProfiles';

export function cameraSettingsSections(
  remote: CaptureState,
  command: (action: CaptureAction) => void,
  disabled: boolean,
  framingDisabled: boolean,
  context: 'local' | 'remote' = 'remote',
): SettingsPageProps['sections'] {
  const settings = remote.settings;
  const change = (value: CameraSetting) => {
    if (settings) command({ type: 'settings', revision: settings.revision, ...value });
  };
  const sections: SettingsPageProps['sections'] = [];
  if (settings) {
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
      label: context === 'local' ? 'Grid' : 'Grid on camera',
      value: settings.grid,
      disabled: framingDisabled,
      onChange: (value) => change({ key: 'grid', value }),
    });
    sections.push({
      id: 'capture',
      title: 'Capture',
      rows: captureRows,
      footer:
        'Tap the live image to focus. Adjust brightness in camera settings. White balance stays automatic.',
    });
    sections.push(
      ...cameraControlSections(
        settings.controls,
        remote.mode === 'photo',
        disabled,
        framingDisabled,
        change,
      ),
    );
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
        id: 'video',
        title: 'Video',
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
          'Quality applies to the original saved on the camera phone. Stop recording to change video format, audio or stabilization. The monitor preview has its own quality.',
      });
    }
  } else {
    sections.push({
      title: 'Camera',
      rows: [],
      footer:
        'Waiting for camera settings. Make sure both phones have the latest version of Relais.',
    });
  }
  return sections;
}
