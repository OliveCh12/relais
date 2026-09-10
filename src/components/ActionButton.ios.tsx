import { Button, Host, HStack, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  buttonStyle,
  controlSize,
  disabled,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import { NativeIcon } from './icons/Icon.ios';
import type { ActionButtonProps } from './ActionButton.types';

export function ActionButton({
  label,
  onPress,
  disabled: unavailable = false,
  secondary = false,
  testID,
  icon,
  dark,
}: ActionButtonProps) {
  return (
    <Host
      matchContents={{ vertical: true }}
      style={{ width: '100%' }}
      {...(dark ? { colorScheme: 'dark' as const } : {})}
    >
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(secondary ? 'bordered' : 'borderedProminent'),
          controlSize('large'),
          disabled(unavailable),
          ...(testID ? [accessibilityIdentifier(testID)] : []),
        ]}
      >
        <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity, minHeight: 24 })]}>
          {icon ? <NativeIcon name={icon} size={20} /> : null}
          <Text>{label}</Text>
        </HStack>
      </Button>
    </Host>
  );
}
