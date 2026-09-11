// Historical fixture API. Product capture uses the platform-specific camera modules.
import { NativeModule, requireNativeModule } from 'expo';
import type {
  CameraCapabilities,
  CameraConfiguration,
  CameraEventListeners,
} from '../../../src/domain/camera';

declare class RelaisCameraEngineModule extends NativeModule<CameraEventListeners> {
  getCapabilities(): Promise<CameraCapabilities>;
  configure(configuration: CameraConfiguration): Promise<void>;
  startPreview(): Promise<void>;
  stopPreview(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
}

export type { RecordingProfile } from './recordingProfiles';

export default requireNativeModule<RelaisCameraEngineModule>('RelaisCameraEngine');
