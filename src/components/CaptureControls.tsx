import { View } from 'react-native';
import { ActionButton } from './ActionButton';
import type { CaptureControlsProps } from './CaptureControls.types';

export function CaptureControls({ summary, onSettings, settingsDisabled }: CaptureControlsProps) {
  return (
    <View style={{ gap: 12 }}>
      <ActionButton label="Record — unavailable" onPress={() => {}} disabled />
      <ActionButton
        label={summary}
        icon="settings"
        onPress={onSettings}
        disabled={settingsDisabled}
      />
    </View>
  );
}
