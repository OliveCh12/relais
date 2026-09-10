import { mockCapabilities } from '../../capabilities/mock';
import type { RelaisCameraEngine } from '../api';

async function unavailable(): Promise<never> {
  throw new Error('ERR_CAMERA_ENGINE_STUB : the native camera pipeline is not implemented.');
}

export const webCameraEngine: RelaisCameraEngine = {
  getCapabilities: async () => structuredClone(mockCapabilities),
  configure: unavailable,
  startPreview: unavailable,
  stopPreview: unavailable,
  startRecording: unavailable,
  stopRecording: unavailable,
  addListener: () => ({ remove() {} }),
};
