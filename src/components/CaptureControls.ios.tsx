import { Button, Host, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import type { CaptureControlsProps } from './CaptureControls.types';

export function CaptureControls({
  landscape,
  summary,
  onSettings,
  settingsDisabled,
}: CaptureControlsProps) {
  const Layout = landscape ? VStack : HStack;
  return (
    <Host
      colorScheme="dark"
      matchContents={{ vertical: true }}
      style={{ width: landscape ? 132 : '100%' }}
    >
      <Layout spacing={16} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text
          modifiers={[
            font({ textStyle: 'caption' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            frame({ width: landscape ? 120 : 80 }),
          ]}
        >
          {summary}
        </Text>
        <Button
          modifiers={[
            buttonStyle('plain'),
            disabled(),
            accessibilityLabel('Record — unavailable in this demo'),
          ]}
        >
          <Image
            systemName="record.circle"
            size={76}
            color="#FF6961"
            modifiers={[frame({ minWidth: 88, minHeight: 88 })]}
          />
        </Button>
        <Button
          onPress={onSettings}
          modifiers={[
            buttonStyle('plain'),
            controlSize('large'),
            disabled(settingsDisabled),
            accessibilityLabel('Video settings'),
          ]}
        >
          <Image
            systemName="slider.horizontal.3"
            size={22}
            modifiers={[frame({ minWidth: 48, minHeight: 48 })]}
          />
        </Button>
      </Layout>
    </Host>
  );
}
