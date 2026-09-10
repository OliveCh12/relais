import { Button, FilledTonalButton, Host, Text } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  testID as testIdentifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { NativeIcon } from './icons/Icon.android';
import type { ActionButtonProps } from './ActionButton.types';

export function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  testID,
  icon,
  dark,
}: ActionButtonProps) {
  const Control = secondary ? FilledTonalButton : Button;
  return (
    <Host
      matchContents={{ vertical: true }}
      style={{ width: '100%' }}
      {...(dark ? { colorScheme: 'dark' as const } : {})}
    >
      <Control
        onClick={onPress}
        enabled={!disabled}
        modifiers={[
          fillMaxWidth(),
          defaultMinSize({ minHeight: 52 }),
          ...(testID ? [testIdentifier(testID)] : []),
        ]}
      >
        {icon && <NativeIcon name={icon} size={20} />}
        <Text>{icon ? `  ${label}` : label}</Text>
      </Control>
    </Host>
  );
}
