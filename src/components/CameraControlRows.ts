import type { CameraControls, CameraSetting } from '@/capture/settings';
import type { SettingsPageProps, SettingsRow } from './SettingsPage.types';

export function cameraControlSections(
  controls: CameraControls | undefined,
  photo: boolean,
  disabled: boolean,
  framingDisabled: boolean,
  change: (setting: CameraSetting) => void,
): SettingsPageProps['sections'] {
  if (!controls) return [];
  const sections: SettingsPageProps['sections'] = [];
  if (controls.maxExposure > controls.minExposure)
    sections.push({
      id: 'brightness',
      title: 'Brightness',
      footer: 'Exposure stays automatic. This adjustment makes the image lighter or darker.',
      rows: [
        {
          kind: 'slider',
          label: `Exposure · ${controls.exposure.toFixed(1)} EV`,
          value: controls.exposure,
          min: controls.minExposure,
          max: controls.maxExposure,
          disabled: framingDisabled,
          onChange: (value) => change({ key: 'exposure', value }),
        },
        {
          kind: 'action',
          label: 'Reset brightness',
          disabled: framingDisabled || controls.exposure === 0,
          onPress: () => change({ key: 'exposure', value: 0 }),
        },
      ],
    });
  if (photo) {
    const rows: SettingsRow[] = [
      {
        kind: 'choice',
        label: 'Timer',
        value: String(controls.timer),
        disabled,
        options: [
          { label: 'Off', value: '0' },
          { label: '3 seconds', value: '3' },
          { label: '10 seconds', value: '10' },
        ],
        onChange: (value) => {
          const seconds = Number(value);
          if (seconds === 0 || seconds === 3 || seconds === 10)
            change({ key: 'timer', value: seconds });
        },
      },
    ];
    if (controls.timerLight !== undefined)
      rows.push({
        kind: 'toggle',
        label: 'Timer light',
        value: controls.timerLight,
        disabled: disabled || controls.timer === 0,
        onChange: (value) => change({ key: 'timerLight', value }),
      });
    if (controls.hasFlash)
      rows.push({
        kind: 'choice',
        label: 'Flash',
        value: controls.flash,
        disabled,
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Off', value: 'off' },
          { label: 'On', value: 'on' },
        ],
        onChange: (value) => {
          if (value === 'auto' || value === 'off' || value === 'on')
            change({ key: 'flash', value });
        },
      });
    sections.push({
      id: 'photo',
      title: 'Photo',
      rows,
      footer: 'The timer runs on the camera phone. Tap the shutter again to cancel.',
    });
  }
  return sections;
}
