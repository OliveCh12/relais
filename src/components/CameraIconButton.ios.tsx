import { Button, Host } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  controlSize,
  frame,
  contentShape,
  shapes,
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
  photo,
}: CameraIconButtonProps) {
  const dimension = large ? 84 : 48;
  return (
    <Host colorScheme="dark" style={{ width: dimension, height: dimension }}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle('plain'),
          frame({ width: dimension, height: dimension }),
          contentShape(shapes.rectangle()),
          controlSize('regular'),
          disabled(unavailable),
          accessibilityLabel(label),
        ]}
      >
        <NativeIcon
          name={icon}
          size={large ? 72 : 24}
          color={
            unavailable ? '#66666B' : large && !photo ? '#FF453A' : selected ? '#FFD60A' : '#FFFFFF'
          }
        />
      </Button>
    </Host>
  );
}
