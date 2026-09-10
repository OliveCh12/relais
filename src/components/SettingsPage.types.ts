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
  | {
      kind: 'toggle';
      label: string;
      value: boolean;
      onChange: (value: boolean) => void;
      disabled?: boolean;
    }
  | {
      kind: 'choice';
      label: string;
      value: string;
      options: { label: string; value: string }[];
      onChange: (value: string) => void;
      disabled?: boolean;
    }
  | {
      kind: 'slider';
      label: string;
      value: number;
      min: number;
      max: number;
      onChange: (value: number) => void;
      disabled?: boolean;
    };
export interface SettingsPageProps {
  sections: { title: string; footer?: string; rows: SettingsRow[] }[];
  content?: ReactElement;
}
