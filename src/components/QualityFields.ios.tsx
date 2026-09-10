import { Form, Picker, Section, Text } from '@expo/ui/swift-ui';
import { useWindowDimensions } from 'react-native';
import { font, foregroundStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { QualityModel } from './useQualityModel';

export function QualityFields({ model }: { model: QualityModel }) {
  const { fontScale } = useWindowDimensions();
  const quality = model.configuration.fileQuality;
  return (
    <Form>
      <Section>
        <Text
          modifiers={[
            font({ textStyle: 'footnote' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          Demo profiles
        </Text>
      </Section>
      {model.groups.map((group) => (
        <Section key={group.id} {...(group.id === 'lens' ? {} : { title: group.label })}>
          <Picker
            label={group.label}
            selection={group.value}
            onSelectionChange={(value: string) => model.select(group.id, value)}
            modifiers={[
              pickerStyle(
                group.id === 'lens' || group.options.length > 3 || fontScale > 1.3
                  ? 'menu'
                  : 'segmented',
              ),
            ]}
          >
            {group.options.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Section>
      ))}
      <Section
        title="Local file"
        footer={<Text>Preview quality is independent of the recorded file.</Text>}
      >
        <Text>
          {quality.codec.toUpperCase()} · {quality.hdr ? 'HDR' : 'SDR'}
        </Text>
      </Section>
    </Form>
  );
}
