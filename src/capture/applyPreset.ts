import { supportsSetting, type CameraPreset } from './presets';
import type { CaptureAction, CaptureState } from './protocol';
import { settingOrder } from './settingPolicy';

export async function applyCameraPreset(
  preset: CameraPreset,
  getState: () => CaptureState,
  command: (action: CaptureAction) => Promise<unknown>,
) {
  const initial = getState();
  if (preset.mode && preset.mode !== initial.mode) {
    if (!initial.modes.includes(preset.mode))
      throw new Error('This capture mode is unavailable on the camera. Your preset has been kept.');
    await command(`mode-${preset.mode}`);
  }
  const settings = [...preset.settings].sort((a, b) => settingOrder(a.key) - settingOrder(b.key));
  for (const setting of settings) {
    const state = getState();
    if (!state.ready || !state.settings || !supportsSetting(state, setting))
      throw new Error(
        `The saved ${setting.key} setting is unavailable with this camera configuration. Review the device settings. Your preset has been kept.`,
      );
    await command({ ...setting, type: 'settings', revision: state.settings.revision });
  }
}
