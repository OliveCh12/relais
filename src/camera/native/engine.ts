import NativeCameraEngine from '../../../modules/relais-camera-engine/src';
import { parseCapabilities } from '../../capabilities/validate';
import type { RelaisCameraEngine } from '../api';

export const cameraEngine: RelaisCameraEngine = {
  getCapabilities: async () => parseCapabilities(await NativeCameraEngine.getCapabilities()),
  configure: (configuration) => NativeCameraEngine.configure(configuration),
  startPreview: () => NativeCameraEngine.startPreview(),
  stopPreview: () => NativeCameraEngine.stopPreview(),
  startRecording: () => NativeCameraEngine.startRecording(),
  stopRecording: () => NativeCameraEngine.stopRecording(),
  addListener: (event, listener) => NativeCameraEngine.addListener(event, listener),
};
