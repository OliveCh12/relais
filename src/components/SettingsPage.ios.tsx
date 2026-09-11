import { useAppTheme } from '@/design/useAppTheme';
import { Keyboard } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  VStack,
  ZStack,
  DisclosureGroup,
  Image,
  ProgressView,
  Picker,
  Slider,
  Button,
  Form,
  Host,
  HStack,
  RNHostView,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  accessibilityLabel,
  accessibilityAddTraits,
  background,
  shapes,
  controlSize,
  frame,
  onSubmit,
  submitLabel,
  font,
  tag,
  pickerStyle,
  disabled,
  foregroundStyle,
  textInputAutocapitalization,
  autocorrectionDisabled,
} from '@expo/ui/swift-ui/modifiers';
import { useNameWriter } from './useNameWriter';
import { sfSymbols } from './icons/types';
import { SettingsIcon } from './icons/SettingsIcon.ios';
import { NativeIcon } from './icons/Icon.ios';
import type { SettingsPageProps, SettingsRow } from './SettingsPage.types';

function Field({ row }: { row: Extract<SettingsRow, { kind: 'field' }> }) {
  const value = useNativeState(row.value);
  return (
    <>
      <TextField
        text={value}
        placeholder={row.label}
        maxLength={row.maxLength}
        modifiers={[textInputAutocapitalization('never'), autocorrectionDisabled()]}
      />
      <Button label={row.saveLabel} onPress={() => row.onSave(value.get())} />
    </>
  );
}

function NameField({ row }: { row: Extract<SettingsRow, { kind: 'name' }> }) {
  const value = useNativeState(row.value);
  const writer = useNameWriter(row.value, row.onSave, row.validate);
  const save = writer.commit;
  useFocusEffect(useCallback(() => save, [save]));
  return (
    <VStack alignment="leading" spacing={8}>
      <HStack spacing={12}>
        <TextField
          text={value}
          placeholder={row.label}
          onTextChange={writer.edit}
          maxLength={row.maxLength ?? 60}
          onFocusChange={(focused) => {
            if (!focused) save();
          }}
          modifiers={[
            submitLabel('done'),
            onSubmit(() => {
              save();
              Keyboard.dismiss();
            }),
            autocorrectionDisabled(),
          ]}
        />
        {writer.state.status === 'saving' && <ProgressView />}
        {writer.state.status === 'saved' && <NativeIcon name="check" label="Saved" size={20} />}
      </HStack>
      {writer.state.status === 'error' && (
        <Text modifiers={[foregroundStyle('red')]}>{writer.state.message}</Text>
      )}
    </VStack>
  );
}

function Range({ row }: { row: Extract<SettingsRow, { kind: 'slider' }> }) {
  const value = useRef(row.value);
  useEffect(() => {
    value.current = row.value;
  }, [row.value]);
  return (
    <Slider
      label={<Text>{row.label}</Text>}
      value={row.value}
      min={row.min}
      max={row.max}
      modifiers={[disabled(row.disabled ?? false)]}
      onValueChange={(next) => {
        value.current = next;
      }}
      onEditingChanged={(editing) => {
        if (!editing) row.onChange(value.current);
      }}
    />
  );
}

function SettingsRows({ rows }: { rows: SettingsRow[] }) {
  return (
    <>
      {rows.map((row) =>
        row.kind === 'navigation' || row.kind === 'option' ? (
          <Button
            key={row.label}
            onPress={row.onPress}
            modifiers={[
              buttonStyle('plain'),
              disabled(row.disabled ?? false),
              ...(row.kind === 'option' && row.selected
                ? [accessibilityAddTraits(['isSelected'])]
                : []),
            ]}
          >
            <HStack spacing={12} modifiers={[frame({ minHeight: 28 })]}>
              {row.kind === 'navigation' && <SettingsIcon name={row.icon ?? 'gear'} />}
              <VStack
                alignment="leading"
                spacing={4}
                modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
              >
                <Text>{row.label}</Text>
                {row.subtitle && (
                  <Text
                    modifiers={[
                      font({ textStyle: 'subheadline' }),
                      foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                    ]}
                  >
                    {row.subtitle}
                  </Text>
                )}
              </VStack>
              {row.kind === 'navigation' ? (
                <Image
                  systemName="chevron.right"
                  size={12}
                  modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
                />
              ) : (
                row.selected && <Image systemName="checkmark" size={18} />
              )}
            </HStack>
          </Button>
        ) : row.kind === 'group' ? (
          <DisclosureGroup key={row.label}>
            <DisclosureGroup.Label>
              <HStack spacing={12}>
                <NativeIcon name={row.icon} size={22} />
                <Text>{row.label}</Text>
              </HStack>
            </DisclosureGroup.Label>
            <SettingsRows rows={row.rows} />
          </DisclosureGroup>
        ) : row.kind === 'action' && row.prominent ? (
          <Button
            key={row.label}
            onPress={row.onPress}
            modifiers={[
              buttonStyle('borderedProminent'),
              controlSize('large'),
              disabled(row.disabled ?? false),
            ]}
          >
            <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity, minHeight: 28 })]}>
              {row.icon && <NativeIcon name={row.icon} size={20} />}
              <Text>{row.label}</Text>
            </HStack>
          </Button>
        ) : row.kind === 'action' ? (
          <Button
            key={row.label}
            label={row.label}
            onPress={row.onPress}
            {...(row.icon ? { systemImage: sfSymbols[row.icon] } : {})}
            {...(row.destructive ? { role: 'destructive' as const } : {})}
            modifiers={[disabled(row.disabled ?? false)]}
          />
        ) : row.kind === 'name' ? (
          <NameField key={row.id} row={row} />
        ) : row.kind === 'field' ? (
          <Field key={`${row.label}:${row.value}`} row={row} />
        ) : row.kind === 'choice' ? (
          <Picker
            key={row.label}
            label={row.label}
            selection={row.value}
            onSelectionChange={row.onChange}
            modifiers={[pickerStyle('menu'), disabled(row.disabled ?? false)]}
          >
            {row.options.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        ) : row.kind === 'slider' ? (
          <Range key={row.label} row={row} />
        ) : row.kind === 'toggle' ? (
          <Toggle
            key={row.label}
            label={row.label}
            isOn={row.value}
            onIsOnChange={row.onChange}
            modifiers={[disabled(row.disabled ?? false)]}
          />
        ) : (
          <HStack key={row.label} spacing={10}>
            {row.icon && <NativeIcon name={row.icon} size={20} />}
            <Text>{row.label}</Text>
            <Spacer />
            <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
              {row.value}
            </Text>
          </HStack>
        ),
      )}
    </>
  );
}

export function SettingsPage({ sections, content, header }: SettingsPageProps) {
  const theme = useAppTheme();
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        {header && (
          <Section>
            <HStack spacing={14}>
              <ZStack alignment="bottomTrailing">
                <Image
                  systemName={sfSymbols[header.icon]}
                  size={24}
                  color={theme.accent}
                  modifiers={[
                    frame({ width: 48, height: 48 }),
                    background(theme.elevated, shapes.circle()),
                  ]}
                />
                {header.online !== undefined && (
                  <Image
                    systemName="circle.fill"
                    size={12}
                    color={header.online ? '#34C759' : '#8E8E93'}
                    modifiers={[accessibilityLabel(header.online ? 'Online' : 'Offline')]}
                  />
                )}
              </ZStack>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ textStyle: 'headline' })]}>{header.title}</Text>
                <Text
                  modifiers={[
                    font({ textStyle: 'subheadline' }),
                    foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                  ]}
                >
                  {header.subtitle}
                </Text>
              </VStack>
            </HStack>
          </Section>
        )}
        {sections.map((section) => (
          <Section
            key={section.title}
            title={section.title}
            {...(section.footer ? { footer: <Text>{section.footer}</Text> } : {})}
          >
            <SettingsRows rows={section.rows} />
          </Section>
        ))}
        {content && (
          <Section>
            <RNHostView matchContents>{content}</RNHostView>
          </Section>
        )}
      </Form>
    </Host>
  );
}
