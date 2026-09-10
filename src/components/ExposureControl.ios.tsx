import { useEffect, useRef } from 'react';
import { Button, Host, HStack, Slider, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, shapes, disabled, padding } from '@expo/ui/swift-ui/modifiers';
import type { ExposureControlProps } from './ExposureControl.types';
export function ExposureControl(props: ExposureControlProps) {
  const value = useRef(props.value);
  useEffect(() => {
    value.current = props.value;
  }, [props.value]);
  return (
    <Host colorScheme="dark" matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <VStack
        modifiers={[
          padding({ all: 12 }),
          background(
            { type: 'material', material: 'regular' },
            shapes.roundedRectangle({ cornerRadius: 20 }),
          ),
        ]}
      >
        <HStack>
          <Text>Brightness · {props.value.toFixed(1)} EV</Text>
          <Spacer />
          <Button label="Done" onPress={props.onClose} />
        </HStack>
        <Slider
          value={props.value}
          min={props.min}
          max={props.max}
          modifiers={[disabled(props.disabled)]}
          onValueChange={(next) => {
            value.current = next;
          }}
          onEditingChanged={(editing) => {
            if (!editing) props.onChange(value.current);
          }}
        />
      </VStack>
    </Host>
  );
}
