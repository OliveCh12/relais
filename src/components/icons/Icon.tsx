import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

const paths = {
  camera: 'M3 5h12v14H3z M15 10l6-4v12l-6-4',
  monitor: 'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',
  qr: 'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6 M7 7h3v3H7z M14 7h3v3h-3z M7 14h3v3H7z M14 14h3v3h-3z',
  wifi: 'M2 8a15 15 0 0 1 20 0 M5 12a10 10 0 0 1 14 0 M9 16a4 4 0 0 1 6 0 M12 20h.01',
  settings: 'M3 6h6 M13 6h8 M3 12h12 M19 12h2 M3 18h2 M9 18h12 M9 3v6 M15 9v6 M5 15v6',
  info: 'M12 8h.01 M12 11v6 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  record: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10',
};

export function Icon({ name, size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d={paths[name as keyof typeof paths] ?? paths.info}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const NativeIcon = Icon;
