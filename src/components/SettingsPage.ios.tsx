import { useEffect, useRef } from 'react';
import {
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
  tag,
  pickerStyle,
  disabled,
  foregroundStyle,
  textInputAutocapitalization,
  autocorrectionDisabled,
} from '@expo/ui/swift-ui/modifiers';
import { sfSymbols } from './icons/types';
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

export function SettingsPage({ sections, content }: SettingsPageProps) {
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        {sections.map((section) => (
          <Section
            key={section.title}
            title={section.title}
            {...(section.footer ? { footer: <Text>{section.footer}</Text> } : {})}
          >
            {section.rows.map((row) =>
              row.kind === 'action' ? (
                <Button
                  key={row.label}
                  label={row.label}
                  onPress={row.onPress}
                  {...(row.icon ? { systemImage: sfSymbols[row.icon] } : {})}
                  {...(row.destructive ? { role: 'destructive' as const } : {})}
                  modifiers={[disabled(row.disabled ?? false)]}
                />
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
