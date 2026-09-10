import { SwipeModes } from './SwipeModes';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { disabled, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { captureModeLabels, type CaptureModesProps } from './CaptureModes.types';
export function CaptureModes(props: CaptureModesProps) {
  return (
    <SwipeModes {...props}>
      <Host
        colorScheme="dark"
        matchContents
        style={{ alignSelf: 'center', width: '100%', maxWidth: 320 }}
      >
        <Picker
          label="Capture mode"
          selection={props.mode}
          onSelectionChange={(mode) => props.onMode(mode as CaptureModesProps['mode'])}
          modifiers={[pickerStyle('segmented'), disabled(props.disabled)]}
        >
          {props.modes.map((mode) => (
            <Text key={mode} modifiers={[tag(mode)]}>
              {captureModeLabels[mode]}
            </Text>
          ))}
        </Picker>
      </Host>
    </SwipeModes>
  );
}
