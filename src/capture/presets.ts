import { parseCaptureState, type CaptureMode, type CaptureState } from './protocol';
import { parseSettingsAction, type CameraSetting } from './settings';

export type PresetSetting = Exclude<CameraSetting, { key: 'focus' }>;
export interface CameraPreset {
  mode?: CaptureMode;
  settings: PresetSetting[];
}
export function parsePreset(value: unknown): CameraPreset | undefined {
  if (!value || typeof value !== 'object') return;
  const p = value as CameraPreset;
  if (p.mode !== undefined && !['photo', 'video', 'cinematic'].includes(p.mode)) return;
  if (!Array.isArray(p.settings) || p.settings.length > 12) return;
  const settings: PresetSetting[] = [];
  for (const candidate of p.settings) {
    const item = parseSettingsAction({ ...candidate, type: 'settings', revision: 0 });
    if (!item || item.key === 'focus' || settings.some((previous) => previous.key === item.key))
      return;
    settings.push({ key: item.key, value: item.value } as PresetSetting);
  }
  return { ...(p.mode ? { mode: p.mode } : {}), settings };
}
export function cameraSnapshot(state: CaptureState): CaptureState | undefined {
  return (
    parseCaptureState({
      ...state,
      phase: 'idle',
      ready: true,
      canCapture: true,
      canShare: false,
      message: '',
      startedAt: 0,
    }) ?? undefined
  );
}
export function previewPreset(state: CaptureState, preset?: CameraPreset): CaptureState {
  if (!preset || !state.settings) return state;
  const next: CaptureState = {
    ...state,
    settings: {
      ...state.settings,
      ...(state.settings.controls ? { controls: { ...state.settings.controls } } : {}),
    },
  };
  if (preset.mode) next.mode = preset.mode;
  const settings = next.settings!;
  for (const item of preset.settings) {
    switch (item.key) {
      case 'exposure':
      case 'timer':
      case 'flash':
      case 'timerLight':
        if (settings.controls) Object.assign(settings.controls, { [item.key]: item.value });
        break;
      default:
        Object.assign(settings, { [item.key]: item.value });
    }
  }
  // A format catalogue only describes the mode and lens last reported by the camera.
  if (next.mode !== state.mode || settings.position !== state.settings.position) {
    settings.profiles = [];
    settings.profile = null;
  }
  return next;
}
export function supportsSetting(state: CaptureState, setting: PresetSetting): boolean {
  const s = state.settings;
  if (!s) return false;
  switch (setting.key) {
    case 'profile':
      return state.mode !== 'photo' && s.profiles.some((p) => p.id === setting.value);
    case 'position':
      return s.position === setting.value || s.canFlip;
    case 'zoom':
      return setting.value >= s.minZoom && setting.value <= s.maxZoom;
    case 'exposure':
      return (
        !!s.controls &&
        setting.value >= s.controls.minExposure &&
        setting.value <= s.controls.maxExposure
      );
    case 'timer':
      return state.mode === 'photo' && !!s.controls;
    case 'flash':
      return state.mode === 'photo' && !!s.controls?.hasFlash;
    case 'timerLight':
      return state.mode === 'photo' && s.controls?.timerLight !== undefined;
    case 'stabilization':
      return state.mode !== 'photo' && s.canStabilize;
    case 'audio':
      return state.mode !== 'photo';
    case 'grid':
      return true;
  }
}
