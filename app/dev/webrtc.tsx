import { Redirect } from 'expo-router';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro removes this dev-only camera import in release.
const SpikeScreen = __DEV__ ? require('@/spikes/webrtc-preview/SpikeScreen').default : null;

export default function DevWebRtcRoute() {
  return SpikeScreen ? <SpikeScreen /> : <Redirect href="/" />;
}
