import { NativeModules, Platform } from 'react-native';
import { MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import NativeEngine from '../../../modules/relais-camera-engine/src';
export type { MediaStream };
export async function openNativePreview(): Promise<MediaStream> {
  const info =
    Platform.OS === 'ios'
      ? await NativeModules.RelaisPreviewBridge.createPreviewTrack()
      : await NativeEngine.createPreviewTrack();
  return new MediaStream([new MediaStreamTrack(info)]);
}
