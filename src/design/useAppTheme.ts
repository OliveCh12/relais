import { useColorScheme } from 'react-native';

export function useAppTheme() {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    background: dark ? '#000000' : '#F2F2F7',
    surface: dark ? '#1C1C1E' : '#FFFFFF',
    elevated: dark ? '#2C2C2E' : '#E5E5EA',
    border: dark ? '#38383A' : '#C6C6C8',
    text: dark ? '#FFFFFF' : '#000000',
    muted: dark ? '#AEAEB2' : '#636366',
    accent: dark ? '#0A84FF' : '#007AFF',
  };
}
