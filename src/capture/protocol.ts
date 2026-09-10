export type CaptureMode = 'photo' | 'video' | 'cinematic';
export type CaptureAction =
  'photo' | 'start' | 'stop' | 'mode-photo' | 'mode-video' | 'mode-cinematic';
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
}
export function parseMessage(text: unknown): Record<string, unknown> | null {
  if (typeof text !== 'string' || text.length > 8192) return null;
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
  return value.type === 'capture-command' &&
    typeof value.id === 'string' &&
    /^[a-zA-Z0-9-]{1,80}$/.test(value.id) &&
    typeof value.action === 'string' &&
    actions.has(value.action) &&
    typeof value.sequence === 'number' &&
    Number.isSafeInteger(value.sequence) &&
    value.sequence > 0
    ? {
        type: 'capture-command',
        id: value.id,
        sequence: value.sequence,
        action: value.action as CaptureAction,
      }
    : null;
}
export function parseCaptureState(value: unknown): CaptureState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as CaptureState;
  const validMode = (mode: unknown) => ['photo', 'video', 'cinematic'].includes(String(mode));
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
  return {
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
