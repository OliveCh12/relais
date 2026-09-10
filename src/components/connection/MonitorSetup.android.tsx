import { useState } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Card,
  Column,
  Icon,
  Shape,
  Surface,
  DropdownMenu,
  DropdownMenuItem,
  FloatingActionButton,
  Host,
  IconButton,
  LazyColumn,
  ListItem,
  Text,
  TextButton,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  fillMaxSize,
  padding,
  paddingAll,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import chevron from '@expo/material-symbols/chevron_right.xml';
import { availabilityLabels } from '@/connections/model';
import { NativeIcon } from '../icons/Icon.android';
import type { MonitorSetupProps } from './MonitorSetup.types';

export function MonitorSetup(props: MonitorSetupProps) {
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Host style={{ width: 48, height: 48 }}>
              <DropdownMenu expanded={menuOpen} onDismissRequest={() => setMenuOpen(false)}>
                <DropdownMenu.Trigger>
                  <IconButton onClick={() => setMenuOpen(true)} modifiers={[size(48, 48)]}>
                    <NativeIcon name="more" label="Camera list options" color={colors.onSurface} />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                  <DropdownMenuItem
                    enabled={!props.connecting}
                    onClick={() => {
                      setMenuOpen(false);
                      props.onRefresh();
                    }}
                  >
                    <DropdownMenuItem.Text>
                      <Text>Refresh cameras</Text>
                    </DropdownMenuItem.Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    enabled={!props.connecting}
                    onClick={() => {
                      setMenuOpen(false);
                      props.onSettings();
                    }}
                  >
                    <DropdownMenuItem.Text>
                      <Text>Connection settings</Text>
                    </DropdownMenuItem.Text>
                  </DropdownMenuItem>
                </DropdownMenu.Items>
              </DropdownMenu>
            </Host>
          ),
        }}
      />
      <Host style={{ flex: 1 }}>
        <LazyColumn
          modifiers={[fillMaxSize()]}
          contentPadding={{ top: 16, start: 16, end: 16, bottom: insets.bottom + 100 }}
        >
          {props.connecting && (
            <ListItem>
              <ListItem.HeadlineContent>
                <Text>Connecting…</Text>
              </ListItem.HeadlineContent>
              <ListItem.TrailingContent>
                <TextButton onClick={props.onCancel}>
                  <Text>Cancel</Text>
                </TextButton>
              </ListItem.TrailingContent>
            </ListItem>
          )}
          <Text
            color={colors.primary}
            style={{ typography: 'labelLarge' }}
            modifiers={[padding(24, 12, 24, 12)]}
          >
            My cameras
          </Text>
          {props.rows.length === 0 && (
            <Column modifiers={[paddingAll(24)]} verticalArrangement={{ spacedBy: 8 }}>
              <Text style={{ typography: 'titleMedium' }}>Add your first camera</Text>
              <Text color={colors.onSurfaceVariant}>Tap + to connect another phone.</Text>
            </Column>
          )}
          {props.rows.length > 0 && (
            <Card>
              <Column>
                {props.rows.map((row) => (
                  <ListItem
                    key={row.device.id}
                    colors={{ containerColor: 'transparent' }}
                    modifiers={[
                      clickable(() => {
                        if (!props.connecting) props.onSelect(row);
                      }),
                    ]}
                  >
                    <ListItem.LeadingContent>
                      <Surface
                        shape={Shape.Circle({ radius: 1 })}
                        color={
                          row.availability === 'available'
                            ? colors.primaryContainer
                            : colors.surfaceContainerHighest
                        }
                        modifiers={[size(40, 40)]}
                      >
                        <Box contentAlignment="center" modifiers={[size(40, 40)]}>
                          <NativeIcon
                            name="device"
                            color={
                              row.availability === 'available'
                                ? colors.onPrimaryContainer
                                : colors.onSurfaceVariant
                            }
                          />
                        </Box>
                      </Surface>
                    </ListItem.LeadingContent>
                    <ListItem.HeadlineContent>
                      <Text>{row.device.name}</Text>
                    </ListItem.HeadlineContent>
                    <ListItem.SupportingContent>
                      <Text>{availabilityLabels[row.availability]}</Text>
                    </ListItem.SupportingContent>
                    <ListItem.TrailingContent>
                      <Icon source={chevron} size={20} tint={colors.onSurfaceVariant} />
                    </ListItem.TrailingContent>
                  </ListItem>
                ))}
              </Column>
            </Card>
          )}
          <Text
            color={colors.onSurfaceVariant}
            style={{ typography: 'bodySmall' }}
            modifiers={[padding(24, 16, 24, 16)]}
          >
            {props.status || 'Open Camera on your other phone to make it available.'}
          </Text>
        </LazyColumn>
      </Host>
      {!props.connecting && (
        <Host
          style={{
            position: 'absolute',
            right: insets.right + 20,
            bottom: insets.bottom + 20,
            width: 64,
            height: 64,
          }}
        >
          <FloatingActionButton onClick={props.onAdd}>
            <FloatingActionButton.Icon>
              <NativeIcon name="add" label="Add camera" color={colors.onPrimaryContainer} />
            </FloatingActionButton.Icon>
          </FloatingActionButton>
        </Host>
      )}
    </View>
  );
}
