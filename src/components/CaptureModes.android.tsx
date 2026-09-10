import {
  Host,
  SingleChoiceSegmentedButtonRow,
  SegmentedButton,
  Text,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { captureModeLabels, type CaptureModesProps } from './CaptureModes.types';
export function CaptureModes(props: CaptureModesProps) {
  return (
    <Host
      colorScheme="dark"
      matchContents
      style={{ alignSelf: 'center', width: '100%', maxWidth: 320 }}
    >
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
        {props.modes.map((mode) => (
          <SegmentedButton
            key={mode}
            selected={props.mode === mode}
            enabled={!props.disabled}
            onClick={() => props.onMode(mode)}
          >
            <SegmentedButton.Label>
              <Text>{captureModeLabels[mode]}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
