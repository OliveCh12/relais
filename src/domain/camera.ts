export type Role = 'camera' | 'monitor';
export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';

export interface FileQuality {
  id: string;
  width: number;
  height: number;
  fps: number;
  hdr: boolean;
  codec: 'h264' | 'hevc' | 'prores';
}

export interface LensCapability {
  id: string;
  label: string;
  position: 'front' | 'back';
  zoom: { min: number; max: number };
  torch: boolean;
  fileQualities: FileQuality[];
}

export interface PreviewQuality {
  width: number;
  height: number;
  fps: number;
  maxBitrate: number;
}

export interface CameraCapabilities {
  schemaVersion: 1;
  source: 'stub' | 'device';
  canPreview: boolean;
  canRecord: boolean;
  lenses: LensCapability[];
  previewQualities: PreviewQuality[];
}

export interface CameraConfiguration {
  lens: string;
  zoom: number;
  torch: boolean;
  fileQuality: FileQuality;
  previewQuality: PreviewQuality;
}

export interface CameraEvents {
  thermal: { state: ThermalState };
  battery: { level: number | null; charging: boolean };
  droppedFrames: { output: 'file' | 'preview'; count: number };
  recordingStarted: { recordingId: string };
  error: { code: string; message: string };
}

export type CameraEventListeners = {
  [K in keyof CameraEvents]: (payload: CameraEvents[K]) => void;
};
