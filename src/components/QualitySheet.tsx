import { Sheet } from './ui';
import { QualityFields } from './QualityFields';
import type { QualitySheetProps } from './useQualityModel';

export function QualitySheet({ model, visible, onClose }: QualitySheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <QualityFields model={model} />
    </Sheet>
  );
}
