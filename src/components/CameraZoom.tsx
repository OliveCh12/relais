import { Host, Row, Text, TextButton } from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';

export function CameraZoom({
  stops,
  onZoom,
  disabled,
}: {
  stops: number[];
  onZoom: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <Host colorScheme="dark" matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Row horizontalArrangement="center" modifiers={[fillMaxWidth()]}>
        {stops.map((value) => (
          <TextButton
            key={value}
            enabled={!disabled}
            onClick={() => onZoom(value)}
            modifiers={[defaultMinSize({ minWidth: 48, minHeight: 48 })]}
          >
            <Text>{`${Number(value.toFixed(1))}×`}</Text>
          </TextButton>
        ))}
      </Row>
    </Host>
  );
}
