import type { IconName } from './icons/types';

export interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
  icon?: IconName;
  dark?: boolean;
}
