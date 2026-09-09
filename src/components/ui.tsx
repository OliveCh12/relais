import type { PropsWithChildren } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../design/tokens';

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: 'title' | 'heading' | 'body' | 'muted' | 'label' }) {
  return <Text {...props} style={[styles.text, styles[variant], style]} />;
}

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function Badge({ children }: PropsWithChildren) {
  return (
    <View style={styles.badge}>
      <AppText variant="label">{children}</AppText>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || pressed) && styles.dim,
      ]}
    >
      <AppText
        style={{ color: secondary ? theme.colors.text : theme.colors.onAccent, fontWeight: '600' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.gap}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
      />
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
      <AppText variant="muted">Aucune image capturée</AppText>
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
        accessibilityLabel="Enregistrer — indisponible dans la fondation"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.recordOuter}
      >
        <View style={styles.recordInner} />
      </Pressable>
      <AppText variant="muted">Rec disponible après intégration du moteur</AppText>
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
          accessibilityLabel="Fermer les réglages"
          accessibilityRole="button"
          style={styles.scrim}
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {children}
            <Button label="Terminé" onPress={onClose} />
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
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
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
