import { Platform } from 'react-native';
import { useAppTheme } from '@/design/useAppTheme';

export function useStackOptions() {
  const theme = useAppTheme();
  return {
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: Platform.OS === 'ios' ? theme.accent : theme.text,
    headerTitleStyle: { color: theme.text },
    contentStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    freezeOnBlur: true,
    animation: 'default' as const,
    // Leave full-screen swipe and back-button sizing to the installed OS/native stack.
    ...(Platform.OS === 'ios' ? { gestureEnabled: true } : {}),
  };
}
