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
      <Badge>MONITEUR · NON CONNECTÉ</Badge>
      <PreviewPlaceholder label="RETOUR DE LA CAMÉRA" />
      <AppText variant="muted">Batterie Caméra : — · Aucun flux reçu</AppText>
      <RecordButton />
      <Button label="Réglages" secondary onPress={() => setSettingsOpen(true)} />
      <Sheet visible={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <QualitySettings capabilities={mockCapabilities} />
      </Sheet>
    </Screen>
  );
}
