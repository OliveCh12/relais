import { CommandSupersededError } from './RemoteCommandClient';
import { appPreferences, usePreferences } from '@/preferences/usePreferences';
import { preferredProfile } from '@/preferences/quality';
import { Alert } from 'react-native';
import { deviceRegistry } from '@/connections/storage';
import { type CameraPreset } from './presets';
import { applyCameraPreset } from './applyPreset';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { router, usePathname } from 'expo-router';
import { useConnection } from './useConnection';
import { emptyCaptureState, type CaptureAction, type CaptureState } from './protocol';
import type { PairingDescriptor } from '@/signaling/protocol';
import type { SavedDevice } from '@/connections/model';

type CameraControl = (action: CaptureAction) => Promise<unknown>;
const SessionContext = createContext<{
  role: 'camera' | 'monitor';
  connection: ReturnType<typeof useConnection>;
  updateCamera: (state: CaptureState, perform: CameraControl) => void;
  applyingPreset: boolean;
  fill: boolean;
  setFill: (value: boolean) => void;
  connectTo: (descriptor: PairingDescriptor, expected?: SavedDevice) => void;
} | null>(null);

export function SessionProvider({
  role,
  children,
}: {
  role: 'camera' | 'monitor';
  children: ReactNode;
}) {
  const [state, setState] = useState(emptyCaptureState);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const applying = useRef(false);
  const appliedQuality = useRef(new Set<string>());
  const preferences = usePreferences();
  const presetRequest = useRef<{ id: string; preset: CameraPreset } | null>(null);
  const fill = preferences.value.fillPreview;
  const setFill = useCallback((fillPreview: boolean) => {
    void appPreferences
      .update({ fillPreview })
      .catch((error: unknown) =>
        Alert.alert(
          'Preview settings',
          error instanceof Error ? error.message : 'Could not save this setting.',
        ),
      );
  }, []);
  const pathname = usePathname();
  const pending = useRef<{
    descriptor: PairingDescriptor;
    expected: SavedDevice | undefined;
  } | null>(null);
  const performRef = useRef<CameraControl>(async () => {
    throw new Error('Camera is not ready.');
  });
  const perform = useCallback<CameraControl>((action) => performRef.current(action), []);
  const updateCamera = useCallback((next: CaptureState, control: CameraControl) => {
    performRef.current = control;
    setState((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
  }, []);
  const connection = useConnection(role, role === 'camera' ? { state, perform } : undefined);
  const { start } = connection;
  const connectTo = useCallback((descriptor: PairingDescriptor, expected?: SavedDevice) => {
    appliedQuality.current.clear();
    presetRequest.current = expected?.preset ? { id: expected.id, preset: expected.preset } : null;
    pending.current = { descriptor, expected };
    router.dismissTo('/monitor');
  }, []);
  useEffect(() => {
    if (!pending.current || pathname !== '/monitor') return;
    const next = pending.current;
    pending.current = null;
    void start(next.descriptor, next.expected);
  }, [pathname, start]);
  const currentConnection = useRef(connection);
  useLayoutEffect(() => {
    currentConnection.current = connection;
  }, [connection]);
  useEffect(() => {
    const request = presetRequest.current;
    const id = connection.device?.id;
    const remote = connection.remote;
    if (
      role !== 'monitor' ||
      !preferences.loaded ||
      applying.current ||
      connection.sending ||
      !connection.connected ||
      !id ||
      !remote?.canCapture ||
      !remote.settings ||
      (request && request.id !== id)
    )
      return;
    const epoch = connection.getEpoch();
    const qualityKey = (state: CaptureState) =>
      `${epoch}:${id}:${state.mode}:${state.settings?.position}:${preferences.value.quality}`;
    const initialKey = qualityKey(remote);
    if (
      !request &&
      (appliedQuality.current.has(initialKey) ||
        !preferredProfile(remote, preferences.value.quality))
    )
      return;
    presetRequest.current = null;
    applying.current = true;
    setApplyingPreset(true);
    const command = connection.command;
    const getState = () => {
      const current = currentConnection.current;
      if (current.getEpoch() !== epoch || !current.connected || current.device?.id !== id)
        throw new Error(
          'Camera disconnected. Your saved settings are kept for the next connection.',
        );
      const state = current.getRemote();
      if (!state?.ready || !state.settings) throw new Error('Wait for the camera to be ready.');
      return state;
    };
    appliedQuality.current.add(initialKey);
    void (async () => {
      if (request) await applyCameraPreset(request.preset, getState, command);
      const state = getState();
      appliedQuality.current.add(qualityKey(state));
      // An explicit device preset takes priority over the app's starting quality.
      if (!request?.preset.settings.some((setting) => setting.key === 'profile')) {
        const next = preferredProfile(state, preferences.value.quality);
        if (next && next.id !== state.settings!.profile)
          await command({
            type: 'settings',
            key: 'profile',
            value: next.id,
            revision: state.settings!.revision,
          });
      }
      getState();
      if (request)
        await deviceRegistry.savePreset(request.id, (preset) =>
          JSON.stringify(preset) === JSON.stringify(request.preset) ? undefined : preset,
        );
    })()
      .catch((error: unknown) => {
        if (error instanceof CommandSupersededError) return;
        Alert.alert(
          'Camera settings',
          error instanceof Error ? error.message : 'Could not apply camera settings.',
        );
      })
      .finally(() => {
        applying.current = false;
        setApplyingPreset(false);
      });
  }, [role, connection, preferences.loaded, preferences.value.quality]);
  useEffect(() => {
    const id = connection.device?.id;
    const state = connection.remote;
    if (role !== 'monitor' || !connection.connected || !id || !state?.ready || !state.settings)
      return;
    const timer = setTimeout(() => {
      void deviceRegistry.cacheCamera(id, state).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [role, connection.connected, connection.device?.id, connection.remote]);
  return (
    <SessionContext.Provider
      value={{ role, connection, updateCamera, fill, setFill, connectTo, applyingPreset }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useCaptureSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Open a Camera or Monitor session first.');
  return session;
}
