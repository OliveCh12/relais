import {
  BottomSheet,
  Button,
  Divider,
  Form,
  Group,
  Host,
  HStack,
  Image,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  disabled,
  font,
  foregroundStyle,
  frame,
  padding,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { availabilityLabels } from '../connections/model';
import type { DeviceDetailsProps, DeviceListProps } from './DeviceList.types';

export function DeviceList(props: DeviceListProps) {
  return (
    <Host colorScheme="dark" matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <VStack alignment="leading" spacing={12}>
        <HStack>
          <Text modifiers={[font({ textStyle: 'headline' })]}>My devices</Text>
          <Spacer />
          <Button
            onPress={props.onRefresh}
            modifiers={[
              buttonStyle('plain'),
              frame({ minWidth: 44, minHeight: 44 }),
              accessibilityLabel('Refresh devices'),
            ]}
          >
            <Image systemName="arrow.clockwise" size={20} />
          </Button>
        </HStack>
        {!props.rows.length && (
          <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle('#C7C7CC')]}>
            Your phones will appear here after their first QR connection.
          </Text>
        )}
        {props.rows.map((row) => (
          <VStack key={row.device.id} spacing={0}>
            <HStack spacing={8}>
              <Button onPress={() => props.onSelect(row)} modifiers={[buttonStyle('plain')]}>
                <HStack
                  spacing={14}
                  modifiers={[frame({ maxWidth: Infinity, minHeight: 64, alignment: 'leading' })]}
                >
                  <Image
                    systemName="iphone"
                    size={26}
                    color={row.availability === 'available' ? '#30D158' : '#8E8E93'}
                  />
                  <VStack
                    alignment="leading"
                    spacing={4}
                    modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
                  >
                    <Text modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}>
                      {row.device.name}
                    </Text>
                    <Text
                      modifiers={[
                        font({ textStyle: 'footnote' }),
                        foregroundStyle(row.availability === 'available' ? '#30D158' : '#C7C7CC'),
                      ]}
                    >
                      {availabilityLabels[row.availability]}
                    </Text>
                  </VStack>
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
                <Image systemName="info.circle" size={22} />
              </Button>
            </HStack>
            <Divider />
          </VStack>
        ))}
        {props.rows.length > 0 && (
          <Text modifiers={[font({ textStyle: 'footnote' }), foregroundStyle('#C7C7CC')]}>
            Start sharing on the other phone. Tap its name when it is available.
          </Text>
        )}
      </VStack>
    </Host>
  );
}

export function DeviceDetails(props: DeviceDetailsProps) {
  const name = useNativeState(props.row.device.name);
  return (
    <Host style={{ height: 0, width: '100%' }}>
      <BottomSheet
        isPresented
        onIsPresentedChange={(visible) => {
          if (!visible) props.onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}
        >
          <VStack spacing={0}>
            <HStack modifiers={[padding({ horizontal: 20, top: 20, bottom: 8 })]}>
              <Text modifiers={[font({ textStyle: 'headline' })]}>Device saved</Text>
              <Spacer />
              <Button label="Done" onPress={props.onClose} />
            </HStack>
            <Form>
              <Section title="Name on this phone">
                <TextField text={name} maxLength={60} placeholder="Device name" />
                <Button label="Save name" onPress={() => props.onRename(name.get())} />
              </Section>
              <Section
                title={availabilityLabels[props.row.availability]}
                footer={
                  <Text>
                    Both apps must be open on the same Wi-Fi network, with the Camera phone sharing
                    its view.
                  </Text>
                }
              >
                <Text>{`Last connected: ${new Date(props.row.device.lastConnectedAt).toLocaleString('en-US')}`}</Text>
                <Button
                  label="Connect"
                  onPress={props.onConnect}
                  modifiers={[disabled(props.row.availability !== 'available')]}
                />
              </Section>
              <Section>
                <Button label="Forget this device" role="destructive" onPress={props.onForget} />
              </Section>
            </Form>
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
