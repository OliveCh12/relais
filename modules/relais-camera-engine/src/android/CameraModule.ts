import { NativeModule, requireNativeModule } from 'expo';
import type { RecordingProfile } from '../recordingProfiles';
import type { PreviewTrackInfo } from '../previewTrack';
import type { CameraHardware } from '../../../../src/capture/hardware';

declare class AndroidCameraModule extends NativeModule {
  getHardware(): CameraHardware;
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
