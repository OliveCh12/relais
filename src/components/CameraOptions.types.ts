import type { CaptureAction, CaptureState } from '@/capture/protocol';

export interface CameraOptionsProps {
  state: CaptureState;
  onAction: (action: CaptureAction) => void;
  visible: boolean;
  onClose: () => void;
}
