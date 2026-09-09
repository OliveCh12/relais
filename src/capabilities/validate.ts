import type { CameraCapabilities, CameraConfiguration, FileQuality } from '../domain/camera';

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function isFileQuality(value: unknown): value is FileQuality {
  return (
    object(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    positive(value.width) &&
    positive(value.height) &&
    positive(value.fps) &&
    typeof value.hdr === 'boolean' &&
    ['h264', 'hevc', 'prores'].includes(String(value.codec))
  );
}

export function parseCapabilities(value: unknown): CameraCapabilities {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !['stub', 'device'].includes(String(value.source)) ||
    typeof value.canPreview !== 'boolean' ||
    typeof value.canRecord !== 'boolean' ||
    !Array.isArray(value.lenses) ||
    value.lenses.length === 0 ||
    !value.lenses.every(
      (lens: unknown) =>
        object(lens) &&
        typeof lens.id === 'string' &&
        lens.id.length > 0 &&
        typeof lens.label === 'string' &&
        ['front', 'back'].includes(String(lens.position)) &&
        typeof lens.torch === 'boolean' &&
        object(lens.zoom) &&
        positive(lens.zoom.min) &&
        positive(lens.zoom.max) &&
        lens.zoom.max >= lens.zoom.min &&
        Array.isArray(lens.fileQualities) &&
        lens.fileQualities.length > 0 &&
        lens.fileQualities.every(isFileQuality),
    ) ||
    !Array.isArray(value.previewQualities) ||
    value.previewQualities.length === 0 ||
    !value.previewQualities.every(
      (preview: unknown) =>
        object(preview) &&
        positive(preview.width) &&
        preview.width <= 1920 &&
        positive(preview.height) &&
        preview.height <= 1080 &&
        positive(preview.fps) &&
        preview.fps <= 30 &&
        positive(preview.maxBitrate) &&
        preview.maxBitrate <= 6_000_000,
    ) ||
    (value.source === 'stub' && (value.canPreview || value.canRecord))
  )
    throw new Error('Capacités caméra invalides ou incompatibles.');
  return value as unknown as CameraCapabilities;
}

export function defaultConfiguration(capabilities: CameraCapabilities): CameraConfiguration {
  const lens = capabilities.lenses[0];
  const fileQuality = lens?.fileQualities[0];
  const previewQuality = capabilities.previewQualities[0];
  if (!lens || !fileQuality || !previewQuality) throw new Error('Aucun profil disponible.');
  return { lens: lens.id, zoom: lens.zoom.min, torch: false, fileQuality, previewQuality };
}

export function validateConfiguration(
  capabilities: CameraCapabilities,
  configuration: CameraConfiguration,
): void {
  const lens = capabilities.lenses.find(({ id }) => id === configuration.lens);
  const quality = configuration.fileQuality;
  const preview = configuration.previewQuality;
  if (
    !lens ||
    !Number.isFinite(configuration.zoom) ||
    configuration.zoom < lens.zoom.min ||
    configuration.zoom > lens.zoom.max ||
    (configuration.torch && !lens.torch) ||
    !lens.fileQualities.some(
      (item) =>
        item.id === quality.id &&
        item.width === quality.width &&
        item.height === quality.height &&
        item.fps === quality.fps &&
        item.hdr === quality.hdr &&
        item.codec === quality.codec,
    ) ||
    !capabilities.previewQualities.some(
      (item) =>
        item.width === preview.width &&
        item.height === preview.height &&
        item.fps === preview.fps &&
        item.maxBitrate === preview.maxBitrate,
    )
  )
    throw new Error('Combinaison caméra non supportée.');
}
