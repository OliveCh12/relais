import type { PropsWithChildren } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../design/tokens';
import { useAppTheme } from '../design/useAppTheme';
import { ActionButton as Button } from './ActionButton';
export { Button };

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: 'title' | 'heading' | 'body' | 'muted' | 'label' }) {
  const colors = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const color =
    Platform.OS === 'web'
      ? undefined
      : variant === 'muted' || variant === 'label'
        ? colors.muted
        : colors.text;
  return (
    <Text
      key={fontScale}
      {...props}
      style={[styles.text, styles[variant], color ? { color } : undefined, style]}
    />
  );
}

export function Screen({ children }: PropsWithChildren) {
  const colors = useAppTheme();
  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safe, Platform.OS !== 'web' && { backgroundColor: colors.background }]}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: PropsWithChildren) {
  const colors = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        Platform.OS !== 'web' && { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({ children }: PropsWithChildren) {
  return (
    <View style={styles.badge}>
      <AppText variant="label">{children}</AppText>
    </View>
  );
}

export function ChoiceChips({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.gap}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === selected }}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, option.value === selected && styles.selected]}
          >
            <AppText>{option.label}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function PreviewPlaceholder({ label }: { label: string }) {
  return (
    <View style={styles.preview}>
      <View style={styles.reticle} />
      <AppText variant="label">{label}</AppText>
      <AppText variant="muted">No image captured</AppText>
      <View style={styles.previewFooter}>
        <AppText variant="label">9:16</AppText>
        <AppText variant="label">LOCAL</AppText>
      </View>
    </View>
  );
}

export function RecordButton() {
  return (
    <View style={styles.recordWrap}>
      <Pressable
        accessibilityLabel="Record — unavailable in the foundation"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.recordOuter}
      >
        <View style={styles.recordInner} />
      </Pressable>
      <AppText variant="muted">Recording available after engine integration</AppText>
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable
          accessibilityLabel="Close settings"
          accessibilityRole="button"
          style={styles.scrim}
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {children}
            <Button label="Done" onPress={onClose} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  screen: {
    flexGrow: 1,
    padding: theme.space.md,
    gap: theme.space.md,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: theme.space.xl,
  },
  text: { color: theme.colors.text, fontSize: 16, lineHeight: 24 },
  title: { fontSize: 40, lineHeight: 46, fontWeight: '600', letterSpacing: -1.4 },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: -0.5 },
  body: {},
  muted: { color: theme.colors.muted, fontSize: 14, lineHeight: 21 },
  label: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.muted,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  card: {
    padding: theme.space.md,
    gap: theme.space.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 30,
  },
  button: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  secondary: { backgroundColor: theme.colors.elevated },
  dim: { opacity: 0.5 },
  gap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    padding: 12,
    minHeight: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
  },
  selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.elevated },
  preview: {
    aspectRatio: 9 / 12,
    maxHeight: 430,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#080B0B',
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  reticle: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    marginBottom: 14,
  },
  previewFooter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordWrap: { alignItems: 'center', gap: 12 },
  recordOuter: {
    height: 76,
    width: 76,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: 7,
  },
  recordInner: { flex: 1, backgroundColor: theme.colors.danger, borderRadius: 40, opacity: 0.4 },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  scrim: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: theme.colors.background,
  },
  sheetContent: { padding: 24, gap: 20, width: '100%', maxWidth: 620, alignSelf: 'center' },
});
