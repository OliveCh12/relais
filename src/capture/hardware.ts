export interface CameraHardware {
  platform: 'ios' | 'android';
  manufacturer: string;
  model: string;
  osVersion: string;
}

export function parseCameraHardware(value: unknown): CameraHardware | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const hardware = value as CameraHardware;
  if (
    !['ios', 'android'].includes(hardware.platform) ||
    ![hardware.manufacturer, hardware.model, hardware.osVersion].every(
      (text) =>
        typeof text === 'string' &&
        text.trim().length > 0 &&
        text.length <= 120 &&
        !/[\u0000-\u001f\u007f]/.test(text),
    )
  )
    return null;
  return {
    platform: hardware.platform,
    manufacturer: hardware.manufacturer,
    model: hardware.model,
    osVersion: hardware.osVersion,
  };
}
