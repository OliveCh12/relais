import { MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import { createPreviewTrack } from './previewTrack';
export type { MediaStream };
export async function openNativePreview(): Promise<MediaStream> {
  const info = await createPreviewTrack();
  return new MediaStream([new MediaStreamTrack(info)]);
}
