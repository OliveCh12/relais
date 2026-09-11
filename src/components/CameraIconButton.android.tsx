import {
  Host,
  FilledTonalIconButton,
  IconButton,
  OutlinedIconButton,
  Shape,
} from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { ComposeTouchTarget } from './ComposeTouchTarget';
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
  roundedSquare,
}: CameraIconButtonProps) {
  const dimension = large ? 84 : roundedSquare ? 56 : 48;
  const Control = large ? OutlinedIconButton : roundedSquare ? FilledTonalIconButton : IconButton;
  return (
    <ComposeTouchTarget style={{ width: dimension, height: dimension }}>
      <Host colorScheme="dark" style={{ width: dimension, height: dimension }}>
        <Control
          onClick={onPress}
          enabled={!disabled}
          shape={
            roundedSquare
              ? Shape.RoundedCorner({
                  cornerRadii: { topStart: 16, topEnd: 16, bottomStart: 16, bottomEnd: 16 },
                })
              : Shape.Circle({ radius: 1 })
          }
          modifiers={[size(dimension, dimension)]}
        >
          <NativeIcon
            name={large ? (icon === 'stop' ? 'stopSolid' : 'shutter') : icon}
            label={label}
            size={large ? (icon === 'stop' ? 32 : 68) : 24}
            color={
              disabled ? '#66666B' : large && !photo ? '#FF5449' : selected ? '#FFD60A' : '#FFFFFF'
            }
          />
        </Control>
      </Host>
    </ComposeTouchTarget>
  );
}
