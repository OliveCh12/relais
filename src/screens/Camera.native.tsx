import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import {
  LocalCameraPreview,
  useLocalCameraEngine,
} from '../../modules/relais-camera-engine/src/LocalCamera';
import { CameraIconButton } from '@/components/CameraIconButton';
import { CameraOptions } from '@/components/CameraOptions';
import { ActionButton } from '@/components/ActionButton';
import { CameraZoom } from '@/components/CameraZoom';

export default function CameraScreen() {
  useKeepAwake();
  const engine = useLocalCameraEngine();
  const [settings, setSettings] = useState(false);
  const [grid, setGrid] = useState(false);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const landscape = window.width > window.height;
  const recording = engine.recording.phase === 'recording';
  const transitioning = engine.busy && !recording;
  const act = (action: () => Promise<unknown>) => {
    void action().catch((error: unknown) =>
      Alert.alert('Camera', error instanceof Error ? error.message : 'Try again in a moment.'),
    );
  };
  const close = () => {
    if (!engine.busy) {
      router.back();
      return;
    }
    Alert.alert('Finish recording?', 'Your recording will be finalized and added to the gallery.', [
      { text: 'Keep recording', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () =>
          act(async () => {
            await engine.stop();
            router.back();
          }),
      },
    ]);
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => listener.remove();
  });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !engine.busy }} />
      <StatusBar style="light" />
      <LocalCameraPreview engine={engine} />
      {grid && engine.enabled && (
        <View pointerEvents="none" style={styles.grid}>
          <View style={[styles.lineV, { left: '33.333%' }]} />
          <View style={[styles.lineV, { left: '66.667%' }]} />
          <View style={[styles.lineH, { top: '33.333%' }]} />
          <View style={[styles.lineH, { top: '66.667%' }]} />
        </View>
      )}
      <View
        style={[
          styles.top,
          { top: insets.top + 6, left: insets.left + 12, right: insets.right + 12 },
        ]}
      >
        <CameraIconButton icon="close" label="Close Camera" onPress={close} />
        <View style={styles.status}>
          {recording ? (
            <RecordingClock startedAt={engine.recording.startedAt} />
          ) : (
            <Text style={styles.quality}>{engine.quality || 'VIDEO'}</Text>
          )}
          {engine.enabled && (
            <Text style={styles.caption}>{engine.audio ? 'With audio' : 'No audio'}</Text>
          )}
        </View>
        <CameraIconButton
          icon="settings"
          label="Video settings"
          onPress={() => setSettings(true)}
          disabled={!engine.enabled}
        />
      </View>
      {!engine.enabled && (
        <View style={styles.welcome}>
          <Text style={styles.title}>Ready to record</Text>
          <Text style={styles.description}>
            Your video will be recorded on this phone, then added to the gallery.
          </Text>
          <ActionButton dark icon="camera" label="Open Camera" onPress={() => act(engine.open)} />
          {engine.pending.length > 0 && (
            <ActionButton
              dark
              secondary
              icon="gallery"
              label={`Add ${engine.pending.length} ${engine.pending.length === 1 ? 'video' : 'videos'} to gallery`}
              disabled={engine.busy}
              onPress={() => act(engine.recover)}
            />
          )}
          {engine.error && (
            <>
              <Text style={styles.description}>{engine.error}</Text>
              <ActionButton
                dark
                secondary
                label="Phone settings"
                onPress={() => act(Linking.openSettings)}
              />
            </>
          )}
        </View>
      )}
      {engine.enabled && !engine.hasCamera && (
        <View style={styles.welcome}>
          <Text style={styles.title}>No camera available</Text>
          <Text style={styles.description}>
            Use a physical phone to record. The simulator can receive the other phone’s video.
          </Text>
        </View>
      )}
      {engine.enabled && (
        <View
          style={[
            styles.bottom,
            landscape
              ? {
                  right: insets.right + 12,
                  top: insets.top + 68,
                  bottom: insets.bottom + 12,
                  width: 96,
                }
              : { left: insets.left + 16, right: insets.right + 16, bottom: insets.bottom + 8 },
          ]}
        >
          {!!(engine.error || engine.recording.message) && (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {engine.error || engine.recording.message}
            </Text>
          )}
          {engine.recording.phase === 'pending' && (
            <ActionButton dark label="Add to gallery" onPress={() => act(engine.retrySave)} />
          )}
          {!engine.busy && engine.pending.length > 0 && engine.recording.phase !== 'pending' && (
            <ActionButton
              dark
              secondary
              label={`Add ${engine.pending.length} ${engine.pending.length === 1 ? 'video' : 'videos'} to gallery`}
              onPress={() => act(engine.recover)}
            />
          )}
          {!landscape && (
            <CameraZoom
              stops={engine.zoomStops}
              disabled={!engine.ready}
              onZoom={(value) => act(async () => engine.setZoom(value))}
            />
          )}
          <View style={[styles.controls, landscape && styles.vertical]}>
            <CameraIconButton
              icon={engine.torch ? 'torch' : 'torchOff'}
              label={engine.torch ? 'Turn off the light' : 'Turn on the light'}
              selected={engine.torch}
              disabled={!engine.ready || !engine.hasTorch}
              onPress={engine.setTorch}
            />
            <CameraIconButton
              large
              icon={recording ? 'stop' : 'record'}
              label={recording ? 'Stop recording' : 'Record a video'}
              disabled={
                transitioning ||
                (!recording && (!engine.ready || engine.recording.phase === 'pending'))
              }
              onPress={() => act(recording ? engine.stop : engine.start)}
            />
            <CameraIconButton
              icon="flip"
              label="Switch camera"
              disabled={!engine.ready || engine.busy || !engine.canFlip}
              onPress={engine.flip}
            />
          </View>
          {!landscape && !engine.busy && (
            <Text style={styles.hint}>Pinch to zoom · Tap to focus</Text>
          )}
        </View>
      )}
      <CameraOptions
        visible={settings}
        onClose={() => setSettings(false)}
        audio={engine.audio}
        onAudio={(value) => act(() => engine.setMicrophone(value))}
        grid={grid}
        onGrid={setGrid}
        quality={engine.quality}
        disabled={engine.busy}
        profiles={engine.profiles}
        selectedProfile={engine.selectedProfile}
        onProfile={engine.selectProfile}
        stabilization={engine.stabilization}
        canStabilize={engine.canStabilize}
        onStabilization={engine.setStabilization}
        exposure={engine.exposure}
        minExposure={engine.minExposure}
        maxExposure={engine.maxExposure}
        onExposure={engine.setExposure}
        onAutoFocus={() => act(async () => engine.resetFocus())}
      />
    </View>
  );
}

function RecordingClock({ startedAt }: { startedAt: number | null }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return (
    <Text accessibilityLabel={`Recording, ${seconds} secondes`} style={styles.timer}>
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00000080',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quality: { color: 'white', fontSize: 13, fontWeight: '600' },
  caption: { color: '#D1D1D6', fontSize: 11 },
  timer: { color: '#FF453A', fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bottom: { position: 'absolute', justifyContent: 'center', gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  vertical: { flexDirection: 'column', gap: 16 },
  message: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#000000B3',
    borderRadius: 8,
  },
  hint: { color: '#D1D1D6', fontSize: 11, textAlign: 'center' },
  welcome: { position: 'absolute', left: 28, right: 28, top: '30%', gap: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  description: { color: '#C7C7CC', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  grid: { ...StyleSheet.absoluteFill },
  lineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#FFFFFF70',
  },
  lineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#FFFFFF70',
  },
});
