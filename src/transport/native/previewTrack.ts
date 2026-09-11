import type { PreviewTrackInfo } from '../../../modules/relais-camera-engine/src/previewTrack';
export async function createPreviewTrack(): Promise<PreviewTrackInfo> {
  throw new Error('Native camera preview requires iOS or Android.');
}
