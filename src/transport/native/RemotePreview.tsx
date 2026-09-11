import { StyleSheet, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from './media';
export function RemotePreview({
  stream,
  fill = false,
  onDimensionsChange,
}: {
  stream: MediaStream;
  fill?: boolean;
  onDimensionsChange?: (size: { width: number; height: number }) => void;
}) {
  return (
    <View collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <RTCView
        streamURL={stream.toURL()}
        style={StyleSheet.absoluteFill}
        objectFit={fill ? 'cover' : 'contain'}
        mirror={false}
        zOrder={0}
        onDimensionsChange={(event) => onDimensionsChange?.(event.nativeEvent)}
      />
    </View>
  );
}
