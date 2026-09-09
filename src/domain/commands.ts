import type { CameraConfiguration } from './camera';

export type CameraCommand =
  | { id: string; type: 'start-recording' }
  | { id: string; type: 'stop-recording' }
  | { id: string; type: 'configure'; configuration: CameraConfiguration };

export type CommandResult =
  | { id: string; ok: true; recording: 'idle' | 'recording' }
  | { id: string; ok: false; code: string; message: string };
