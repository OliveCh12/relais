import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useVideoOutput,
  usePhotoOutput,
  VisionCamera,
  CommonDynamicRanges,
  type CameraRef,
  type CameraSessionConfig,
  type Constraint,
  type CameraOutput,
} from 'react-native-vision-camera';
import { NitroModules } from 'react-native-nitro-modules';
import type { CaptureAction, CaptureMode, CaptureState } from '../../../src/capture/protocol';
import NativeEngine, { type RecordingProfile } from './index';
import { RecordingController } from './RecordingController';
import { closestRecordingProfile, recordingResolutionLabel } from './recordingProfiles';

const PHOTO_RESOLUTION = { width: 8192, height: 6144 };

export function useLocalCameraEngine(isFocused: boolean) {
  const [mode, setMode] = useState<CaptureMode>('photo');
  const modeRef = useRef<CaptureMode>('photo');
  const photoBusy = useRef(false);
  const photoFinalization = useRef<Promise<void>>(Promise.resolve());
  const photoCompletion = useRef<Promise<void>>(Promise.resolve());
  const [photoState, setPhotoState] = useState({
    phase: 'idle',
    startedAt: null as number | null,
    message: '',
    pendingPath: null as string | null,
  });
  const [enabled, setEnabled] = useState(
    () =>
      VisionCamera.cameraPermissionStatus === 'authorized' &&
      VisionCamera.microphonePermissionStatus !== 'not-determined',
  );
  const [foreground, setForeground] = useState(isFocused && AppState.currentState === 'active');
  const visibilityGeneration = useRef(0);
  const screenGeneration = useRef(0);
  const visibleRef = useRef(isFocused);
  const [position, setPosition] = useState<'back' | 'front'>('back');
  const [audio, setAudio] = useState(
    () => VisionCamera.microphonePermissionStatus === 'authorized',
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState('');
  const [requested, setRequested] = useState<RecordingProfile>({
    height: 2160,
    fps: 30,
    hdr: true,
  });
  const [profileCatalog, setProfileCatalog] = useState<{
    key: string;
    profiles: RecordingProfile[];
  } | null>(null);
  const stabilization = true;
  const cameraRef = useRef<CameraRef>(null);
  const bindCamera = useCallback((camera: CameraRef | null) => {
    cameraRef.current = camera;
  }, []);
  const [pending, setPending] = useState<string[]>([]);
  const [recovering, setRecovering] = useState(false);
  const recoveringRef = useRef(false);
  const runningRef = useRef(false);
  const readyRef = useRef(false);
  const device = useCameraDevice(position);
  const alternate = useCameraDevice(position === 'back' ? 'front' : 'back');
  const profileKey = `${device?.id}:${stabilization}`;
  const profiles = profileCatalog?.key === profileKey ? profileCatalog.profiles : [];
  const selectedProfile = closestRecordingProfile(profiles, requested);
  const resolution = useMemo(() => {
    const height = selectedProfile?.height ?? 2160;
    return { width: height === 480 ? 640 : Math.round((height * 16) / 9), height };
  }, [selectedProfile?.height]);
  useEffect(() => {
    if (!device || !enabled) return;
    let current = true;
    void NativeEngine.getRecordingProfiles(device.id, stabilization)
      .then((profiles) => {
        if (current) setProfileCatalog({ key: profileKey, profiles });
      })
      .catch(() => {
        if (current) setError('Could not read this camera’s settings. Reopen Camera.');
      });
    return () => {
      current = false;
    };
  }, [device, enabled, stabilization, profileKey]);
  const output = useVideoOutput({
    targetResolution: resolution,
    enableAudio: audio,
  });
  const photoOutput = usePhotoOutput({
    targetResolution: PHOTO_RESOLUTION,
    qualityPrioritization: 'quality',
    containerFormat: 'jpeg',
  });
  const [previewOutput] = useState(() => {
    NativeEngine.initializePreviewOutput();
    return NitroModules.createHybridObject<CameraOutput>('CameraOutput');
  });
  const activeOutput = mode === 'photo' ? photoOutput : output;
  const outputs = useMemo(() => [activeOutput, previewOutput], [activeOutput, previewOutput]);
  const constraints = useMemo<Constraint[]>(
    () =>
      mode === 'photo'
        ? [{ resolutionBias: photoOutput }]
        : [
            { resolutionBias: output },
            { fps: selectedProfile?.fps ?? 30 },
            {
              videoDynamicRange: selectedProfile?.hdr
                ? CommonDynamicRanges.ANY_HDR
                : CommonDynamicRanges.ANY_SDR,
            },
            {
              videoStabilizationMode:
                stabilization && device?.supportsVideoStabilizationMode('standard')
                  ? 'standard'
                  : 'off',
            },
          ],
    [mode, photoOutput, output, selectedProfile?.fps, selectedProfile?.hdr, stabilization, device],
  );
  const [recorder] = useState(
    () => new RecordingController((path) => NativeEngine.saveVideoToLibrary(path)),
  );
  const videoState = useSyncExternalStore(recorder.subscribe, recorder.getSnapshot);
  const recording = mode === 'photo' ? photoState : videoState;
  const stop = useCallback(async () => {
    await recorder.stop();
    await photoCompletion.current;
  }, [recorder]);
  const busy =
    recovering ||
    ['starting', 'recording', 'stopping', 'capturing', 'saving'].includes(recording.phase);
  const updateReady = useCallback((value: boolean) => {
    readyRef.current = value;
    setReady(value);
  }, []);
  const reportError = useCallback(
    (failure: Error) => {
      runningRef.current = false;
      updateReady(false);
      setError(failure.message);
    },
    [updateReady],
  );

  useEffect(() => {
    void NativeEngine.getPendingRecordings?.()
      .then(setPending)
      .catch(() => {});
  }, []);

  const recover = async () => {
    if (busy || recoveringRef.current) return;
    recoveringRef.current = true;
    setRecovering(true);
    try {
      for (const path of pending) await NativeEngine.saveVideoToLibrary(path);
    } finally {
      try {
        setPending(await NativeEngine.getPendingRecordings());
      } finally {
        recoveringRef.current = false;
        setRecovering(false);
      }
    }
  };

  useEffect(() => {
    let current = true;
    visibleRef.current = isFocused;
    const updateVisibility = () => {
      if (!isFocused || AppState.currentState !== 'active') {
        visibilityGeneration.current += 1;
        updateReady(false);
        void Promise.all([recorder.stopCapture(), photoFinalization.current])
          .catch(() => {
            if (current) setError('Recording interrupted. Reopen Camera to continue.');
          })
          .finally(() => {
            if (current) setForeground(isFocused && AppState.currentState === 'active');
          });
      } else {
        setForeground(true);
        updateReady(runningRef.current);
      }
    };
    const listener = AppState.addEventListener('change', updateVisibility);
    updateVisibility();
    return () => {
      current = false;
      visibleRef.current = false;
      visibilityGeneration.current += 1;
      screenGeneration.current += 1;
      listener.remove();
      readyRef.current = false;
      void recorder.stopCapture().catch(() => {});
    };
  }, [isFocused, recorder, updateReady]);

  const open = async () => {
    const request = screenGeneration.current;
    setError('');
    const granted = await VisionCamera.requestCameraPermission();
    if (!visibleRef.current || request !== screenGeneration.current) return;
    if (!granted) {
      setError('Allow camera access in your phone’s settings.');
      return;
    }
    const audio = await VisionCamera.requestMicrophonePermission();
    if (!visibleRef.current || request !== screenGeneration.current) return;
    setAudio(audio);
    setEnabled(true);
  };

  const setMicrophone = async (value: boolean) => {
    if (busy || value === audio) return;
    const request = screenGeneration.current;
    const granted = !value || (await VisionCamera.requestMicrophonePermission());
    if (!visibleRef.current || request !== screenGeneration.current) return;
    if (!granted) {
      setError('Allow microphone access in your phone’s settings to record audio.');
      return;
    }
    updateReady(false);
    setError('');
    setAudio(value);
  };

  const start = () => {
    const request = visibilityGeneration.current;
    return recorder.start(async () => {
      if (!readyRef.current) throw new Error('Wait for the camera to be ready.');
      const path = await NativeEngine.createRecordingPath();
      const nativeRecorder = await output.createRecorder({ filePath: path });
      if (!readyRef.current || request !== visibilityGeneration.current)
        throw new Error('Camera interrupted. Try again.');
      return nativeRecorder;
    });
  };

  const takePhoto = async () => {
    if (
      !readyRef.current ||
      photoBusy.current ||
      recoveringRef.current ||
      photoState.phase === 'pending' ||
      modeRef.current !== 'photo'
    )
      throw new Error('Wait for the camera to be ready.');
    const request = visibilityGeneration.current;
    photoBusy.current = true;
    let finalized!: () => void;
    let complete!: () => void;
    photoFinalization.current = new Promise((resolve) => {
      finalized = resolve;
    });
    photoCompletion.current = new Promise((resolve) => {
      complete = resolve;
    });
    setPhotoState({ phase: 'capturing', startedAt: null, message: '', pendingPath: null });
    let path: string | null = null;
    try {
      path = await NativeEngine.createPhotoPath();
      if (!readyRef.current || request !== visibilityGeneration.current)
        throw new Error('Camera interrupted. Try again.');
      const photo = await photoOutput.capturePhoto(
        { flashMode: device?.hasFlash ? 'auto' : 'off' },
        {},
      );
      try {
        await photo.saveToFileAsync(path);
      } finally {
        photo.dispose();
      }
      finalized();
      setPhotoState({
        phase: 'saving',
        startedAt: null,
        message: 'Adding to gallery…',
        pendingPath: path,
      });
      await NativeEngine.saveVideoToLibrary(path);
      setPhotoState({
        phase: 'saved',
        startedAt: null,
        message: 'Photo added to gallery',
        pendingPath: null,
      });
    } catch (failure) {
      const files = await NativeEngine.getPendingRecordings().catch((): string[] => []);
      const retained = path && files.includes(path) ? path : null;
      setPhotoState({
        phase: retained ? 'pending' : 'error',
        startedAt: null,
        message: failure instanceof Error ? failure.message : 'Photo could not be saved.',
        pendingPath: retained,
      });
      throw failure;
    } finally {
      photoBusy.current = false;
      finalized();
      complete();
    }
  };
  const selectMode = (value: CaptureMode) => {
    if (busy || photoBusy.current || value === 'cinematic')
      throw new Error('Wait for the camera to finish.');
    if (modeRef.current === value) return;
    updateReady(false);
    modeRef.current = value;
    setMode(value);
    setError('');
  };
  const perform = async (action: CaptureAction) => {
    if (action === 'stop') {
      await stop();
      return;
    }
    if (
      !readyRef.current ||
      photoBusy.current ||
      recoveringRef.current ||
      busy ||
      recording.phase === 'pending'
    )
      throw new Error('Wait for the camera to be ready.');
    if (action === 'photo') {
      await takePhoto();
      return;
    }
    if (action === 'start') {
      if (modeRef.current !== 'video') throw new Error('Switch to Video first.');
      await start();
      if (recorder.getSnapshot().phase === 'error') throw new Error(recorder.getSnapshot().message);
      return;
    }
    selectMode(action.replace('mode-', '') as CaptureMode);
  };

  const flip = () => {
    if (busy || !alternate) return;
    updateReady(false);
    setError('');
    setQuality('');
    setPosition((value) => (value === 'back' ? 'front' : 'back'));
  };

  const selectedFPS = useRef<number | undefined>(undefined);
  const selectedHDR = useRef(false);
  const configured = useCallback(() => {
    const resolution = activeOutput.currentResolution;
    setQuality(
      resolution && mode === 'photo'
        ? `${Math.round((resolution.width * resolution.height) / 1_000_000)} MP`
        : resolution
          ? `${recordingResolutionLabel(Math.min(resolution.width, resolution.height))}${selectedFPS.current ? ` · ${selectedFPS.current} fps` : ''}${selectedHDR.current ? ' · HDR' : ''}`
          : 'Automatic quality',
    );
    updateReady(runningRef.current && visibleRef.current && AppState.currentState === 'active');
  }, [activeOutput, mode, updateReady]);

  const captureState: CaptureState = {
    mode,
    modes: ['photo', 'video'],
    phase: recording.phase,
    ready,
    canShare: ready,
    canCapture: ready && !busy && recording.phase !== 'pending',
    quality,
    message: error || recording.message,
    startedAt: recording.startedAt ?? 0,
  };

  return {
    mode,
    selectMode,
    takePhoto,
    perform,
    captureState,
    enabled,
    ready,
    error,
    quality,
    profiles,
    selectedProfile,
    selectProfile: (profile: RecordingProfile) => {
      if (
        busy ||
        (selectedProfile?.height === profile.height &&
          selectedProfile.fps === profile.fps &&
          selectedProfile.hdr === profile.hdr)
      )
        return;
      updateReady(false);
      setRequested(profile);
      setError('');
    },
    bindCamera,
    zoomStops: device
      ? Array.from(new Set([device.minZoom, 1, 2, ...device.zoomLensSwitchFactors]))
          .filter((value) => value >= device.minZoom && value <= device.maxZoom)
          .sort((a, b) => a - b)
      : [],
    setZoom: (zoom: number) => cameraRef.current?.startZoomAnimation(zoom, 4),
    audio,
    position,
    busy,
    recording,
    pending,
    recover,
    hasCamera: !!device,
    canFlip: !!alternate,
    open,
    setMicrophone,
    flip,
    start,
    stop,
    retrySave: async () => {
      if (mode !== 'photo') {
        await recorder.retrySave();
        return;
      }
      if (!photoState.pendingPath || photoBusy.current) return;
      photoBusy.current = true;
      setPhotoState((state) => ({ ...state, phase: 'saving' }));
      try {
        await NativeEngine.saveVideoToLibrary(photoState.pendingPath);
        setPhotoState({
          phase: 'saved',
          startedAt: null,
          message: 'Photo added to gallery',
          pendingPath: null,
        });
      } catch (error) {
        setPhotoState((state) => ({ ...state, phase: 'pending' }));
        throw error;
      } finally {
        photoBusy.current = false;
      }
    },
    device,
    outputs,
    constraints,
    isActive: enabled && foreground && (mode === 'photo' || !!selectedProfile),
    onConfigured: configured,
    onStarted: () => {
      runningRef.current = true;
      configured();
      setError('');
    },
    onStopped: () => {
      runningRef.current = false;
      updateReady(false);
    },
    onError: reportError,
    onSessionConfigSelected: (config: CameraSessionConfig) => {
      selectedFPS.current = config.selectedFPS;
      selectedHDR.current = config.selectedVideoDynamicRange?.bitDepth === 'hdr-10-bit';
    },
  };
}

export type LocalCameraEngine = ReturnType<typeof useLocalCameraEngine>;

export function LocalCameraPreview({
  engine,
  style,
}: {
  engine: LocalCameraEngine;
  style?: StyleProp<ViewStyle>;
}) {
  if (!engine.enabled || !engine.device || (engine.mode !== 'photo' && !engine.selectedProfile))
    return null;
  return (
    <Camera
      ref={(camera) => engine.bindCamera(camera)}
      style={style ?? StyleSheet.absoluteFill}
      device={engine.device}
      outputs={engine.outputs}
      constraints={engine.constraints}
      isActive={engine.isActive}
      orientationSource="device"
      resizeMode="contain"
      enableNativeZoomGesture
      onConfigured={engine.onConfigured}
      onStarted={engine.onStarted}
      onStopped={engine.onStopped}
      onError={engine.onError}
      onInterruptionStarted={() =>
        engine.onError(
          new Error('Camera interrupted. Your video will be kept if it can be finalized.'),
        )
      }
      onInterruptionEnded={engine.onStarted}
      onSessionConfigSelected={engine.onSessionConfigSelected}
    />
  );
}
