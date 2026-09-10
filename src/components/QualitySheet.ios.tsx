import { BottomSheet, Button, Group, Host, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  controlSize,
  font,
  padding,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { QualityFields } from './QualityFields.ios';
import type { QualitySheetProps } from './useQualityModel';

export function QualitySheet({ model, visible, onClose }: QualitySheetProps) {
  return (
    <Host style={{ height: 0, width: '100%' }}>
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}
        >
          <VStack spacing={0}>
            <HStack modifiers={[padding({ horizontal: 20, top: 20, bottom: 8 })]}>
              <Text modifiers={[font({ textStyle: 'headline' })]}>Video quality</Text>
              <Spacer />
              <Button label="Done" onPress={onClose} modifiers={[controlSize('large')]} />
            </HStack>
            <QualityFields model={model} />
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
