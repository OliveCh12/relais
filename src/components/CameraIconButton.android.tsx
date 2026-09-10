import { Host, IconButton, OutlinedIconButton, Shape } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { NativeIcon } from './icons/Icon.android';
import type { CameraIconButtonProps } from './CameraIconButton.types';

export function CameraIconButton({
  icon,
  label,
  onPress,
  disabled = false,
  selected,
  large,
  photo,
}: CameraIconButtonProps) {
  const dimension = large ? 84 : 48;
  const Control = large ? OutlinedIconButton : IconButton;
  return (
    <Host colorScheme="dark" style={{ width: dimension, height: dimension }}>
      <Control
        onClick={onPress}
        enabled={!disabled}
        shape={Shape.Circle({ radius: 1 })}
        modifiers={[size(dimension, dimension)]}
      >
        <NativeIcon
          name={large ? (icon === 'stop' ? 'stopSolid' : 'shutter') : icon}
          label={label}
          size={large ? (icon === 'stop' ? 64 : 76) : 24}
          color={
            disabled ? '#66666B' : large && !photo ? '#FF5449' : selected ? '#FFD60A' : '#FFFFFF'
          }
        />
      </Control>
    </Host>
  );
}
