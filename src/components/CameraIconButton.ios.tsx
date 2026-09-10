import { Platform } from 'react-native';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  buttonBorderShape,
  controlSize,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import { NativeIcon } from './icons/Icon.ios';
import type { CameraIconButtonProps } from './CameraIconButton.types';

export function CameraIconButton({
  icon,
  label,
  onPress,
  disabled: unavailable = false,
  selected,
  large,
}: CameraIconButtonProps) {
  const dimension = large ? 88 : 48;
  return (
    <Host colorScheme="dark" style={{ width: dimension, height: dimension }}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(
            large ? 'plain' : parseInt(String(Platform.Version), 10) >= 26 ? 'glass' : 'plain',
          ),
          controlSize('regular'),
          buttonBorderShape('circle'),
          disabled(unavailable),
          accessibilityLabel(label),
        ]}
      >
        <NativeIcon
          name={icon}
          size={large ? 76 : 22}
          color={unavailable ? '#66666B' : large ? '#FF453A' : selected ? '#FFD60A' : '#FFFFFF'}
        />
      </Button>
    </Host>
  );
}
