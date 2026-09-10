import { useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Button,
  Column,
  Host,
  ModalBottomSheet,
  Text,
  type ModalBottomSheetRef,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  padding,
  paddingAll,
  verticalScroll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { QualityFields } from './QualityFields.android';
import type { QualitySheetProps } from './useQualityModel';

export function QualitySheet({ model, visible, onClose }: QualitySheetProps) {
  const sheet = useRef<ModalBottomSheetRef>(null);
  const window = useWindowDimensions();
  if (!visible) return null;
  return (
    <Host style={{ height: 0, width: '100%' }}>
      <ModalBottomSheet ref={sheet} onDismissRequest={onClose} skipPartiallyExpanded>
        <Column modifiers={[fillMaxWidth(), height(window.height * 0.76)]}>
          <Text style={{ typography: 'headlineSmall' }} modifiers={[padding(24, 8, 24, 16)]}>
            Video quality
          </Text>
          <Column modifiers={[weight(1), verticalScroll(), padding(24, 0, 24, 24)]}>
            <QualityFields model={model} />
          </Column>
          <Column modifiers={[fillMaxWidth(), paddingAll(16)]}>
            <Button
              onClick={() => {
                void sheet.current?.hide().then(onClose);
              }}
              modifiers={[fillMaxWidth()]}
            >
              <Text>Done</Text>
            </Button>
          </Column>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
