import { Pressable, Text, View } from 'react-native';
import { theme } from '@/design/tokens';
import { Icon } from './icons/Icon';
import type { ActionButtonProps } from './ActionButton.types';

export function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  testID,
  icon,
}: ActionButtonProps) {
  const color = secondary ? theme.colors.text : theme.colors.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        padding: 14,
        borderRadius: 12,
        justifyContent: 'center',
        opacity: disabled || pressed ? 0.5 : 1,
        backgroundColor: secondary ? theme.colors.elevated : theme.colors.accent,
      })}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        {icon && <Icon name={icon} color={color} />}
        <Text
          style={{ color, fontSize: 16, fontWeight: '600', flexShrink: 1, textAlign: 'center' }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
