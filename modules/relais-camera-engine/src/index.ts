import { NativeModule, requireNativeModule } from 'expo';
import type {
  CameraCapabilities,
  CameraConfiguration,
  CameraEventListeners,
} from '../../../src/domain/camera';
import type { CaptureState, CaptureAction } from '../../../src/capture/protocol';

declare class RelaisCameraEngineModule extends NativeModule<CameraEventListeners> {
  initializePreviewOutput(): void;
  createPreviewTrack(): Promise<{
    id: string;
    kind: string;
    remote: boolean;
    enabled: boolean;
    readyState: 'live';
    peerConnectionId: number;
    constraints: object;
    settings: object;
  }>;
  createPhotoPath(): Promise<string>;
  captureAction(action: CaptureAction): Promise<CaptureState>;
  getCaptureState(): Promise<CaptureState>;
  getRecordingProfiles(deviceId: string, stabilization: boolean): Promise<RecordingProfile[]>;
  getCapabilities(): Promise<CameraCapabilities>;
  configure(configuration: CameraConfiguration): Promise<void>;
  startPreview(): Promise<void>;
  stopPreview(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  createRecordingPath(): Promise<string>;
  getPendingRecordings(): Promise<string[]>;
  saveVideoToLibrary(path: string): Promise<string>;
}

export interface RecordingProfile {
  height: number;
  fps: number;
  hdr: boolean;
}

export default requireNativeModule<RelaisCameraEngineModule>('RelaisCameraEngine');
