import chevronRight from '@expo/material-symbols/chevron_right.xml';
import expandMore from '@expo/material-symbols/keyboard_arrow_down.xml';
import { Keyboard } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ModalBottomSheet,
  Box,
  Row,
  Surface,
  Shape,
  Icon,
  Button,
  CircularProgressIndicator,
  DropdownMenu,
  DropdownMenuItem,
  Slider,
  Card,
  Column,
  Host,
  ListItem,
  OutlinedTextField,
  RNHostView,
  Switch,
  Text,
  TextButton,
  useMaterialColors,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
  size,
  defaultMinSize,
  clickable,
  fillMaxWidth,
  paddingAll,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import { useNameWriter } from './useNameWriter';
import { NativeIcon } from './icons/Icon.android';
import type { SettingsPageProps, SettingsRow } from './SettingsPage.types';

function Field({ row }: { row: Extract<SettingsRow, { kind: 'field' }> }) {
  const value = useNativeState(row.value);
  return (
    <Column modifiers={[paddingAll(16)]}>
      <OutlinedTextField
        value={value}
        maxLength={row.maxLength}
        singleLine
        modifiers={[fillMaxWidth()]}
      >
        <OutlinedTextField.Label>
          <Text>{row.label}</Text>
        </OutlinedTextField.Label>
      </OutlinedTextField>
      <TextButton onClick={() => row.onSave(value.get())}>
        <Text>{row.saveLabel}</Text>
      </TextButton>
    </Column>
  );
}

function NameField({ row }: { row: Extract<SettingsRow, { kind: 'name' }> }) {
  const value = useNativeState(row.value);
  const writer = useNameWriter(row.value, row.onSave);
  const save = () => writer.save(value.get());
  return (
    <Column modifiers={[paddingAll(16)]}>
      <OutlinedTextField
        value={value}
        maxLength={60}
        singleLine
        modifiers={[fillMaxWidth()]}
        keyboardOptions={{ imeAction: 'done' }}
        keyboardActions={{
          onDone: () => {
            save();
            Keyboard.dismiss();
          },
        }}
        onFocusChanged={(focused) => {
          if (!focused) save();
        }}
        isError={writer.state.status === 'error'}
      >
        <OutlinedTextField.Label>
          <Text>{row.label}</Text>
        </OutlinedTextField.Label>
        <OutlinedTextField.TrailingIcon>
          {writer.state.status === 'saving' ? (
            <CircularProgressIndicator modifiers={[size(20, 20)]} />
          ) : writer.state.status === 'saved' ? (
            <NativeIcon name="check" label="Name saved" size={20} />
          ) : (
            <Text>{''}</Text>
          )}
        </OutlinedTextField.TrailingIcon>
        {writer.state.message && (
          <OutlinedTextField.SupportingText>
            <Text>{writer.state.message}</Text>
          </OutlinedTextField.SupportingText>
        )}
      </OutlinedTextField>
    </Column>
  );
}

function Group({ row }: { row: Extract<SettingsRow, { kind: 'group' }> }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useMaterialColors();
  return (
    <Column>
      <ListItem
        colors={{ containerColor: 'transparent' }}
        modifiers={[clickable(() => setExpanded((value) => !value))]}
      >
        <ListItem.LeadingContent>
          <NativeIcon name={row.icon} color={colors.primary} />
        </ListItem.LeadingContent>
        <ListItem.HeadlineContent>
          <Text>{row.label}</Text>
        </ListItem.HeadlineContent>
        <ListItem.TrailingContent>
          <Icon
            source={expanded ? expandMore : chevronRight}
            size={24}
            contentDescription={expanded ? 'Collapse' : 'Expand'}
          />
        </ListItem.TrailingContent>
      </ListItem>
      {expanded && <SettingsRows rows={row.rows} />}
    </Column>
  );
}
function Choice({ row }: { row: Extract<SettingsRow, { kind: 'choice' }> }) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <ListItem colors={{ containerColor: 'transparent' }}>
          <ListItem.HeadlineContent>
            <Text>{row.label}</Text>
          </ListItem.HeadlineContent>
          <ListItem.SupportingContent>
            <Text>{row.options.find((o) => o.value === row.value)?.label ?? row.value}</Text>
          </ListItem.SupportingContent>
        </ListItem>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {row.options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            enabled={!row.disabled}
            onClick={() => row.onChange(option.value)}
          >
            <DropdownMenuItem.Text>
              <Text>{option.label}</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}
function Range({ row }: { row: Extract<SettingsRow, { kind: 'slider' }> }) {
  const value = useRef(row.value);
  useEffect(() => {
    value.current = row.value;
  }, [row.value]);
  return (
    <Column modifiers={[paddingAll(16)]}>
      <Text>{row.label}</Text>
      <Slider
        value={row.value}
        min={row.min}
        max={row.max}
        enabled={!row.disabled}
        onValueChange={(next) => {
          value.current = next;
        }}
        onValueChangeFinished={() => row.onChange(value.current)}
      />
    </Column>
  );
}

function SettingsRows({ rows }: { rows: SettingsRow[] }) {
  const colors = useMaterialColors();
  return (
    <>
      {rows.map((row) =>
        row.kind === 'group' ? (
          <Group key={row.label} row={row} />
        ) : row.kind === 'action' && row.prominent ? (
          <Button
            key={row.label}
            onClick={row.onPress}
            enabled={!row.disabled}
            modifiers={[paddingAll(8), fillMaxWidth(), defaultMinSize({ minHeight: 56 })]}
          >
            {row.icon && <NativeIcon name={row.icon} size={20} />}
            <Text>{`  ${row.label}`}</Text>
          </Button>
        ) : row.kind === 'name' ? (
          <NameField key={row.id} row={row} />
        ) : row.kind === 'choice' ? (
          <Choice key={row.label} row={row} />
        ) : row.kind === 'slider' ? (
          <Range key={row.label} row={row} />
        ) : row.kind === 'field' ? (
          <Field key={`${row.label}:${row.value}`} row={row} />
        ) : (
          <ListItem
            key={row.label}
            colors={{ containerColor: 'transparent' }}
            modifiers={row.kind === 'action' && !row.disabled ? [clickable(row.onPress)] : []}
          >
            {'icon' in row && row.icon && (
              <ListItem.LeadingContent>
                <NativeIcon name={row.icon} color={colors.primary} />
              </ListItem.LeadingContent>
            )}
            <ListItem.HeadlineContent>
              <Text
                color={
                  row.kind === 'action' && row.destructive
                    ? colors.error
                    : row.kind === 'action' && row.disabled
                      ? colors.onSurfaceVariant
                      : colors.onSurface
                }
              >
                {row.label}
              </Text>
            </ListItem.HeadlineContent>
            {row.kind === 'value' && (
              <ListItem.SupportingContent>
                <Text>{row.value}</Text>
              </ListItem.SupportingContent>
            )}
            {row.kind === 'toggle' && (
              <ListItem.TrailingContent>
                <Switch value={row.value} onCheckedChange={row.onChange} enabled={!row.disabled} />
              </ListItem.TrailingContent>
            )}
          </ListItem>
        ),
      )}
    </>
  );
}

export function SettingsContent({ sections, content, header }: SettingsPageProps) {
  const colors = useMaterialColors();
  return (
    <Column
      modifiers={[fillMaxWidth(), verticalScroll(), paddingAll(16)]}
      verticalArrangement={{ spacedBy: 16 }}
    >
      {header && (
        <Card>
          <Row
            modifiers={[paddingAll(16)]}
            horizontalArrangement={{ spacedBy: 14 }}
            verticalAlignment="center"
          >
            <Surface
              color={colors.primaryContainer}
              shape={Shape.Circle({ radius: 1 })}
              modifiers={[size(48, 48)]}
            >
              <Box contentAlignment="center" modifiers={[size(48, 48)]}>
                <NativeIcon name={header.icon} size={24} color={colors.primary} />
              </Box>
            </Surface>
            <Column verticalArrangement={{ spacedBy: 4 }}>
              <Text style={{ typography: 'titleMedium' }}>{header.title}</Text>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
                {header.subtitle}
              </Text>
            </Column>
          </Row>
        </Card>
      )}
      {sections.map((section) => (
        <Column key={section.title} verticalArrangement={{ spacedBy: 8 }}>
          <Text color={colors.primary} style={{ typography: 'labelLarge' }}>
            {section.title}
          </Text>
          {section.rows.length > 0 && (
            <Card>
              <Column>
                <SettingsRows rows={section.rows} />
              </Column>
            </Card>
          )}
          {section.footer && (
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
              {section.footer}
            </Text>
          )}
        </Column>
      ))}
      {content && <RNHostView matchContents>{content}</RNHostView>}
    </Column>
  );
}

export function SettingsPage(props: SettingsPageProps) {
  if (props.presentation === 'sheet')
    return (
      <Host colorScheme="dark" style={{ flex: 1 }}>
        <ModalBottomSheet skipPartiallyExpanded onDismissRequest={props.onDismiss ?? (() => {})}>
          <SettingsContent {...props} />
        </ModalBottomSheet>
      </Host>
    );
  return (
    <Host style={{ flex: 1 }}>
      <SettingsContent {...props} />
    </Host>
  );
}
