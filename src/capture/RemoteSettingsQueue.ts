import { previewPreset, supportsSetting, type PresetSetting } from './presets';
import type { CaptureAction, CaptureMode, CaptureState } from './protocol';
import { changesCatalog, isLiveSetting } from './settingPolicy';

type Change = PresetSetting | { key: 'mode'; value: CaptureMode };
type Waiter = { resolve: (state: CaptureState) => void; reject: (error: Error) => void };
type Entry = { change: Change; waiters: Waiter[] };
interface Snapshot {
  pending: boolean;
  base: CaptureState | null;
  changes: readonly Change[];
}
const empty: Snapshot = { pending: false, base: null, changes: [] };
const barrier = (change: Change) => change.key === 'mode' || changesCatalog(change.key);

export function settingsChange(action: CaptureAction): Change | null {
  if (typeof action === 'object')
    return action.key === 'focus'
      ? null
      : ({ key: action.key, value: action.value } as PresetSetting);
  if (action === 'mode-photo') return { key: 'mode', value: 'photo' };
  if (action === 'mode-video') return { key: 'mode', value: 'video' };
  if (action === 'mode-cinematic') return { key: 'mode', value: 'cinematic' };
  return null;
}

// This projection is for settings controls only. Capture and gallery state stay authoritative.
export function previewSettings(state: CaptureState | null, snapshot: Snapshot) {
  if (!state || !snapshot.base || !snapshot.pending) return state;
  let preview = snapshot.base;
  for (const change of snapshot.changes)
    preview = previewPreset(
      preview,
      change.key === 'mode' ? { mode: change.value, settings: [] } : { settings: [change] },
    );
  return {
    ...state,
    mode: preview.mode,
    ...(preview.settings ? { settings: preview.settings } : {}),
  };
}

export class RemoteSettingsQueue {
  private entries: Entry[] = [];
  private running: Entry | null = null;
  private generation = 0;
  private snapshot = empty;
  private listeners = new Set<() => void>();
  constructor(
    private getState: () => CaptureState | null = () => null,
    private send: (action: CaptureAction) => Promise<CaptureState | null> = async () => {
      throw new Error('Connect to your camera first.');
    },
  ) {}
  configure(getState: typeof this.getState, send: typeof this.send) {
    this.getState = getState;
    this.send = send;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(base = this.snapshot.base) {
    const changes = [
      ...(this.running ? [this.running.change] : []),
      ...this.entries.map((entry) => entry.change),
    ];
    this.snapshot = changes.length ? { pending: true, base, changes } : empty;
    this.listeners.forEach((listener) => listener());
  }
  reset(error = new Error('Camera disconnected. Pending changes were cancelled.')) {
    this.generation += 1;
    for (const entry of [...(this.running ? [this.running] : []), ...this.entries])
      entry.waiters.forEach((waiter) => waiter.reject(error));
    this.running = null;
    this.entries = [];
    this.publish();
  }
  enqueue(change: Change): Promise<CaptureState> {
    return new Promise((resolve, reject) => {
      // Never merge across a change that invalidates the native capability catalogue.
      let replacement: Entry | undefined;
      for (let index = this.entries.length - 1; index >= 0; index -= 1) {
        const entry = this.entries[index]!;
        if (barrier(entry.change) || barrier(change)) break;
        if (entry.change.key === change.key) {
          replacement = entry;
          break;
        }
      }
      if (replacement) {
        replacement.change = change;
        replacement.waiters.push({ resolve, reject });
      } else {
        if (this.entries.length >= 16) {
          reject(new Error('The camera is catching up. Please wait a moment.'));
          return;
        }
        this.entries.push({ change, waiters: [{ resolve, reject }] });
      }
      this.publish(this.snapshot.base ?? this.getState());
      void this.drain();
    });
  }
  private async drain() {
    if (this.running || !this.entries.length) return;
    const epoch = this.generation;
    const entry = this.entries.shift()!;
    this.running = entry;
    const state = this.getState();
    this.publish(state);
    try {
      const change = entry.change;
      const framing = change.key !== 'mode' && isLiveSetting(change.key);
      if (
        !state?.ready ||
        !state.settings ||
        !(state.canCapture || (framing && state.phase === 'recording'))
      )
        throw new Error('Wait for the camera to be ready.');
      if (
        change.key === 'mode'
          ? !state.modes.includes(change.value)
          : !supportsSetting(state, change)
      )
        throw new Error(
          'This setting is no longer available. The camera options have been updated.',
        );
      const action: CaptureAction =
        change.key === 'mode'
          ? `mode-${change.value}`
          : { ...change, type: 'settings', revision: state.settings.revision };
      const confirmed = await this.send(action);
      if (epoch !== this.generation) return;
      if (!confirmed?.ready || !confirmed.settings)
        throw new Error('The camera has not confirmed its settings. Please reconnect.');
      this.running = null;
      this.publish(confirmed);
      entry.waiters.forEach((waiter) => waiter.resolve(confirmed));
      void this.drain();
    } catch (error) {
      if (epoch === this.generation)
        this.reset(error instanceof Error ? error : new Error('Could not apply camera settings.'));
    }
  }
}
