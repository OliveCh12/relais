import { useState } from 'react';
import {
  BottomSheet,
  Button,
  Form,
  Group,
  Host,
  HStack,
  RNHostView,
  ScrollView,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  autocorrectionDisabled,
  buttonStyle,
  controlSize,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  padding,
  presentationDetents,
  presentationDragIndicator,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { PairingCodeImage } from './PairingCodeImage';
import {
  connectionTitles,
  previewExplanation,
  qrInstructions,
  serverExplanation,
  type ConnectionSheetProps,
} from './ConnectionSheet.types';

export function ConnectionSheet(props: ConnectionSheetProps) {
  const [lastPanel, setLastPanel] = useState(props.panel ?? 'options');
  if (props.panel && props.panel !== lastPanel) setLastPanel(props.panel);
  const panel = props.panel ?? lastPanel;
  const code = useNativeState('');
  const address = useNativeState(props.server);
  return (
    <Host style={{ width: '100%', height: 0 }}>
      <BottomSheet
        isPresented={props.panel !== null}
        onIsPresentedChange={(visible) => {
          if (!visible) props.onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDetents(panel === 'qr' ? ['large'] : ['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}
        >
          <VStack spacing={0}>
            <HStack modifiers={[padding({ horizontal: 20, top: 24, bottom: 12 })]}>
              <Text
                modifiers={[
                  font({ textStyle: 'headline' }),
                  frame({ maxWidth: Infinity, alignment: 'leading' }),
                ]}
              >
                {connectionTitles[panel]}
              </Text>
              <Spacer />
              <Button label="Done" onPress={props.onClose} />
            </HStack>
            {panel === 'qr' && props.qr ? (
              <ScrollView>
                <VStack spacing={24} modifiers={[padding({ all: 24 })]}>
                  <Text>{qrInstructions}</Text>
                  <RNHostView matchContents>
                    <PairingCodeImage value={props.qr} />
                  </RNHostView>
                  <Button
                    label="Share code"
                    systemImage="square.and.arrow.up"
                    onPress={props.onShare}
                    modifiers={[buttonStyle('bordered'), controlSize('large')]}
                  />
                  <Text
                    modifiers={[
                      font({ textStyle: 'footnote' }),
                      foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                    ]}
                  >
                    Keep both apps open on the same Wi-Fi network. Dismissing this sheet keeps
                    sharing active.
                  </Text>
                </VStack>
              </ScrollView>
            ) : (
              <Form>
                {panel === 'options' && (
                  <>
                    {props.active ? (
                      <Section
                        title={props.deviceName ?? 'Connection'}
                        footer={<Text>{previewExplanation}</Text>}
                      >
                        <Text>{props.status}</Text>
                        <Toggle label="Fill screen" isOn={props.fill} onIsOnChange={props.onFill} />
                        {props.qr && (
                          <Button
                            label="Show QR code"
                            systemImage="qrcode"
                            onPress={() => props.onPanel('qr')}
                          />
                        )}
                      </Section>
                    ) : (
                      <>
                        <Section title="Another method">
                          <Button
                            label="Paste a connection code"
                            systemImage="doc.on.clipboard"
                            onPress={() => props.onPanel('code')}
                          />
                        </Section>
                        <Section title="Test version" footer={<Text>{serverExplanation}</Text>}>
                          <Button
                            label="Mac connection"
                            systemImage="network"
                            onPress={() => props.onPanel('server')}
                          />
                        </Section>
                      </>
                    )}
                  </>
                )}
                {panel === 'code' && (
                  <Section
                    title="Shared code"
                    footer={
                      <Text>
                        On the phone sharing its view, choose Share code, then paste it here.
                      </Text>
                    }
                  >
                    <TextField
                      text={code}
                      placeholder="Paste code"
                      axis="vertical"
                      maxLength={2048}
                      modifiers={[
                        autocorrectionDisabled(),
                        textInputAutocapitalization('never'),
                        accessibilityLabel('Connection code'),
                      ]}
                    />
                    {props.error && <Text modifiers={[foregroundStyle('red')]}>{props.error}</Text>}
                    <Button label="Continue" onPress={() => props.onCode(code.get())} />
                  </Section>
                )}
                {panel === 'server' && (
                  <Section title="Mac address" footer={<Text>{serverExplanation}</Text>}>
                    <TextField
                      text={address}
                      placeholder="http://192.168.1.10:8787"
                      maxLength={300}
                      modifiers={[
                        keyboardType('url'),
                        autocorrectionDisabled(),
                        textInputAutocapitalization('never'),
                        accessibilityLabel('Mac address'),
                      ]}
                    />
                    {props.error && <Text modifiers={[foregroundStyle('red')]}>{props.error}</Text>}
                    <Button label="Save" onPress={() => props.onServer(address.get())} />
                  </Section>
                )}
              </Form>
            )}
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
