import { NativeModule, requireNativeModule } from 'expo';
import type { RecordingProfile } from '../recordingProfiles';
import type { PreviewTrackInfo } from '../previewTrack';

declare class AndroidCameraModule extends NativeModule {
  openGallery(): Promise<void>;
  getExposureStep(deviceId: string): Promise<number>;
  initializePreviewOutput(): void;
  getPreviewRotation(): number;
  createPreviewTrack(): Promise<PreviewTrackInfo>;
  createPhotoPath(): Promise<string>;
  getRecordingProfiles(deviceId: string, stabilization: boolean): Promise<RecordingProfile[]>;
  createRecordingPath(): Promise<string>;
  getPendingRecordings(): Promise<string[]>;
  saveVideoToLibrary(path: string): Promise<string>;
}

export default requireNativeModule<AndroidCameraModule>('RelaisCameraEngine');
