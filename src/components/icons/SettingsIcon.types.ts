import type { IconName } from './types';

export interface SettingsIconProps {
  name: IconName;
  muted?: boolean;
}
export function settingsIconTone(name: IconName) {
  if (['camera', 'monitor', 'wifi', 'qr', 'code', 'flip', 'device'].includes(name)) return 'blue';
  if (['sun', 'torch', 'torchOff', 'timer'].includes(name)) return 'orange';
  if (['photo', 'gallery'].includes(name)) return 'green';
  if (['video', 'record', 'preset'].includes(name)) return 'purple';
  return 'neutral';
}
