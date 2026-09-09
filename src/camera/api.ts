import type {
  CameraCapabilities,
  CameraConfiguration,
  CameraEvents,
  CameraEventListeners,
} from '../domain/camera';

export interface RelaisCameraEngine {
  getCapabilities(): Promise<CameraCapabilities>;
  configure(configuration: CameraConfiguration): Promise<void>;
  startPreview(): Promise<void>;
  stopPreview(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  addListener<K extends keyof CameraEvents>(
    event: K,
    listener: CameraEventListeners[K],
  ): { remove(): void };
}
