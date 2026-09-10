import { StyleSheet, Text, View } from 'react-native';
import { linkQuality, type LinkSample } from '../connections/quality';
import { Icon } from './icons/Icon';

export function ConnectionQuality({
  sample,
  compact = false,
}: {
  sample: LinkSample | null;
  compact?: boolean;
}) {
  const quality = linkQuality(sample);
  const color = quality.bars === 1 ? '#FF9F0A' : quality.bars === 0 ? '#8E8E93' : '#30D158';
  return (
    <View style={styles.row} accessible accessibilityLabel={quality.label}>
      <Icon
        name={`link${quality.bars}`}
        size={18}
        color={compact && quality.bars > 1 ? '#FFFFFF' : color}
      />
      {!compact && <Text style={styles.text}>{quality.label}</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  text: { color: '#D1D1D6', fontSize: 11 },
});
