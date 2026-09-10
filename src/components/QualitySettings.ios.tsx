import { Host } from '@expo/ui/swift-ui';
import type { CameraCapabilities } from '@/domain/camera';
import { QualityFields } from './QualityFields.ios';
import { useQualityModel } from './useQualityModel';

export function QualitySettings({ capabilities }: { capabilities: CameraCapabilities }) {
  const model = useQualityModel(capabilities);
  return (
    <Host style={{ flex: 1 }}>
      <QualityFields model={model} />
    </Host>
  );
}
