import { useEffect, useRef } from 'react';
import { Card, Column, Host, Row, Slider, Text, TextButton } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll, weight } from '@expo/ui/jetpack-compose/modifiers';
import type { ExposureControlProps } from './ExposureControl.types';
export function ExposureControl(props: ExposureControlProps) {
  const value = useRef(props.value);
  useEffect(() => {
    value.current = props.value;
  }, [props.value]);
  return (
    <Host colorScheme="dark" matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Card>
        <Column modifiers={[paddingAll(12)]}>
          <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
            <Text modifiers={[weight(1)]}>Brightness · {props.value.toFixed(1)} EV</Text>
            <TextButton onClick={props.onClose}>
              <Text>Done</Text>
            </TextButton>
          </Row>
          <Slider
            value={props.value}
            min={props.min}
            max={props.max}
            enabled={!props.disabled}
            onValueChange={(next) => {
              value.current = next;
            }}
            onValueChangeFinished={() => props.onChange(value.current)}
          />
        </Column>
      </Card>
    </Host>
  );
}
