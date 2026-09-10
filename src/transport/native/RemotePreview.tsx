import { StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from './media';
export function RemotePreview({ stream, fill = false }: { stream: MediaStream; fill?: boolean }) {
  return (
    <RTCView
      streamURL={stream.toURL()}
      style={StyleSheet.absoluteFill}
      objectFit={fill ? 'cover' : 'contain'}
      mirror={false}
    />
  );
}
