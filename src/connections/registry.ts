import {
  isIdentity,
  MAX_DEVICES,
  parseSavedDevice,
  validName,
  type DeviceIdentity,
  type SavedDevice,
} from './model';
import { validId } from '../signaling/protocol';

export interface DeviceStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class DeviceRegistry {
  private devices: readonly SavedDevice[] = [];
  private identity: DeviceIdentity | null = null;
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private loading: Promise<void> | null = null;
  constructor(
    private storage: DeviceStorage,
    private random: (bytes: number) => Promise<string>,
    private deviceName: string,
  ) {}
  getSnapshot = () => this.devices;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(devices: readonly SavedDevice[]) {
    this.devices = [...devices].sort((a, b) => b.lastConnectedAt - a.lastConnectedAt);
    this.listeners.forEach((listener) => listener());
  }
  private serialize<T>(action: () => Promise<T>): Promise<T> {
    const task = this.queue.then(action);
    this.queue = task.catch(() => {});
    return task;
  }
  load(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = this.serialize(async () => {
      const rawIdentity = await this.storage.get('relais.identity');
      if (rawIdentity) {
        const value: unknown = JSON.parse(rawIdentity);
        if (!isIdentity(value)) throw new Error('Could not read this phone’s identity.');
        this.identity = value;
      } else {
        const id = await this.random(16);
        this.identity = { id, name: `${this.deviceName.slice(0, 48)} · ${id.slice(-4)}` };
        await this.storage.set('relais.identity', JSON.stringify(this.identity));
      }
      const rawIndex = await this.storage.get('relais.devices');
      const ids: unknown = rawIndex ? JSON.parse(rawIndex) : [];
      if (!Array.isArray(ids) || ids.length > MAX_DEVICES || !ids.every(validId))
        throw new Error('Could not read the device list.');
      const devices = await Promise.all(
        [...new Set(ids)].map(async (id) => {
          const raw = await this.storage.get(`relais.device.${id}`);
          if (!raw) throw new Error('A saved device entry is incomplete.');
          const device = parseSavedDevice(JSON.parse(raw));
          if (device.id !== id) throw new Error('A saved device entry is invalid.');
          return device;
        }),
      );
      this.publish(devices);
    }).catch((error: unknown) => {
      this.loading = null;
      throw error;
    });
    return this.loading;
  }
  async getIdentity() {
    await this.load();
    return this.identity!;
  }
  async credentials() {
    return { pairId: await this.random(16), secret: await this.random(24) };
  }
  async remember(input: SavedDevice) {
    await this.load();
    return this.serialize(async () => {
      const device = parseSavedDevice(input);
      if (device.id === this.identity?.id) throw new Error('This is already your own phone.');
      const previous = this.devices.find((item) => item.id === device.id);
      if (!previous && this.devices.length >= MAX_DEVICES)
        throw new Error('Forget a device before adding another one.');
      // Preserve the name chosen locally across reconnects.
      const next = { ...device, name: previous?.name ?? device.name };
      const devices = [...this.devices.filter((item) => item.id !== next.id), next];
      await this.storage.set(`relais.device.${next.id}`, JSON.stringify(next));
      await this.storage.set('relais.devices', JSON.stringify(devices.map((item) => item.id)));
      this.publish(devices);
      return next;
    });
  }
  async rename(id: string, name: string) {
    if (!validName(name.trim())) throw new Error('Choose a name between 1 and 60 characters.');
    await this.load();
    return this.serialize(async () => {
      const previous = this.devices.find((item) => item.id === id);
      if (!previous) return;
      const next = { ...previous, name: name.trim() };
      await this.storage.set(`relais.device.${id}`, JSON.stringify(next));
      this.publish(this.devices.map((item) => (item.id === id ? next : item)));
    });
  }
  async forget(id: string) {
    await this.load();
    return this.serialize(async () => {
      const devices = this.devices.filter((item) => item.id !== id);
      await this.storage.set('relais.devices', JSON.stringify(devices.map((item) => item.id)));
      this.publish(devices);
      await this.storage.remove(`relais.device.${id}`);
    });
  }
}
