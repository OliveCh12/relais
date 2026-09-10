import { useState } from 'react';
import {
  AppText,
  Badge,
  Button,
  PreviewPlaceholder,
  RecordButton,
  Screen,
  Sheet,
} from '@/components/ui';
import { QualitySettings } from '@/components/QualitySettings';
import { mockCapabilities } from '@/capabilities/mock';

export default function MonitorScreen() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <Screen>
      <Badge>MONITOR · NOT CONNECTED</Badge>
      <PreviewPlaceholder label="CAMERA PREVIEW" />
      <AppText variant="muted">Camera battery: — · No stream received</AppText>
      <RecordButton />
      <Button label="Settings" secondary onPress={() => setSettingsOpen(true)} />
      <Sheet visible={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <QualitySettings capabilities={mockCapabilities} />
      </Sheet>
    </Screen>
  );
}
