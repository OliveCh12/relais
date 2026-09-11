import { NativeModules } from 'react-native';
import type { PreviewTrackInfo } from '../../../modules/relais-camera-engine/src/previewTrack';
export const createPreviewTrack = (): Promise<PreviewTrackInfo> =>
  NativeModules.RelaisPreviewBridge.createPreviewTrack();
