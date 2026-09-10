import {
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
  clickable,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
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

export function SettingsPage({ sections, content }: SettingsPageProps) {
  const colors = useMaterialColors();
  return (
    <Host style={{ flex: 1 }}>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}
      >
        {sections.map((section) => (
          <Column key={section.title} verticalArrangement={{ spacedBy: 8 }}>
            <Text color={colors.primary} style={{ typography: 'labelLarge' }}>
              {section.title}
            </Text>
            {section.rows.length > 0 && (
              <Card>
                <Column>
                  {section.rows.map((row) =>
                    row.kind === 'field' ? (
                      <Field key={`${row.label}:${row.value}`} row={row} />
                    ) : (
                      <ListItem
                        key={row.label}
                        colors={{ containerColor: 'transparent' }}
                        modifiers={
                          row.kind === 'action' && !row.disabled ? [clickable(row.onPress)] : []
                        }
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
                            <Switch value={row.value} onCheckedChange={row.onChange} />
                          </ListItem.TrailingContent>
                        )}
                      </ListItem>
                    ),
                  )}
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
    </Host>
  );
}
