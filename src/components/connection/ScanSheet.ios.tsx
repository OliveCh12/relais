import { BottomSheet, Button, Group, Host, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  padding,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { QrScanner } from '../QrScanner';
export function ScanSheet({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <Host style={{ width: '100%', height: 0 }}>
      <BottomSheet
        isPresented
        onIsPresentedChange={(value) => {
          if (!value) onClose();
        }}
      >
        <Group modifiers={[presentationDetents(['large']), presentationDragIndicator('visible')]}>
          <VStack spacing={24} modifiers={[padding({ all: 24 })]}>
            <Text modifiers={[font({ textStyle: 'headline' })]}>Connect a camera</Text>
            <Text>On your other phone, open Camera and tap the connection code button.</Text>
            <RNHostView matchContents>
              <QrScanner onScan={onScan} />
            </RNHostView>
            <Button label="Cancel" onPress={onClose} />
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
