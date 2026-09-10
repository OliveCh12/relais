import { Stack } from 'expo-router';
import {
  Button,
  Host,
  HStack,
  Image,
  List,
  ProgressView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  disabled,
  font,
  foregroundStyle,
  frame,
  listStyle,
  padding,
  refreshable,
} from '@expo/ui/swift-ui/modifiers';
import { availabilityLabels } from '@/connections/model';
import type { MonitorSetupProps } from './MonitorSetup.types';

export function MonitorSetup(props: MonitorSetupProps) {
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="Camera list options">
          <Stack.Toolbar.MenuAction
            icon="arrow.clockwise"
            onPress={props.onRefresh}
            disabled={props.connecting}
          >
            Refresh cameras
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="network"
            onPress={props.onSettings}
            disabled={props.connecting}
          >
            Connection settings
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Add camera"
          onPress={props.onAdd}
          disabled={props.connecting}
        />
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <List
          modifiers={[
            listStyle('insetGrouped'),
            refreshable(async () => {
              if (!props.connecting) props.onRefresh();
            }),
          ]}
        >
          {props.connecting && (
            <Section>
              <HStack spacing={12}>
                <ProgressView />
                <Text>Connecting…</Text>
                <Spacer />
                <Button label="Cancel" onPress={props.onCancel} />
              </HStack>
            </Section>
          )}
          <Section
            title="My cameras"
            footer={
              <Text>{props.status || 'Open Camera on your other phone to make it available.'}</Text>
            }
          >
            {props.rows.length === 0 && (
              <VStack alignment="leading" spacing={8} modifiers={[padding({ vertical: 12 })]}>
                <Text modifiers={[font({ textStyle: 'headline' })]}>Add your first camera</Text>
                <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
                  Tap + to connect another phone.
                </Text>
              </VStack>
            )}
            {props.rows.map((row) => (
              <HStack key={row.device.id} spacing={12}>
                <Button
                  onPress={() => props.onSelect(row)}
                  modifiers={[buttonStyle('plain'), disabled(props.connecting)]}
                >
                  <HStack
                    spacing={12}
                    modifiers={[frame({ maxWidth: Infinity, minHeight: 52, alignment: 'leading' })]}
                  >
                    <Image
                      systemName="smartphone"
                      size={24}
                      modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
                    />
                    <VStack alignment="leading" spacing={3}>
                      <Text modifiers={[font({ textStyle: 'body' })]}>{row.device.name}</Text>
                      <Text
                        modifiers={[
                          font({ textStyle: 'subheadline' }),
                          foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                        ]}
                      >
                        {availabilityLabels[row.availability]}
                      </Text>
                    </VStack>
                    <Spacer />
                  </HStack>
                </Button>
                <Button
                  onPress={() => props.onDetails(row)}
                  modifiers={[
                    buttonStyle('plain'),
                    frame({ minWidth: 44, minHeight: 44 }),
                    accessibilityLabel(`Details for ${row.device.name}`),
                  ]}
                >
                  <Image systemName="info.circle" size={20} />
                </Button>
              </HStack>
            ))}
          </Section>
        </List>
      </Host>
    </>
  );
}
