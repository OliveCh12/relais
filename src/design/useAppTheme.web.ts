import { theme } from './tokens';

export function useAppTheme() {
  return { dark: true, ...theme.colors };
}
