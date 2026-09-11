import { Image } from '@expo/ui/swift-ui';
import { accessibilityHidden, background, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { sfSymbols } from './types';
import { settingsIconTone, type SettingsIconProps } from './SettingsIcon.types';

const colors = {
  blue: '#007AFF',
  orange: '#C76A00',
  green: '#248A3D',
  purple: '#AF52DE',
  neutral: '#73737B',
};
export function SettingsIcon({ name, muted = false }: SettingsIconProps) {
  return (
    <Image
      systemName={sfSymbols[name]}
      size={18}
      color="#FFFFFF"
      modifiers={[
        frame({ width: 30, height: 30 }),
        background(
          colors[muted ? 'neutral' : settingsIconTone(name)],
          shapes.roundedRectangle({ cornerRadius: 7 }),
        ),
        accessibilityHidden(true),
      ]}
    />
  );
}
