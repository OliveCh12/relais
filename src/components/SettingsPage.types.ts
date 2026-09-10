import type { ReactElement } from 'react';
import type { IconName } from './icons/types';

export type SettingsRow =
  | { kind: 'value'; label: string; value: string; icon?: IconName }
  | {
      kind: 'action';
      label: string;
      icon?: IconName;
      onPress: () => void;
      disabled?: boolean;
      destructive?: boolean;
    }
  | {
      kind: 'field';
      label: string;
      value: string;
      saveLabel: string;
      onSave: (value: string) => void;
      maxLength: number;
    }
  | { kind: 'toggle'; label: string; value: boolean; onChange: (value: boolean) => void };
export interface SettingsPageProps {
  sections: { title: string; footer?: string; rows: SettingsRow[] }[];
  content?: ReactElement;
}
