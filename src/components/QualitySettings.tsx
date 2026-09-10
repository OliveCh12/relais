import type { CameraCapabilities } from '@/domain/camera';
import { QualityFields } from './QualityFields';
import { useQualityModel } from './useQualityModel';

export function QualitySettings({ capabilities }: { capabilities: CameraCapabilities }) {
  const model = useQualityModel(capabilities);
  return <QualityFields model={model} />;
}
