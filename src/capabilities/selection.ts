import type { CameraCapabilities, CameraConfiguration } from '@/domain/camera';
import { defaultConfiguration, validateConfiguration } from './validate';

export type QualityField = 'lens' | 'resolution' | 'fps' | 'hdr';
export interface QualityOption {
  value: string;
  label: string;
}
export interface QualityGroup {
  id: QualityField;
  label: string;
  value: string;
  options: QualityOption[];
}

export function reconcileConfiguration(
  capabilities: CameraCapabilities,
  configuration: CameraConfiguration,
): CameraConfiguration {
  try {
    validateConfiguration(capabilities, configuration);
    return configuration;
  } catch {
    return defaultConfiguration(capabilities);
  }
}

export function qualityGroups(
  capabilities: CameraCapabilities,
  configuration: CameraConfiguration,
): QualityGroup[] {
  const lens = capabilities.lenses.find(({ id }) => id === configuration.lens);
  if (!lens) return [];
  const quality = configuration.fileQuality;
  const resolutions = [...new Set(lens.fileQualities.map(({ height }) => height))];
  const fps = [
    ...new Set(
      lens.fileQualities.filter(({ height }) => height === quality.height).map(({ fps }) => fps),
    ),
  ];
  const groups: QualityGroup[] = [
    {
      id: 'lens',
      label: 'Lens',
      value: lens.id,
      options: capabilities.lenses.map(({ id, label }) => ({
        value: id,
        label: label.replace(' · demo', ''),
      })),
    },
    {
      id: 'resolution',
      label: 'Resolution',
      value: String(quality.height),
      options: resolutions.map((height) => ({
        value: String(height),
        label: height === 2160 ? '4K' : `${height}p`,
      })),
    },
    {
      id: 'fps',
      label: 'Frames per second',
      value: String(quality.fps),
      options: fps.map((fps) => ({ value: String(fps), label: `${fps} fps` })),
    },
  ];
  if (lens.fileQualities.some(({ hdr }) => hdr)) {
    const hdr = [
      ...new Set(
        lens.fileQualities
          .filter((q) => q.height === quality.height && q.fps === quality.fps)
          .map(({ hdr }) => hdr),
      ),
    ];
    groups.push({
      id: 'hdr',
      label: 'Dynamic range',
      value: String(quality.hdr),
      options: hdr.map((value) => ({ value: String(value), label: value ? 'HDR' : 'SDR' })),
    });
  }
  return groups;
}

export function selectQualityOption(
  capabilities: CameraCapabilities,
  previous: CameraConfiguration,
  field: QualityField,
  value: string,
): CameraConfiguration {
  const configuration = reconcileConfiguration(capabilities, previous);
  const group = qualityGroups(capabilities, configuration).find(({ id }) => id === field);
  if (!group?.options.some((option) => option.value === value)) return configuration;
  const lens = capabilities.lenses.find(
    ({ id }) => id === (field === 'lens' ? value : configuration.lens),
  );
  if (!lens) return configuration;
  const current = configuration.fileQuality;
  const qualities = lens.fileQualities.filter((quality) => {
    if (field === 'lens') return true;
    if (field === 'resolution') return quality.height === Number(value);
    if (field === 'fps') return quality.height === current.height && quality.fps === Number(value);
    return (
      quality.height === current.height &&
      quality.fps === current.fps &&
      String(quality.hdr) === value
    );
  });
  const fileQuality =
    qualities.find(
      (q) => q.fps === current.fps && q.hdr === current.hdr && q.codec === current.codec,
    ) ?? qualities[0];
  if (!fileQuality) return configuration;
  const next = {
    ...configuration,
    lens: lens.id,
    fileQuality,
    ...(field === 'lens' ? { zoom: lens.zoom.min, torch: false } : {}),
  };
  validateConfiguration(capabilities, next);
  return next;
}
