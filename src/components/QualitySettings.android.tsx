import { Column, Host } from '@expo/ui/jetpack-compose';
import { fillMaxSize, paddingAll, verticalScroll } from '@expo/ui/jetpack-compose/modifiers';
import type { CameraCapabilities } from '@/domain/camera';
import { QualityFields } from './QualityFields.android';
import { useQualityModel } from './useQualityModel';

export function QualitySettings({ capabilities }: { capabilities: CameraCapabilities }) {
  const model = useQualityModel(capabilities);
  return (
    <Host style={{ flex: 1 }}>
      <Column modifiers={[fillMaxSize(), verticalScroll(), paddingAll(24)]}>
        <QualityFields model={model} />
      </Column>
    </Host>
  );
}
