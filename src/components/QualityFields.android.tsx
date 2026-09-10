import { useWindowDimensions } from 'react-native';
import {
  Column,
  RadioButton,
  Row,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  selectable,
  selectableGroup,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type { QualityModel } from './useQualityModel';

export function QualityFields({ model }: { model: QualityModel }) {
  const { fontScale } = useWindowDimensions();
  const colors = useMaterialColors();
  const quality = model.configuration.fileQuality;
  return (
    <Column verticalArrangement={{ spacedBy: 24 }} modifiers={[fillMaxWidth()]}>
      <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
        Demo profiles
      </Text>
      {model.groups.map((group) => (
        <Column key={group.id} verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
          <Text style={{ typography: 'titleSmall' }}>{group.label}</Text>
          {group.options.length <= 3 && fontScale <= 1.3 ? (
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
              {group.options.map((option) => (
                <SegmentedButton
                  key={option.value}
                  selected={option.value === group.value}
                  onClick={() => model.select(group.id, option.value)}
                >
                  <SegmentedButton.Label>
                    <Text>{option.label}</Text>
                  </SegmentedButton.Label>
                </SegmentedButton>
              ))}
            </SingleChoiceSegmentedButtonRow>
          ) : (
            <Column modifiers={[selectableGroup()]}>
              {group.options.map((option) => (
                <Row
                  key={option.value}
                  verticalAlignment="center"
                  horizontalArrangement={{ spacedBy: 12 }}
                  modifiers={[
                    fillMaxWidth(),
                    defaultMinSize({ minHeight: 48 }),
                    selectable(
                      option.value === group.value,
                      () => model.select(group.id, option.value),
                      'radioButton',
                    ),
                  ]}
                >
                  <RadioButton selected={option.value === group.value} />
                  <Text modifiers={[weight(1)]}>{option.label}</Text>
                </Row>
              ))}
            </Column>
          )}
        </Column>
      ))}
      <Column verticalArrangement={{ spacedBy: 8 }}>
        <Text style={{ typography: 'labelLarge' }}>
          Local file · {quality.codec.toUpperCase()} · {quality.hdr ? 'HDR' : 'SDR'}
        </Text>
        <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
          Preview quality is independent of the recorded file.
        </Text>
      </Column>
    </Column>
  );
}
