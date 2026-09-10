import type { RecordingProfile } from '../../modules/relais-camera-engine/src';

export interface CameraOptionsProps {
  visible: boolean;
  onClose: () => void;
  audio: boolean;
  onAudio: (value: boolean) => void;
  grid: boolean;
  onGrid: (value: boolean) => void;
  quality: string;
  disabled: boolean;
  profiles: RecordingProfile[];
  selectedProfile: RecordingProfile | null;
  onProfile: (profile: RecordingProfile) => void;
  stabilization: boolean;
  canStabilize: boolean;
  onStabilization: (value: boolean) => void;
  exposure: number;
  minExposure: number;
  maxExposure: number;
  onExposure: (value: number) => void;
  onAutoFocus: () => void;
}
