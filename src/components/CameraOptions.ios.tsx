import {
  BottomSheet,
  Button,
  Form,
  Group,
  Host,
  HStack,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
} from '@expo/ui/swift-ui';
import {
  disabled,
  font,
  padding,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type { CameraOptionsProps } from './CameraOptions.types';

export function CameraOptions(props: CameraOptionsProps) {
  return (
    <Host style={{ height: 0, width: '100%' }} colorScheme="dark">
      <BottomSheet
        isPresented={props.visible}
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
              <Text modifiers={[font({ textStyle: 'headline' })]}>Video settings</Text>
              <Spacer />
              <Button label="Done" onPress={props.onClose} />
            </HStack>
            <Form>
              <Section>
                <Toggle
                  label="Record audio"
                  systemImage="mic"
                  isOn={props.audio}
                  onIsOnChange={props.onAudio}
                  modifiers={[disabled(props.disabled)]}
                />
                <Toggle
                  label="Grid"
                  systemImage="grid"
                  isOn={props.grid}
                  onIsOnChange={props.onGrid}
                />
              </Section>
              <Section
                title="On this phone"
                footer={
                  <Text>
                    Quality adapts to the lens. Videos are added to Photos after each recording.
                  </Text>
                }
              >
                <Text>{props.quality || 'Opening camera…'}</Text>
              </Section>
              <Section>
                <Text>Pinch to zoom. Tap your subject to focus.</Text>
              </Section>
            </Form>
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
