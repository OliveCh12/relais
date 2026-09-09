import type { Role } from '../domain/camera';

export interface SessionState {
  role: Role | null;
  connection: 'idle' | 'pairing' | 'connected' | 'reconnecting';
  recording: 'idle' | 'starting' | 'recording' | 'stopping' | 'failed';
}

export const initialSession: SessionState = {
  role: null,
  connection: 'idle',
  recording: 'idle',
};

export type SessionEvent =
  | { type: 'choose-role'; role: Role }
  | { type: 'connected' }
  | { type: 'transport-lost' }
  | { type: 'recording-requested' }
  | { type: 'recording-confirmed' }
  | { type: 'stop-requested' }
  | { type: 'recording-stopped' }
  | { type: 'recording-failed' }
  | { type: 'close' };

export function transition(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case 'choose-role':
      return state.connection === 'idle'
        ? { ...initialSession, role: event.role, connection: 'pairing' }
        : state;
    case 'connected':
      return state.connection === 'pairing' || state.connection === 'reconnecting'
        ? { ...state, connection: 'connected' }
        : state;
    case 'transport-lost':
      return state.connection === 'connected' ? { ...state, connection: 'reconnecting' } : state;
    case 'recording-requested':
      return state.connection === 'connected' && state.recording === 'idle'
        ? { ...state, recording: 'starting' }
        : state;
    case 'recording-confirmed':
      return state.recording === 'starting' ? { ...state, recording: 'recording' } : state;
    case 'stop-requested':
      return state.recording === 'recording' ? { ...state, recording: 'stopping' } : state;
    case 'recording-stopped':
      return state.recording === 'stopping' ? { ...state, recording: 'idle' } : state;
    case 'recording-failed':
      return state.recording === 'idle' ? state : { ...state, recording: 'failed' };
    case 'close':
      return state.recording === 'idle' || state.recording === 'failed' ? initialSession : state;
  }
}
