import type { CaptureMode } from '@/capture/protocol';
export interface CaptureModesProps {
  mode: CaptureMode;
  modes: CaptureMode[];
  disabled: boolean;
  onMode: (mode: CaptureMode) => void;
}
export const captureModeLabels = { photo: 'Photo', video: 'Video', cinematic: 'Cinematic' };
