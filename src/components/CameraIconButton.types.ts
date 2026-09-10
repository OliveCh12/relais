import type { IconName } from './icons/types';

export interface CameraIconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  large?: boolean;
}
