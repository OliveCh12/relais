import { Alert } from 'react-native';
import { deviceRegistry } from '@/connections/storage';
import { supportsSetting, type CameraPreset } from './presets';
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
  const presetRequest = useRef<{ id: string; preset: CameraPreset } | null>(null);
  const [fill, setFill] = useState(false);
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
    if (
      role !== 'monitor' ||
      !request ||
      !connection.connected ||
      connection.device?.id !== request.id ||
      !connection.remote?.canCapture
    )
      return;
    presetRequest.current = null;
    setApplyingPreset(true);
    const command = connection.command;
    const epoch = connection.getEpoch();
    const getState = () => {
      const current = currentConnection.current;
      if (current.getEpoch() !== epoch || !current.connected || current.device?.id !== request.id)
        throw new Error('Camera disconnected. Your preset is kept for the next connection.');
      const state = current.getRemote();
      if (!state?.ready || !state.settings) throw new Error('Wait for the camera to be ready.');
      return state;
    };
    void (async () => {
      let state = getState();
      if (request.preset.mode && request.preset.mode !== state.mode) {
        if (!state.modes.includes(request.preset.mode))
          throw new Error(
            'This capture mode is unavailable on the camera. Your preset has been kept.',
          );
        await command(`mode-${request.preset.mode}`);
      }
      // Lens and format can change the available controls, so re-read each acknowledgement.
      const order = [
        'position',
        'profile',
        'stabilization',
        'audio',
        'grid',
        'zoom',
        'exposure',
        'timer',
        'flash',
        'timerLight',
      ];
      const settings = [...request.preset.settings].sort(
        (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
      );
      for (const setting of settings) {
        state = getState();
        if (!supportsSetting(state, setting))
          throw new Error(
            `The saved ${setting.key} setting is unavailable with this camera configuration. Review the device settings. Your preset has been kept.`,
          );
        await command({ ...setting, type: 'settings', revision: state.settings!.revision });
      }
      await deviceRegistry.savePreset(request.id, (preset) =>
        JSON.stringify(preset) === JSON.stringify(request.preset) ? undefined : preset,
      );
    })()
      .catch((error: unknown) =>
        Alert.alert(
          'Camera preset',
          error instanceof Error ? error.message : 'Could not apply the preset.',
        ),
      )
      .finally(() => setApplyingPreset(false));
  }, [role, connection]);
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
