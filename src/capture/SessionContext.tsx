import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
    pending.current = { descriptor, expected };
    router.dismissTo('/monitor');
  }, []);
  useEffect(() => {
    if (!pending.current || pathname !== '/monitor') return;
    const next = pending.current;
    pending.current = null;
    void start(next.descriptor, next.expected);
  }, [pathname, start]);
  return (
    <SessionContext.Provider value={{ role, connection, updateCamera, fill, setFill, connectTo }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useCaptureSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Open a Camera or Monitor session first.');
  return session;
}
