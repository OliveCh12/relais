import { Column, Host, ModalBottomSheet, Text } from '@expo/ui/jetpack-compose';
import { paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { SettingsContent } from './SettingsPage.android';
import { cameraSettingsSections } from './cameraSettingsSections';
import type { CameraOptionsProps } from './CameraOptions.types';

export function CameraOptions({ state, onAction, visible, onClose }: CameraOptionsProps) {
  if (!visible) return null;
  const sections = cameraSettingsSections(
    state,
    onAction,
    !state.ready || !state.canCapture,
    !state.ready || !(state.canCapture || state.phase === 'recording'),
    'local',
  );
  return (
    <Host style={{ width: '100%', height: 0 }} colorScheme="dark">
      <ModalBottomSheet onDismissRequest={onClose} skipPartiallyExpanded>
        <Column>
          <Text modifiers={[paddingAll(20)]} style={{ typography: 'titleLarge' }}>
            Camera settings
          </Text>
        </Column>
        <SettingsContent sections={sections} />
      </ModalBottomSheet>
    </Host>
  );
}
