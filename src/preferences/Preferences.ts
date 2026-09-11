import type { DeviceStorage } from '../connections/registry';
import { privateLanOrigin } from '../signaling/protocol';

export type PreferredQuality = 'best' | 'balanced' | 'camera';
export interface Preferences {
  quality: PreferredQuality;
  server: string;
  fillPreview: boolean;
}
export const qualityOptions = [
  {
    value: 'best' as const,
    label: 'Best available',
    subtitle: 'Aim for 4K at 60 fps, with the best compatible fallback.',
  },
  {
    value: 'balanced' as const,
    label: 'Balanced',
    subtitle: 'Aim for 1080p at 30 fps for smaller original videos.',
  },
  {
    value: 'camera' as const,
    label: 'Keep camera settings',
    subtitle: 'Use the quality already selected on the camera phone.',
  },
];
export class PreferenceStore {
  private snapshot: { value: Preferences; loaded: boolean; error: string } = {
    value: { quality: 'best', server: '', fillPreview: false },
    loaded: false,
    error: '',
  };
  private listeners = new Set<() => void>();
  private loading: Promise<void> | undefined;
  private queue: Promise<void> = Promise.resolve();
  constructor(private storage: DeviceStorage) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<typeof this.snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  load(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const raw = await this.storage.get('relais.preferences');
      const value: unknown = raw ? JSON.parse(raw) : this.snapshot.value;
      if (!value || typeof value !== 'object') throw new Error('Could not read app settings.');
      const saved = value as Preferences;
      if (
        !qualityOptions.some((option) => option.value === saved.quality) ||
        typeof saved.server !== 'string' ||
        (saved.fillPreview !== undefined && typeof saved.fillPreview !== 'boolean')
      )
        throw new Error('Could not read app settings.');
      this.publish({
        value: {
          quality: saved.quality,
          fillPreview: saved.fillPreview ?? false,
          server: saved.server ? privateLanOrigin(saved.server) : '',
        },
        loaded: true,
        error: '',
      });
    })().catch((error: unknown) => {
      this.loading = undefined;
      this.publish({
        error: error instanceof Error ? error.message : 'Could not read app settings.',
      });
      throw error;
    });
    return this.loading;
  }
  async update(patch: Partial<Preferences>) {
    await this.load();
    const write = this.queue.then(async () => {
      const next = { ...this.snapshot.value, ...patch };
      if (!qualityOptions.some((option) => option.value === next.quality))
        throw new Error('Choose an available quality preference.');
      if (typeof next.fillPreview !== 'boolean')
        throw new Error('Choose an available preview setting.');
      next.server = next.server.trim() ? privateLanOrigin(next.server) : '';
      await this.storage.set('relais.preferences', JSON.stringify(next));
      this.publish({ value: next, error: '' });
    });
    this.queue = write.catch(() => {});
    return write;
  }
}
