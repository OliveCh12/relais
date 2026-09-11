import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RemoteSettingsQueue,
  previewSettings,
  settingsChange,
} from '../src/capture/RemoteSettingsQueue';
import { emptyCaptureState, type CaptureAction, type CaptureState } from '../src/capture/protocol';
import { previewPreset } from '../src/capture/presets';

const initial: CaptureState = {
  ...emptyCaptureState,
  mode: 'video',
  ready: true,
  canCapture: true,
  settings: {
    revision: 1,
    profiles: [{ id: '2160-60-false', height: 2160, fps: 60, hdr: false }],
    profile: '2160-60-false',
    audio: true,
    grid: false,
    position: 'back',
    canFlip: true,
    zoom: 1,
    minZoom: 1,
    maxZoom: 10,
    zoomStops: [1, 2],
    stabilization: true,
    canStabilize: true,
    controls: {
      exposure: 0,
      minExposure: -2,
      maxExposure: 2,
      timer: 0,
      flash: 'off',
      hasFlash: true,
    },
  },
};
function harness() {
  let state = structuredClone(initial);
  const requests: {
    action: CaptureAction;
    resolve: (state: CaptureState | null) => void;
    reject: (error: Error) => void;
  }[] = [];
  const queue = new RemoteSettingsQueue(
    () => state,
    (action) => new Promise((resolve, reject) => requests.push({ action, resolve, reject })),
  );
  return {
    queue,
    requests,
    state: () => state,
    setState: (next: CaptureState) => {
      state = next;
    },
    async confirm(index: number, override?: CaptureState) {
      const request = requests[index]!;
      const change = settingsChange(request.action)!;
      state =
        override ??
        previewPreset(
          state,
          change.key === 'mode' ? { mode: change.value, settings: [] } : { settings: [change] },
        );
      state = {
        ...state,
        ready: true,
        settings: { ...state.settings!, revision: state.settings!.revision + 1 },
      };
      request.resolve(state);
      await Promise.resolve();
    },
  };
}
test('settings display immediately while capture and completion remain authoritative', async () => {
  const h = harness();
  let completed = false;
  const result = h.queue.enqueue({ key: 'grid', value: true }).then(() => {
    completed = true;
  });
  const preview = previewSettings(h.state(), h.queue.getSnapshot())!;
  assert.equal(preview.settings?.grid, true);
  assert.equal(h.state().settings?.grid, false);
  assert.equal(preview.phase, h.state().phase);
  assert.equal(completed, false);
  assert.equal(h.queue.getSnapshot().pending, true);
  await h.confirm(0);
  await result;
  assert.equal(h.queue.getSnapshot().pending, false);
  assert.equal(previewSettings(h.state(), h.queue.getSnapshot()), h.state());
});
test('rapid edits coalesce and dispatch with the latest native revision', async () => {
  const h = harness();
  const results = Array.from({ length: 20 }, (_, i) =>
    h.queue.enqueue({ key: 'zoom', value: 1 + (i + 1) / 10 }),
  );
  results.push(h.queue.enqueue({ key: 'grid', value: true }));
  assert.equal(h.requests.length, 1);
  assert.equal(previewSettings(h.state(), h.queue.getSnapshot())?.settings?.zoom, 3);
  await h.confirm(0);
  assert.deepEqual(h.requests[1]?.action, { type: 'settings', key: 'zoom', value: 3, revision: 2 });
  await h.confirm(1);
  assert.deepEqual(h.requests[2]?.action, {
    type: 'settings',
    key: 'grid',
    value: true,
    revision: 3,
  });
  await h.confirm(2);
  await Promise.all(results);
  assert.equal(h.requests.length, 3);
});
test('native failure rolls back pending choices and cancels dependent edits', async () => {
  const h = harness();
  const first = h.queue.enqueue({ key: 'audio', value: false });
  const second = h.queue.enqueue({ key: 'grid', value: true });
  const failed = Promise.allSettled([first, second]);
  h.requests[0]!.reject(new Error('Microphone unavailable'));
  const outcomes = await failed;
  assert.ok(outcomes.every((result) => result.status === 'rejected'));
  assert.equal(h.requests.length, 1);
  assert.equal(h.queue.getSnapshot().pending, false);
  assert.equal(previewSettings(h.state(), h.queue.getSnapshot())?.settings?.audio, true);
});
test('disconnect cancels edits and a late reply cannot clear a new connection queue', async () => {
  const h = harness();
  const old = h.queue.enqueue({ key: 'grid', value: true });
  const rejected = assert.rejects(old, /disconnected/);
  h.queue.reset();
  await rejected;
  const fresh = h.queue.enqueue({ key: 'zoom', value: 2 });
  h.requests[0]!.resolve(initial);
  await Promise.resolve();
  assert.equal(h.queue.getSnapshot().pending, true);
  assert.equal(previewSettings(h.state(), h.queue.getSnapshot())?.settings?.zoom, 2);
  await h.confirm(1);
  await fresh;
});
test('a lens change invalidates the preview catalogue and revalidates queued formats', async () => {
  const h = harness();
  const lens = h.queue.enqueue({ key: 'position', value: 'front' });
  assert.equal(previewSettings(h.state(), h.queue.getSnapshot())?.settings?.profile, null);
  assert.deepEqual(previewSettings(h.state(), h.queue.getSnapshot())?.settings?.profiles, []);
  const format = h.queue.enqueue({ key: 'profile', value: '2160-60-false' });
  const rejected = assert.rejects(format, /no longer available/);
  await h.confirm(0, {
    ...initial,
    settings: { ...initial.settings!, position: 'front', profile: null, profiles: [] },
  });
  await Promise.all([lens, rejected]);
  assert.equal(h.requests.length, 1);
});
test('edits on either side of a mode change never coalesce together', async () => {
  const h = harness();
  const results = [
    h.queue.enqueue({ key: 'grid', value: true }),
    h.queue.enqueue({ key: 'zoom', value: 2 }),
    h.queue.enqueue({ key: 'mode', value: 'photo' }),
    h.queue.enqueue({ key: 'zoom', value: 3 }),
  ];
  for (let i = 0; i < 4; i += 1) await h.confirm(i);
  await Promise.all(results);
  assert.equal(h.requests.length, 4);
  assert.equal(h.requests[2]?.action, 'mode-photo');
});
test('configuration transitions retain the pending controls without claiming capture readiness', async () => {
  const h = harness();
  const result = h.queue.enqueue({ key: 'profile', value: '2160-60-false' });
  h.setState({
    ...initial,
    ready: false,
    canCapture: false,
    settings: { ...initial.settings!, profiles: [], profile: null },
  });
  const view = previewSettings(h.state(), h.queue.getSnapshot())!;
  assert.equal(view.settings?.profile, '2160-60-false');
  assert.equal(view.ready, false);
  assert.equal(view.canCapture, false);
  await h.confirm(0, initial);
  await result;
});
test('only framing settings are allowed during recording; shutter actions never project', async () => {
  for (const action of ['photo', 'start', 'stop', 'cancel-timer', 'retry-save'] as const)
    assert.equal(settingsChange(action), null);
  assert.equal(
    settingsChange({ type: 'settings', key: 'focus', value: { x: 0.5, y: 0.5 }, revision: 1 }),
    null,
  );
  const h = harness();
  h.setState({ ...initial, canCapture: false, phase: 'recording' });
  await assert.rejects(h.queue.enqueue({ key: 'audio', value: false }), /ready/);
  assert.equal(h.requests.length, 0);
  const grid = h.queue.enqueue({ key: 'grid', value: true });
  await h.confirm(0);
  await grid;
});
test('missing authoritative acknowledgement never confirms optimistic settings', async () => {
  const h = harness();
  const result = h.queue.enqueue({ key: 'grid', value: true });
  const rejected = assert.rejects(result, /not confirmed/);
  h.requests[0]!.resolve(null);
  await rejected;
  assert.equal(h.queue.getSnapshot().pending, false);
});
