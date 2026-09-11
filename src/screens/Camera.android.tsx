import NativeEngine from '../../modules/relais-camera-engine/src/android/CameraModule';
import { ViewfinderGesture } from '@/components/ViewfinderGesture';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import {
  LocalCameraPreview,
  useLocalCameraEngine,
} from '../../modules/relais-camera-engine/src/android/LocalCamera';
import { CameraIconButton } from '@/components/CameraIconButton';
import { CameraOptions } from '@/components/CameraOptions';
import { ActionButton } from '@/components/ActionButton';
import { CaptureModes } from '@/components/CaptureModes';
import { useCaptureSession } from '@/capture/SessionContext';
import { CameraZoom } from '@/components/CameraZoom';

function act(action: () => Promise<unknown>) {
  void action().catch((error: unknown) =>
    Alert.alert('Camera', error instanceof Error ? error.message : 'Try again in a moment.'),
  );
}

export default function CameraScreen() {
  useKeepAwake();
  const { connection, updateCamera } = useCaptureSession();
  const engine = useLocalCameraEngine(connection.focused);
  const [settings, setSettings] = useState(false);
  const controls = engine.captureState.settings?.controls;
  const countdown = engine.recording.phase === 'countdown';
  useEffect(() => {
    updateCamera(engine.captureState, engine.perform);
  }, [engine.captureState, engine.perform, updateCamera]);
  const { grid, setGrid } = engine;
  useEffect(() => {
    if (!__DEV__) return;
    const runtime = globalThis as typeof globalThis & {
      __relaisAndroidCameraTest?: (action: string) => unknown;
    };
    runtime.__relaisAndroidCameraTest = (action) =>
      action === 'state'
        ? {
            ...engine.captureState,
            qr: connection.qr,
            connected: connection.connected,
            status: connection.status,
          }
        : action === 'open'
          ? engine.open()
          : engine.perform(action as Parameters<typeof engine.perform>[0]);
    return () => {
      delete runtime.__relaisAndroidCameraTest;
    };
  }, [engine, connection.qr, connection.connected, connection.status]);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const landscape = window.width > window.height;
  const recording = engine.recording.phase === 'recording';
  const transitioning = engine.busy && !recording;
  const { busy, stop } = engine;
  const close = useCallback(() => {
    if (!busy) {
      router.back();
      return;
    }
    Alert.alert('Close Camera?', 'Finish saving this capture before closing Camera.', [
      { text: 'Stay in Camera', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () =>
          act(async () => {
            await stop();
            router.back();
          }),
      },
    ]);
  }, [busy, stop]);
  useFocusEffect(
    useCallback(() => {
      if (!engine.busy) return;
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        close();
        return true;
      });
      return () => listener.remove();
    }, [engine.busy, close]),
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !engine.busy }} />
      <StatusBar style="light" />
      <ViewfinderGesture
        enabled={engine.ready && (!engine.busy || recording)}
        nativeZoom
        {...(controls ? { controls } : {})}
        onFocus={(point) => engine.focus(point)}
        onExposure={engine.setExposure}
        onError={(error) =>
          Alert.alert(
            'Camera',
            error instanceof Error ? error.message : 'Could not adjust the camera.',
          )
        }
      >
        <LocalCameraPreview engine={engine} />
      </ViewfinderGesture>
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
            <Text style={styles.quality}>
              {engine.quality || (engine.mode === 'photo' ? 'PHOTO' : 'VIDEO')}
            </Text>
          )}
          {engine.enabled && engine.mode !== 'photo' && (
            <Text style={styles.caption}>{engine.audio ? 'With audio' : 'No audio'}</Text>
          )}
        </View>
        <CameraIconButton
          icon="qr"
          label="Connect a monitor"
          onPress={() => router.push('/camera/connect')}
        />
        <CameraIconButton
          icon="settings"
          label="Camera settings"
          onPress={() => setSettings(true)}
          disabled={!engine.enabled}
        />
      </View>
      {!engine.enabled && (
        <View style={styles.welcome}>
          <Text style={styles.title}>Ready to capture</Text>
          <Text style={styles.description}>
            Photos and videos are saved on this phone, then added to the gallery.
          </Text>
          <ActionButton dark icon="camera" label="Open Camera" onPress={() => act(engine.open)} />
          {engine.pending.length > 0 && (
            <ActionButton
              dark
              secondary
              icon="gallery"
              label={`Add ${engine.pending.length} ${engine.pending.length === 1 ? 'capture' : 'captures'} to gallery`}
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
              label={`Add ${engine.pending.length} ${engine.pending.length === 1 ? 'capture' : 'captures'} to gallery`}
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
              icon="gallery"
              roundedSquare
              label="Open gallery"
              disabled={engine.busy}
              onPress={() => act(() => NativeEngine.openGallery())}
            />
            <CameraIconButton
              large
              photo={engine.mode === 'photo'}
              icon={recording || countdown ? 'stop' : 'record'}
              label={
                countdown
                  ? 'Cancel photo timer'
                  : recording
                    ? 'Stop recording'
                    : engine.mode === 'photo'
                      ? 'Take a photo'
                      : 'Record a video'
              }
              disabled={
                !countdown && (transitioning || (!recording && !engine.captureState.canCapture))
              }
              onPress={() =>
                act(
                  countdown
                    ? async () => engine.cancelTimer()
                    : recording
                      ? engine.stop
                      : engine.mode === 'photo'
                        ? engine.takePhoto
                        : engine.start,
                )
              }
            />
            <CameraIconButton
              icon="flip"
              roundedSquare
              label="Switch camera"
              disabled={!engine.ready || engine.busy || !engine.canFlip}
              onPress={engine.flip}
            />
          </View>
          {!landscape && (
            <CaptureModes
              mode={engine.mode}
              modes={['photo', 'video']}
              disabled={engine.busy || !engine.ready}
              onMode={engine.selectMode}
            />
          )}
          {!landscape && (
            <Text style={styles.hint}>
              {connection.connected
                ? `Connected to ${connection.device?.name ?? 'Monitor'}`
                : 'Tap the viewfinder to adjust brightness'}
            </Text>
          )}
        </View>
      )}
      {landscape && engine.enabled && (
        <View
          style={{
            position: 'absolute',
            left: insets.left + 20,
            right: insets.right + 132,
            bottom: insets.bottom + 12,
          }}
        >
          <CaptureModes
            mode={engine.mode}
            modes={['photo', 'video']}
            disabled={engine.busy || !engine.ready}
            onMode={engine.selectMode}
          />
        </View>
      )}
      <CameraOptions
        visible={settings}
        onClose={() => setSettings(false)}
        {...(controls ? { controls } : {})}
        onSetting={(setting) =>
          act(() =>
            engine.perform({
              type: 'settings',
              revision: engine.captureState.settings!.revision,
              ...setting,
            }),
          )
        }
        audio={engine.audio}
        stabilization={engine.captureState.settings?.stabilization ?? false}
        canStabilize={engine.captureState.settings?.canStabilize ?? false}
        onAudio={(value) => act(() => engine.setMicrophone(value))}
        grid={grid}
        onGrid={setGrid}
        quality={engine.quality}
        disabled={engine.busy || !engine.ready}
        profiles={engine.profiles}
        selectedProfile={engine.selectedProfile}
        onProfile={engine.selectProfile}
        mode={engine.mode}
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
    <Text accessibilityLabel={`Recording, ${seconds} seconds`} style={styles.timer}>
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
