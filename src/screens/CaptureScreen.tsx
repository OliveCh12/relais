import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { CameraCapabilities, Role } from '@/domain/camera';
import { mockCapabilities } from '@/capabilities/mock';
import { CaptureControls } from '@/components/CaptureControls';
import { Icon } from '@/components/icons/Icon';
import { QualitySheet } from '@/components/QualitySheet';
import { useQualityModel } from '@/components/useQualityModel';

export function CaptureScreen({
  role,
  capabilities,
  error,
}: {
  role: Role;
  capabilities: CameraCapabilities | null;
  error?: string | null;
}) {
  const window = useWindowDimensions();
  const landscape = window.width > window.height;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const model = useQualityModel(capabilities ?? mockCapabilities);
  const quality = model.configuration.fileQuality;
  const ratio = landscape ? quality.width / quality.height : quality.height / quality.width;
  const width = Math.min(bounds.width, bounds.height * ratio);
  const height = width / ratio;
  const format = aspectLabel(quality.width, quality.height, landscape);
  const origin = role === 'camera' ? 'Local camera' : 'Remote preview';
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.status}>
        <CaptureText style={styles.label}>{origin}</CaptureText>
        <CaptureText style={styles.label}>Not connected</CaptureText>
      </View>
      <View style={[styles.body, landscape && styles.landscape]}>
        <View
          style={styles.previewSpace}
          onLayout={({ nativeEvent: { layout } }) =>
            setBounds((current) =>
              current.width === layout.width && current.height === layout.height
                ? current
                : { width: layout.width, height: layout.height },
            )
          }
        >
          <View style={[styles.preview, { width, height }]}>
            <View style={styles.empty}>
              <Icon name={role} size={44} color="#8D929A" />
              <CaptureText style={styles.emptyTitle}>
                {role === 'camera' ? 'Camera inactive' : 'Waiting for the camera'}
              </CaptureText>
              <CaptureText style={styles.description}>
                {error ?? 'Demo · No image captured'}
              </CaptureText>
            </View>
            <CaptureText style={styles.format}>{format}</CaptureText>
          </View>
        </View>
        <View style={[styles.controls, landscape && styles.sideControls]}>
          <CaptureControls
            landscape={landscape}
            summary={`${quality.height}p\n${quality.fps} fps`}
            onSettings={() => setSettingsOpen(true)}
            settingsDisabled={!capabilities}
          />
        </View>
      </View>
      <QualitySheet model={model} visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

function CaptureText(props: TextProps) {
  const { fontScale } = useWindowDimensions();
  // Refresh native text measurements when Dynamic Type changes.
  return <Text key={fontScale} {...props} />;
}

function aspectLabel(width: number, height: number, landscape: boolean) {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const sides = [width / divisor, height / divisor];
  return (landscape ? sides : sides.reverse()).join(':');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: { color: '#C3C6CC', fontSize: 12, flexShrink: 1 },
  body: { flex: 1, minHeight: 0 },
  landscape: { flexDirection: 'row' },
  previewSpace: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    backgroundColor: '#111214',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { gap: 12, alignItems: 'center', padding: 16 },
  emptyTitle: { color: '#E4E6EA', fontSize: 17, textAlign: 'center', fontWeight: '600' },
  description: { color: '#ADB0B7', fontSize: 13, textAlign: 'center' },
  format: { position: 'absolute', bottom: 12, color: '#ADB0B7', fontSize: 11 },
  controls: { paddingHorizontal: 8, paddingTop: 14, paddingBottom: 8, gap: 12 },
  sideControls: { justifyContent: 'center', paddingVertical: 4 },
});
