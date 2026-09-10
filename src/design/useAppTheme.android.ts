import { useColorScheme } from 'react-native';
import { useMaterialColors } from '@expo/ui/jetpack-compose';

export function useAppTheme() {
  const dark = useColorScheme() === 'dark';
  const colors = useMaterialColors();
  return {
    dark,
    background: colors.background,
    surface: colors.surfaceContainerLow,
    elevated: colors.surfaceContainerHigh,
    border: colors.outlineVariant,
    text: colors.onSurface,
    muted: colors.onSurfaceVariant,
    accent: colors.primary,
  };
}
