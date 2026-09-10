import { Column, Host, ModalBottomSheet, Text } from '@expo/ui/jetpack-compose';
import { paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { SettingsContent } from './SettingsPage.android';
import { cameraControlSections } from './CameraControlRows';
import type { SettingsPageProps } from './SettingsPage.types';
import type { CameraOptionsProps } from './CameraOptions.types';
import {
  closestRecordingProfile,
  recordingResolutionLabel,
} from '../../modules/relais-camera-engine/src/recordingProfiles';

export function CameraOptions(props: CameraOptionsProps) {
  if (!props.visible) return null;
  const selected = props.selectedProfile;
  const select = (changes: Partial<NonNullable<typeof selected>>) => {
    if (!selected) return;
    const next = closestRecordingProfile(props.profiles, { ...selected, ...changes });
    if (next) props.onProfile(next);
  };
  const sections: SettingsPageProps['sections'] = [
    ...cameraControlSections(
      props.controls,
      props.mode === 'photo',
      props.disabled,
      props.disabled,
      (value) => props.onSetting?.(value),
    ),
    {
      title: 'Viewfinder',
      rows: [{ kind: 'toggle', label: 'Grid', value: props.grid, onChange: props.onGrid }],
    },
  ];
  if (props.mode !== 'photo' && selected) {
    const heights = [...new Set(props.profiles.map((p) => p.height))].sort((a, b) => b - a);
    const rates = [
      ...new Set(
        props.profiles
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
          disabled: props.disabled,
          options: heights.map((h) => ({ label: recordingResolutionLabel(h), value: String(h) })),
          onChange: (v) => select({ height: Number(v) }),
        },
        {
          kind: 'choice',
          label: 'Frame rate',
          value: String(selected.fps),
          disabled: props.disabled,
          options: rates.map((fps) => ({ label: `${fps} fps`, value: String(fps) })),
          onChange: (v) => select({ fps: Number(v) }),
        },
        {
          kind: 'toggle',
          label: 'HDR video',
          value: selected.hdr,
          disabled:
            props.disabled ||
            !props.profiles.some(
              (p) =>
                p.height === selected.height && p.fps === selected.fps && p.hdr !== selected.hdr,
            ),
          onChange: (hdr) => select({ hdr }),
        },
        {
          kind: 'toggle',
          label: 'Record audio',
          value: props.audio,
          disabled: props.disabled,
          onChange: props.onAudio,
        },
      ],
      footer: 'Quality applies to the original file saved in this phone’s gallery.',
    });
  }
  return (
    <Host style={{ width: '100%', height: 0 }} colorScheme="dark">
      <ModalBottomSheet onDismissRequest={props.onClose} skipPartiallyExpanded>
        <Column>
          <Text modifiers={[paddingAll(20)]} style={{ typography: 'titleLarge' }}>
            Camera settings
          </Text>
        </Column>
        <SettingsContent sections={sections} />
      </ModalBottomSheet>
    </Host>
  );
}
