import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { deviceRegistry } from './storage';
import { findDevice } from './presence';
import type { DeviceAvailability, SavedDevice } from './model';
import type { PairingDescriptor } from '../signaling/protocol';

export interface DeviceRow {
  device: SavedDevice;
  availability: DeviceAvailability;
  descriptor: PairingDescriptor | null;
}
export function useDevices(server: string, visible: boolean) {
  const devices = useSyncExternalStore(deviceRegistry.subscribe, deviceRegistry.getSnapshot);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<{
    rows: Record<string, DeviceRow>;
    devices: readonly SavedDevice[];
    server: string;
    revision: number;
  } | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    void deviceRegistry
      .load()
      .catch((failure: unknown) =>
        setError(failure instanceof Error ? failure.message : 'Devices unavailable.'),
      );
    const subscription = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, [revision]);
  useEffect(() => {
    if (!visible || !foreground || !devices.length) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scan = async () => {
      const next = await Promise.all(
        devices.map(async (device): Promise<DeviceRow> => {
          try {
            const descriptor = await findDevice(device, server || device.server, abort.signal);
            return { device, descriptor, availability: descriptor ? 'available' : 'offline' };
          } catch {
            return { device, descriptor: null, availability: 'unreachable' };
          }
        }),
      );
      if (abort.signal.aborted) return;
      setSnapshot({
        rows: Object.fromEntries(next.map((row) => [row.device.id, row])),
        devices,
        server,
        revision,
      });
      timer = setTimeout(() => {
        void scan();
      }, 4000);
    };
    void scan();
    return () => {
      abort.abort();
      if (timer) clearTimeout(timer);
    };
  }, [devices, server, visible, foreground, revision]);
  const refresh = useCallback(() => {
    setError('');
    setRevision((value) => value + 1);
  }, []);
  const rows =
    visible &&
    foreground &&
    snapshot?.devices === devices &&
    snapshot.server === server &&
    snapshot.revision === revision
      ? snapshot.rows
      : {};
  return {
    rows: devices.map(
      (device) =>
        rows[device.id] ?? { device, availability: 'checking' as const, descriptor: null },
    ),
    error,
    refresh,
  };
}
