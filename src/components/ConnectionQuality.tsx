import { StyleSheet, Text, View } from 'react-native';
import { linkQuality, type LinkSample } from '../connections/quality';

export function ConnectionQuality({ sample }: { sample: LinkSample | null }) {
  const quality = linkQuality(sample);
  const color = quality.bars === 1 ? '#FF9F0A' : quality.bars === 0 ? '#8E8E93' : '#30D158';
  return (
    <View style={styles.row} accessible accessibilityLabel={quality.label}>
      <View style={styles.bars}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={{
              width: 4,
              height: 4 + bar * 4,
              borderRadius: 1,
              backgroundColor: bar <= quality.bars ? color : '#48484A',
            }}
          />
        ))}
      </View>
      <Text style={styles.text}>{quality.label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  text: { color: '#D1D1D6', fontSize: 11 },
});
