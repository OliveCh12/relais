import {
  Button,
  Form,
  Host,
  HStack,
  Image,
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
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { availabilityLabels } from '@/connections/model';
import type { MonitorSetupProps } from './MonitorSetup.types';
export function MonitorSetup(props: MonitorSetupProps) {
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section
          footer={
            <Text>
              Keep both apps open on the same Wi-Fi network. Saved cameras reconnect automatically
              when only one is available.
            </Text>
          }
        >
          <VStack alignment="leading" spacing={8} modifiers={[padding({ vertical: 8 })]}>
            <Text modifiers={[font({ textStyle: 'headline' })]}>
              {props.connecting ? 'Connecting to your camera…' : 'Your camera, from here'}
            </Text>
            <Text
              modifiers={[
                font({ textStyle: 'subheadline' }),
                foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
              ]}
            >
              {props.connecting
                ? props.status
                : 'Open Camera on your other phone. Then choose it below or scan its connection code.'}
            </Text>
          </VStack>
          {props.connecting && <Button label="Cancel connection" onPress={props.onCancel} />}
        </Section>
        <Section title="My cameras">
          {props.rows.length === 0 && <Text>No saved cameras yet.</Text>}
          {props.rows.map((row) => (
            <HStack key={row.device.id} spacing={12}>
              <Button
                onPress={() => props.onSelect(row)}
                modifiers={[buttonStyle('plain'), disabled(props.connecting)]}
              >
                <HStack
                  spacing={12}
                  modifiers={[frame({ maxWidth: Infinity, minHeight: 48, alignment: 'leading' })]}
                >
                  <Image systemName="iphone" size={24} />
                  <VStack alignment="leading" spacing={3}>
                    <Text>{row.device.name}</Text>
                    <Text
                      modifiers={[
                        font({ textStyle: 'caption' }),
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
          <Button
            label="Refresh cameras"
            systemImage="arrow.clockwise"
            onPress={props.onRefresh}
            modifiers={[disabled(props.connecting)]}
          />
        </Section>
        <Section title="Add a camera">
          <Button
            label="Scan connection code"
            systemImage="qrcode.viewfinder"
            onPress={props.onScan}
            modifiers={[disabled(props.connecting)]}
          />
          <Button
            label="Paste a code"
            systemImage="doc.on.clipboard"
            onPress={props.onCode}
            modifiers={[disabled(props.connecting)]}
          />
        </Section>
        <Section footer={<Text>{props.status}</Text>}>
          <Button label="Connection settings" systemImage="network" onPress={props.onSettings} />
        </Section>
      </Form>
    </Host>
  );
}
