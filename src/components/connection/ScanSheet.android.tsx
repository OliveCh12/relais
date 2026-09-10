import {
  Column,
  Host,
  ModalBottomSheet,
  RNHostView,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
      <ModalBottomSheet onDismissRequest={onClose} skipPartiallyExpanded>
        <Column modifiers={[fillMaxWidth(), paddingAll(24)]} verticalArrangement={{ spacedBy: 24 }}>
          <Text style={{ typography: 'titleLarge' }}>Connect a camera</Text>
          <Text>On your other phone, open Camera and tap the connection code button.</Text>
          <RNHostView matchContents>
            <QrScanner onScan={onScan} />
          </RNHostView>
          <TextButton onClick={onClose}>
            <Text>Cancel</Text>
          </TextButton>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
