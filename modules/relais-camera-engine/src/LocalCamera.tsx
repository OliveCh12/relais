import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useVideoOutput,
  VisionCamera,
  CommonDynamicRanges,
  type CameraRef,
  type CameraSessionConfig,
  type Constraint,
} from 'react-native-vision-camera';
import NativeEngine, { type RecordingProfile } from './index';
import { RecordingController } from './RecordingController';
import { closestRecordingProfile, recordingResolutionLabel } from './recordingProfiles';

export function useLocalCameraEngine() {
  const [enabled, setEnabled] = useState(
    () =>
      VisionCamera.cameraPermissionStatus === 'authorized' &&
      VisionCamera.microphonePermissionStatus !== 'not-determined',
  );
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [position, setPosition] = useState<'back' | 'front'>('back');
  const [audio, setAudio] = useState(
    () => VisionCamera.microphonePermissionStatus === 'authorized',
  );
  const [torch, setTorch] = useState(false);
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
  const [stabilization, setStabilization] = useState(true);
  const [exposure, setExposure] = useState(0);
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
  const outputs = useMemo(() => [output], [output]);
  const constraints = useMemo<Constraint[]>(
    () => [
      { resolutionBias: output },
      { fps: selectedProfile?.fps ?? 30 },
      {
        videoDynamicRange: selectedProfile?.hdr
          ? CommonDynamicRanges.ANY_HDR
          : CommonDynamicRanges.ANY_SDR,
      },
      {
        videoStabilizationMode:
          stabilization && device?.supportsVideoStabilizationMode('standard') ? 'standard' : 'off',
      },
    ],
    [output, selectedProfile?.fps, selectedProfile?.hdr, stabilization, device],
  );
  const [recorder] = useState(
    () => new RecordingController((path) => NativeEngine.saveVideoToLibrary(path)),
  );
  const recording = useSyncExternalStore(recorder.subscribe, recorder.getSnapshot);
  const busy =
    recovering || ['starting', 'recording', 'stopping', 'saving'].includes(recording.phase);
  const updateReady = useCallback((value: boolean) => {
    readyRef.current = value;
    setReady(value);
  }, []);
  const reportError = useCallback(
    (failure: Error) => {
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
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        readyRef.current = false;
        void recorder
          .stop()
          .then(() => setForeground(AppState.currentState === 'active'))
          .catch(() => setError('Tap the red button to finish recording.'));
      } else if (state === 'active') setForeground(true);
    });
    return () => {
      listener.remove();
      readyRef.current = false;
      void recorder.stop().catch(() => {});
    };
  }, [recorder]);

  const open = async () => {
    setError('');
    if (!(await VisionCamera.requestCameraPermission())) {
      setError('Allow camera access in your phone’s settings.');
      return;
    }
    setAudio(await VisionCamera.requestMicrophonePermission());
    setEnabled(true);
  };

  const setMicrophone = async (value: boolean) => {
    if (busy || value === audio) return;
    if (value && !(await VisionCamera.requestMicrophonePermission())) {
      setError('Allow microphone access in your phone’s settings to record audio.');
      return;
    }
    updateReady(false);
    setError('');
    setAudio(value);
  };

  const start = () =>
    recorder.start(async () => {
      if (!readyRef.current) throw new Error('Wait for the camera to be ready.');
      const path = await NativeEngine.createRecordingPath();
      const nativeRecorder = await output.createRecorder({ filePath: path });
      if (!readyRef.current) throw new Error('Camera interrupted. Try again.');
      return nativeRecorder;
    });

  const flip = () => {
    if (busy || !alternate) return;
    updateReady(false);
    setError('');
    setQuality('');
    setTorch(false);
    setExposure(0);
    setPosition((value) => (value === 'back' ? 'front' : 'back'));
  };

  const selectedFPS = useRef<number | undefined>(undefined);
  const selectedHDR = useRef(false);
  const configured = useCallback(() => {
    const resolution = output.currentResolution;
    setQuality(
      resolution
        ? `${recordingResolutionLabel(Math.min(resolution.width, resolution.height))}${selectedFPS.current ? ` · ${selectedFPS.current} fps` : ''}${selectedHDR.current ? ' · HDR' : ''}`
        : 'Automatic quality',
    );
    updateReady(runningRef.current);
  }, [output, updateReady]);

  return {
    enabled,
    ready,
    error,
    quality,
    profiles,
    selectedProfile,
    selectProfile: (profile: RecordingProfile) => {
      if (busy) return;
      updateReady(false);
      setRequested(profile);
      setError('');
    },
    stabilization,
    canStabilize: device?.supportsVideoStabilizationMode('standard') ?? false,
    setStabilization: (value: boolean) => {
      if (busy) return;
      updateReady(false);
      setStabilization(value);
    },
    exposure,
    minExposure: device?.minExposureBias ?? 0,
    maxExposure: device?.maxExposureBias ?? 0,
    setExposure,
    bindCamera,
    zoomStops: device
      ? Array.from(new Set([device.minZoom, 1, 2, ...device.zoomLensSwitchFactors]))
          .filter((value) => value >= device.minZoom && value <= device.maxZoom)
          .sort((a, b) => a - b)
      : [],
    setZoom: (zoom: number) => cameraRef.current?.startZoomAnimation(zoom, 4),
    resetFocus: () => cameraRef.current?.resetFocus(),
    audio,
    torch,
    position,
    busy,
    recording,
    pending,
    recover,
    hasCamera: !!device,
    canFlip: !!alternate,
    hasTorch: device?.hasTorch ?? false,
    open,
    setMicrophone,
    flip,
    start,
    stop: () => recorder.stop(),
    retrySave: () => recorder.retrySave(),
    setTorch: () => {
      if (device?.hasTorch) setTorch((value) => !value);
    },
    device,
    outputs,
    constraints,
    isActive: enabled && foreground && !!selectedProfile,
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
  if (!engine.enabled || !engine.device || !engine.selectedProfile) return null;
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
      enableNativeTapToFocusGesture={engine.device.supportsFocusMetering}
      torchMode={engine.torch ? 'on' : 'off'}
      exposure={engine.exposure}
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
