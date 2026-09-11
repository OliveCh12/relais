import type { CameraControls, CameraSetting } from '@/capture/settings';
import type { RecordingProfile } from '../../modules/relais-camera-engine/src/recordingProfiles';

export interface CameraOptionsProps {
  controls?: CameraControls;
  onSetting?: (setting: CameraSetting) => void;
  visible: boolean;
  onClose: () => void;
  audio: boolean;
  onAudio: (value: boolean) => void;
  stabilization: boolean;
  canStabilize: boolean;
  grid: boolean;
  onGrid: (value: boolean) => void;
  quality: string;
  disabled: boolean;
  profiles: RecordingProfile[];
  selectedProfile: RecordingProfile | null;
  onProfile: (profile: RecordingProfile) => void;
  mode: 'photo' | 'video' | 'cinematic';
}
