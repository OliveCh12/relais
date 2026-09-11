import { Box, Shape, Surface, useMaterialColors } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { NativeIcon } from './Icon.android';
import { settingsIconTone, type SettingsIconProps } from './SettingsIcon.types';

const colors = {
  blue: { background: '#A9EBFF', foreground: '#004E61' },
  orange: { background: '#FFD3A7', foreground: '#6E3900' },
  green: { background: '#B7F6C4', foreground: '#075528' },
  purple: { background: '#F4C0F1', foreground: '#702768' },
};
export function SettingsIcon({ name, muted = false }: SettingsIconProps) {
  const material = useMaterialColors();
  const tone = muted ? 'neutral' : settingsIconTone(name);
  const color =
    tone === 'neutral'
      ? { background: material.surfaceVariant, foreground: material.onSurfaceVariant }
      : colors[tone];
  return (
    <Surface
      color={color.background}
      shape={Shape.Circle({ radius: 1 })}
      modifiers={[size(40, 40)]}
    >
      <Box contentAlignment="center" modifiers={[size(40, 40)]}>
        <NativeIcon name={name} size={22} color={color.foreground} />
      </Box>
    </Surface>
  );
}
