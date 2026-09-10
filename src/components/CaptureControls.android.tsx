import { Column, Host, IconButton, Row, Text, TextButton } from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth, size, width } from '@expo/ui/jetpack-compose/modifiers';
import { NativeIcon } from './icons/Icon.android';
import type { CaptureControlsProps } from './CaptureControls.types';

export function CaptureControls({
  landscape,
  summary,
  onSettings,
  settingsDisabled,
}: CaptureControlsProps) {
  return (
    <Host
      colorScheme="dark"
      matchContents={{ vertical: true }}
      style={{ width: landscape ? 132 : '100%' }}
    >
      {landscape ? (
        <Column
          horizontalAlignment="center"
          verticalArrangement={{ spacedBy: 16 }}
          modifiers={[fillMaxWidth()]}
        >
          <Text style={{ typography: 'labelMedium', textAlign: 'center' }}>{summary}</Text>
          <RecordControl />
          <SettingsControl onSettings={onSettings} settingsDisabled={settingsDisabled} />
        </Column>
      ) : (
        <Row
          horizontalArrangement="spaceEvenly"
          verticalAlignment="center"
          modifiers={[fillMaxWidth()]}
        >
          <Text
            style={{ typography: 'labelMedium', textAlign: 'center' }}
            modifiers={[width(80), defaultMinSize({ minHeight: 48 })]}
          >
            {summary}
          </Text>
          <RecordControl />
          <SettingsControl onSettings={onSettings} settingsDisabled={settingsDisabled} />
        </Row>
      )}
    </Host>
  );
}

function RecordControl() {
  return (
    <IconButton enabled={false} modifiers={[size(88, 88)]}>
      <NativeIcon
        name="record"
        size={76}
        color="#A65150"
        label="Record — unavailable in this demo"
      />
    </IconButton>
  );
}

function SettingsControl({
  onSettings,
  settingsDisabled,
}: Pick<CaptureControlsProps, 'onSettings' | 'settingsDisabled'>) {
  return (
    <TextButton
      onClick={onSettings}
      enabled={!settingsDisabled}
      modifiers={[defaultMinSize({ minHeight: 64 })]}
    >
      <Column horizontalAlignment="center" verticalArrangement={{ spacedBy: 4 }}>
        <NativeIcon name="settings" />
        <Text style={{ typography: 'labelSmall' }}>Settings</Text>
      </Column>
    </TextButton>
  );
}
