import { Host, IconButton } from '@expo/ui/jetpack-compose';
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
  return (
    <Host colorScheme="dark" style={{ width: dimension, height: dimension }}>
      <IconButton onClick={onPress} enabled={!disabled} modifiers={[size(dimension, dimension)]}>
        <NativeIcon
          name={icon}
          label={label}
          size={large ? 72 : 24}
          color={
            disabled ? '#66666B' : large && !photo ? '#FF5449' : selected ? '#FFD60A' : '#FFFFFF'
          }
        />
      </IconButton>
    </Host>
  );
}
