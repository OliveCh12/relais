import { unrotatePoint, type Point } from '../../../../src/capture/viewfinder';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
import type { CaptureAction, CaptureMode, CaptureState } from '../../../../src/capture/protocol';
import { PhotoTimer } from '../../../../src/capture/PhotoTimer';
import { profileId, type SettingsAction } from '../../../../src/capture/settings';
import NativeEngine from './CameraModule';
import type { RecordingProfile } from '../recordingProfiles';
import { RecordingController } from '../RecordingController';
import { closestRecordingProfile, recordingResolutionLabel } from '../recordingProfiles';

const PHOTO_RESOLUTION = { width: 8192, height: 6144 };

export function useLocalCameraEngine(isFocused: boolean) {
  const [mode, setMode] = useState<CaptureMode>('photo');
  const modeRef = useRef<CaptureMode>('photo');
  const photoBusy = useRef(false);
  const [photoTimer] = useState(() => new PhotoTimer());
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [timerLight, setTimerLight] = useState(false);
  const [flash, setFlash] = useState<'auto' | 'off' | 'on'>('auto');
  const [exposure, setExposureValue] = useState(0);
  const [exposureInfo, setExposureInfo] = useState<{ id: string; step: number } | null>(null);
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
  const [stabilization, setStabilization] = useState(true);
  const [grid, setGrid] = useState(false);
  const [zoom, setZoomValue] = useState(1);
  const revision = useRef(0);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const advanceRevision = useCallback(() => {
    revision.current += 1;
    setSettingsRevision(revision.current);
  }, []);
  const configurationWaiter = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const finishConfiguration = useCallback((error?: Error) => {
    const pending = configurationWaiter.current;
    configurationWaiter.current = null;
    if (!pending) return;
    clearTimeout(pending.timer);
    if (error) pending.reject(error);
    else pending.resolve();
  }, []);
  useEffect(() => () => finishConfiguration(new Error('Camera closed.')), [finishConfiguration]);
  const reconfigure = (change: () => void) =>
    new Promise<void>((resolve, reject) => {
      if (configurationWaiter.current) {
        reject(new Error('Wait for the camera to finish.'));
        return;
      }
      const timer = setTimeout(
        () =>
          finishConfiguration(
            new Error('Camera settings were not confirmed. Check the camera phone.'),
          ),
        20000,
      );
      configurationWaiter.current = { resolve, reject, timer };
      advanceRevision();
      updateReady(false);
      try {
        change();
      } catch (error) {
        finishConfiguration(
          error instanceof Error ? error : new Error('Could not configure the camera.'),
        );
      }
    });
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
  const exposureStep = device && exposureInfo?.id === device.id ? exposureInfo.step : 0;
  useEffect(() => {
    if (!device || !enabled) return;
    let current = true;
    void NativeEngine.getExposureStep(device.id)
      .then((step) => {
        if (current && Number.isFinite(step) && step > 0) {
          setExposureInfo({ id: device.id, step });
          advanceRevision();
        }
      })
      .catch(() => {
        if (current) setExposureInfo(null);
      });
    return () => {
      current = false;
    };
  }, [device, enabled, advanceRevision]);
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
    photoTimer.cancel();
    await recorder.stop();
    await photoCompletion.current;
  }, [recorder, photoTimer]);
  const busy =
    recovering ||
    ['countdown', 'starting', 'recording', 'stopping', 'capturing', 'saving'].includes(
      recording.phase,
    );
  const updateReady = useCallback((value: boolean) => {
    readyRef.current = value;
    setReady(value);
  }, []);
  const reportError = useCallback(
    (failure: Error) => {
      photoTimer.cancel();
      runningRef.current = false;
      updateReady(false);
      finishConfiguration(failure);
      setError(failure.message);
    },
    [updateReady, finishConfiguration, photoTimer],
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
        photoTimer.cancel();
        visibilityGeneration.current += 1;
        finishConfiguration(new Error('Camera interrupted. Reopen Camera to change settings.'));
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
      photoTimer.cancel();
      listener.remove();
      readyRef.current = false;
      void recorder.stopCapture().catch(() => {});
    };
  }, [isFocused, recorder, updateReady, finishConfiguration, photoTimer]);

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
      throw new Error('Allow microphone access in Settings on the camera phone to record audio.');
    }
    updateReady(false);
    setError('');
    advanceRevision();
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
    let path: string | null = null;
    const light =
      timer > 0 && timerLight && device?.hasTorch ? cameraRef.current?.controller : undefined;
    try {
      const countdown = photoTimer.wait(timer, (remaining) =>
        setPhotoState({
          phase: 'countdown',
          startedAt: null,
          message: `Photo in ${remaining}…`,
          pendingPath: null,
        }),
      );
      let elapsed: boolean;
      try {
        if (light) await light.setTorchMode('on');
        elapsed = await countdown;
      } finally {
        photoTimer.cancel();
        if (light) await light.setTorchMode('off');
      }
      if (!elapsed) {
        if (!readyRef.current || request !== visibilityGeneration.current)
          throw new Error('Camera interrupted. Photo canceled.');
        setPhotoState({
          phase: 'idle',
          startedAt: null,
          message: 'Photo canceled',
          pendingPath: null,
        });
        return;
      }
      setPhotoState({ phase: 'capturing', startedAt: null, message: '', pendingPath: null });
      path = await NativeEngine.createPhotoPath();
      if (!readyRef.current || request !== visibilityGeneration.current)
        throw new Error('Camera interrupted. Try again.');
      const photo = await photoOutput.capturePhoto(
        { flashMode: device?.hasFlash ? flash : 'off' },
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
    advanceRevision();
    updateReady(false);
    modeRef.current = value;
    setMode(value);
    setError('');
  };
  const applySettings = async (action: SettingsAction) => {
    if (action.revision !== revision.current)
      throw new Error('Camera settings changed. Please try again with the updated options.');
    switch (action.key) {
      case 'focus': {
        const controller = cameraRef.current?.controller;
        if (!controller) throw new Error('Camera is not ready.');
        const point = unrotatePoint(action.value, NativeEngine.getPreviewRotation());
        await controller.focusTo(VisionCamera.createNormalizedMeteringPoint(point.x, point.y), {
          adaptiveness: 'continuous',
          responsiveness: modeRef.current === 'photo' ? 'snappy' : 'steady',
        });
        return;
      }
      case 'exposure': {
        const controller = cameraRef.current?.controller;
        if (
          !controller ||
          !device?.supportsExposureBias ||
          exposureStep <= 0 ||
          !Number.isFinite(action.value) ||
          action.value < device.minExposureBias * exposureStep ||
          action.value > device.maxExposureBias * exposureStep
        )
          throw new Error('This brightness is unavailable on the camera phone.');
        await controller.setExposureBias(Math.round(action.value / exposureStep));
        setExposureValue(controller.exposureBias);
        advanceRevision();
        return;
      }
      case 'timerLight':
        if (modeRef.current !== 'photo' || !device?.hasTorch)
          throw new Error('Timer light is unavailable on this camera.');
        setTimerLight(action.value);
        advanceRevision();
        return;
      case 'timer':
        if (modeRef.current !== 'photo' || ![0, 3, 10].includes(action.value))
          throw new Error('Invalid photo timer.');
        setTimer(action.value);
        advanceRevision();
        return;
      case 'flash':
        if (
          modeRef.current !== 'photo' ||
          !device?.hasFlash ||
          !['off', 'auto', 'on'].includes(action.value)
        )
          throw new Error('Flash is unavailable on this camera.');
        setFlash(action.value);
        advanceRevision();
        return;
      case 'profile': {
        const profile = profiles.find((p) => profileId(p) === action.value);
        if (modeRef.current === 'photo' || !profile)
          throw new Error('This video quality is unavailable on the camera phone.');
        if (selectedProfile && profileId(selectedProfile) === action.value) return;
        await reconfigure(() => setRequested(profile));
        return;
      }
      case 'position':
        if (action.value === position) return;
        if (!alternate) throw new Error('This camera is unavailable.');
        await reconfigure(() => setPosition(action.value));
        return;
      case 'stabilization':
        if (modeRef.current === 'photo' || !device?.supportsVideoStabilizationMode('standard'))
          throw new Error('Stabilization is unavailable with these settings.');
        if (action.value === stabilization) return;
        await reconfigure(() => setStabilization(action.value));
        return;
      case 'audio':
        if (modeRef.current === 'photo') throw new Error('Switch to Video to change audio.');
        if (action.value === audio) return;
        if (action.value && !(await VisionCamera.requestMicrophonePermission()))
          throw new Error('Allow microphone access in Settings on the camera phone.');
        if (!readyRef.current || !visibleRef.current)
          throw new Error('Camera interrupted. Try again.');
        await reconfigure(() => setAudio(action.value));
        return;
      case 'grid':
        if (action.value === grid) return;
        advanceRevision();
        setGrid(action.value);
        return;
      case 'zoom':
        if (
          !device ||
          action.value < device.minZoom ||
          action.value > device.maxZoom ||
          !cameraRef.current
        )
          throw new Error('This zoom is unavailable on the camera phone.');
        await cameraRef.current.startZoomAnimation(action.value, 4);
        advanceRevision();
        setZoomValue(action.value);
    }
  };
  const retrySave = async () => {
    if (modeRef.current !== 'photo') {
      if (recorder.getSnapshot().phase !== 'pending')
        throw new Error('There is no video waiting to be saved.');
      await recorder.retrySave();
      return;
    }
    if (!photoState.pendingPath || photoBusy.current)
      throw new Error('There is no photo waiting to be saved.');
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
      setPhotoState((state) => ({
        ...state,
        phase: 'pending',
        message: error instanceof Error ? error.message : 'Could not add to gallery.',
      }));
      throw error;
    } finally {
      photoBusy.current = false;
    }
  };
  const perform = async (action: CaptureAction) => {
    if (action === 'cancel-timer') {
      if (!photoTimer.cancel()) throw new Error('The photo timer has already finished.');
      return;
    }
    if (action === 'stop') {
      await stop();
      return;
    }
    if (action === 'retry-save') {
      await retrySave();
      return;
    }
    if (
      typeof action === 'object' &&
      ['zoom', 'grid', 'exposure', 'focus'].includes(action.key) &&
      readyRef.current &&
      recorder.getSnapshot().phase === 'recording'
    ) {
      await applySettings(action);
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
    if (typeof action === 'object') {
      await applySettings(action);
      return;
    }
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
    const next = action.replace('mode-', '') as CaptureMode;
    if (!['photo', 'video'].includes(next))
      throw new Error('This mode is unavailable on the camera phone.');
    if (next !== modeRef.current) await reconfigure(() => selectMode(next));
  };

  const flip = () => {
    if (busy || !alternate) return;
    updateReady(false);
    setError('');
    setQuality('');
    advanceRevision();
    setPosition((value) => (value === 'back' ? 'front' : 'back'));
  };

  const selectedFPS = useRef<number | undefined>(undefined);
  const selectedHDR = useRef(false);
  const configured = useCallback(() => {
    setExposureValue(cameraRef.current?.controller?.exposureBias ?? 0);
    const resolution = activeOutput.currentResolution;
    setQuality(
      resolution && mode === 'photo'
        ? `${Math.round((resolution.width * resolution.height) / 1_000_000)} MP`
        : resolution
          ? `${recordingResolutionLabel(Math.min(resolution.width, resolution.height))}${selectedFPS.current ? ` · ${selectedFPS.current} fps` : ''}${selectedHDR.current ? ' · HDR' : ''}`
          : 'Automatic quality',
    );
    const running = runningRef.current && visibleRef.current && AppState.currentState === 'active';
    advanceRevision();
    updateReady(running);
    if (running) finishConfiguration();
  }, [activeOutput, mode, updateReady, finishConfiguration, advanceRevision]);

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
    settings: {
      controls: {
        ...(device?.hasTorch ? { timerLight } : {}),
        exposure:
          exposureStep *
          Math.min(device?.maxExposureBias ?? 0, Math.max(device?.minExposureBias ?? 0, exposure)),
        minExposure: device?.supportsExposureBias ? device.minExposureBias * exposureStep : 0,
        maxExposure: device?.supportsExposureBias ? device.maxExposureBias * exposureStep : 0,
        timer,
        flash: device?.hasFlash ? flash : 'off',
        hasFlash: !!device?.hasFlash,
      },
      revision: settingsRevision,
      profiles: profiles.map((profile) => ({ ...profile, id: profileId(profile) })),
      profile: mode !== 'photo' && selectedProfile ? profileId(selectedProfile) : null,
      audio,
      grid,
      position,
      canFlip: !!alternate,
      zoom: Math.min(device?.maxZoom ?? 1, Math.max(device?.minZoom ?? 1, zoom)),
      minZoom: device?.minZoom ?? 1,
      maxZoom: device?.maxZoom ?? 1,
      zoomStops: device
        ? Array.from(new Set([device.minZoom, 1, 2, ...device.zoomLensSwitchFactors]))
            .filter((value) => value >= device.minZoom && value <= device.maxZoom)
            .sort((a, b) => a - b)
        : [],
      stabilization,
      canStabilize: mode !== 'photo' && !!device?.supportsVideoStabilizationMode('standard'),
    },
  };

  const snapshotRef = useRef(captureState);
  const acknowledgements = useRef(new Set<() => void>());
  useLayoutEffect(() => {
    snapshotRef.current = captureState;
    acknowledgements.current.forEach((notify) => notify());
  });
  const performConfirmed = async (action: CaptureAction) => {
    await perform(action);
    if (typeof action !== 'object' && !action.startsWith('mode-')) return;
    const targetRevision = revision.current;
    return new Promise<CaptureState>((resolve, reject) => {
      const done = () => {
        const state = snapshotRef.current;
        if (
          !state.ready ||
          (state.settings?.revision ?? -1) < targetRevision ||
          state.mode !== modeRef.current
        )
          return;
        clearTimeout(timer);
        acknowledgements.current.delete(done);
        resolve(state);
      };
      const timer = setTimeout(() => {
        acknowledgements.current.delete(done);
        reject(new Error('The camera has not confirmed its new settings. Please try again.'));
      }, 5000);
      acknowledgements.current.add(done);
      done();
    });
  };

  return {
    mode,
    grid,
    setGrid: (value: boolean) => {
      advanceRevision();
      setGrid(value);
    },
    stabilization,
    setStabilization: (value: boolean) => {
      if (!busy && ready) {
        advanceRevision();
        updateReady(false);
        setStabilization(value);
      }
    },
    selectMode,
    cancelTimer: () => photoTimer.cancel(),
    setExposure: (value: number) =>
      perform({ type: 'settings', revision: revision.current, key: 'exposure', value }),
    setTimer: (value: 0 | 3 | 10) =>
      perform({ type: 'settings', revision: revision.current, key: 'timer', value }),
    setFlash: (value: 'auto' | 'off' | 'on') =>
      perform({ type: 'settings', revision: revision.current, key: 'flash', value }),
    takePhoto,
    perform: performConfirmed,
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
      advanceRevision();
      setRequested(profile);
      setError('');
    },
    focus: async (point: Point) => {
      if (!readyRef.current || !cameraRef.current) throw new Error('Camera is not ready.');
      await cameraRef.current.focusTo(point, {
        adaptiveness: 'continuous',
        responsiveness: modeRef.current === 'photo' ? 'snappy' : 'steady',
      });
    },
    bindCamera,
    zoomStops: device
      ? Array.from(new Set([device.minZoom, 1, 2, ...device.zoomLensSwitchFactors]))
          .filter((value) => value >= device.minZoom && value <= device.maxZoom)
          .sort((a, b) => a - b)
      : [],
    setZoom: async (zoom: number) => {
      await cameraRef.current?.startZoomAnimation(zoom, 4);
      advanceRevision();
      setZoomValue(zoom);
    },
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
    retrySave,
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
