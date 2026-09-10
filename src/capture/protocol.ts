import {
  parseCameraSettings,
  parseSettingsAction,
  type CameraSettings,
  type SettingsAction,
} from './settings';
export type CaptureMode = 'photo' | 'video' | 'cinematic';
export type CaptureAction =
  | 'photo'
  | 'start'
  | 'stop'
  | 'cancel-timer'
  | 'retry-save'
  | 'mode-photo'
  | 'mode-video'
  | 'mode-cinematic'
  | SettingsAction;
export interface CaptureState {
  mode: CaptureMode;
  modes: CaptureMode[];
  phase: string;
  ready: boolean;
  canShare: boolean;
  canCapture: boolean;
  quality: string;
  message: string;
  startedAt: number;
  settings?: CameraSettings;
}
export const emptyCaptureState: CaptureState = {
  mode: 'photo',
  modes: ['photo', 'video'],
  phase: 'idle',
  ready: false,
  canShare: false,
  canCapture: false,
  quality: '',
  message: '',
  startedAt: 0,
};
const actions = new Set<string>([
  'photo',
  'start',
  'stop',
  'cancel-timer',
  'retry-save',
  'mode-photo',
  'mode-video',
  'mode-cinematic',
]);
export interface CaptureRequest {
  type: 'capture-command';
  id: string;
  sequence: number;
  action: CaptureAction;
}
export interface CaptureReply {
  type: 'capture-reply';
  id: string;
  ok: boolean;
  error?: string;
  state?: CaptureState;
}
export function parseMessage(text: unknown): Record<string, unknown> | null {
  if (typeof text !== 'string' || text.length > 32768) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
export function parseRequest(value: Record<string, unknown>): CaptureRequest | null {
  const action =
    typeof value.action === 'string' && actions.has(value.action)
      ? value.action
      : parseSettingsAction(value.action);
  return value.type === 'capture-command' &&
    typeof value.id === 'string' &&
    /^[a-zA-Z0-9-]{1,80}$/.test(value.id) &&
    action &&
    typeof value.sequence === 'number' &&
    Number.isSafeInteger(value.sequence) &&
    value.sequence > 0
    ? {
        type: 'capture-command',
        id: value.id,
        sequence: value.sequence,
        action: action as CaptureAction,
      }
    : null;
}
export function parseCaptureState(value: unknown): CaptureState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as CaptureState;
  const validMode = (mode: unknown) =>
    typeof mode === 'string' && ['photo', 'video', 'cinematic'].includes(mode);
  if (
    !validMode(state.mode) ||
    !Array.isArray(state.modes) ||
    state.modes.length > 3 ||
    !state.modes.every(validMode) ||
    !state.modes.includes(state.mode) ||
    ![
      'idle',
      'starting',
      'recording',
      'stopping',
      'countdown',
      'capturing',
      'saving',
      'saved',
      'pending',
      'error',
    ].includes(state.phase) ||
    typeof state.ready !== 'boolean' ||
    typeof state.canShare !== 'boolean' ||
    typeof state.canCapture !== 'boolean' ||
    typeof state.quality !== 'string' ||
    state.quality.length > 120 ||
    typeof state.message !== 'string' ||
    state.message.length > 2000 ||
    typeof state.startedAt !== 'number' ||
    !Number.isFinite(state.startedAt)
  )
    return null;
  const settings = state.settings === undefined ? undefined : parseCameraSettings(state.settings);
  if (settings === null) return null;
  return {
    ...(settings ? { settings } : {}),
    mode: state.mode,
    modes: state.modes,
    phase: state.phase,
    ready: state.ready,
    canShare: state.canShare,
    canCapture: state.canCapture,
    quality: state.quality,
    message: state.message,
    startedAt: state.startedAt,
  };
}
