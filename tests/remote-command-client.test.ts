import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RemoteCommandClient, CommandSupersededError } from '../src/capture/RemoteCommandClient';
import { CommandHost } from '../src/capture/CommandHost';
import { emptyCaptureState, type CaptureRequest, type CaptureState } from '../src/capture/protocol';

function harness(phase = 'recording') {
  let state: CaptureState = {
    ...emptyCaptureState,
    mode: 'video',
    ready: true,
    canCapture: false,
    phase,
    settings: {
      revision: 1,
      profiles: [],
      profile: null,
      audio: true,
      grid: false,
      position: 'back',
      canFlip: true,
      zoom: 1,
      minZoom: 1,
      maxZoom: 8,
      zoomStops: [1, 2],
      stabilization: false,
      canStabilize: false,
      controls: {
        exposure: 0,
        minExposure: -2,
        maxExposure: 2,
        timer: 0,
        flash: 'off',
        hasFlash: false,
      },
    },
  };
  const sent: CaptureRequest[] = [];
  const client = new RemoteCommandClient(
    () => state,
    (text) => sent.push(JSON.parse(text) as CaptureRequest),
    (next) => {
      state = next;
    },
  );
  const reply = (index: number, next = state, error?: string) => {
    client.receive({
      type: 'capture-reply',
      id: sent[index]!.id,
      ok: !error,
      ...(error ? { error } : { state: next }),
    });
  };
  return { client, sent, reply, state: () => state };
}
const exposure = { type: 'settings', key: 'exposure', value: 1, revision: 1 } as const;

test('Stop bypasses a native adjustment, cancels queued values and ignores its late reply', async () => {
  const h = harness();
  const first = h.client.command(exposure);
  const queued = h.client.command({ ...exposure, value: 2 });
  const cancelled = [first, queued].map((promise) =>
    assert.rejects(promise, CommandSupersededError),
  );
  const stop = h.client.command('stop');
  assert.deepEqual(
    h.sent.map((request) => request.action),
    [exposure, 'stop'],
  );
  assert.equal(h.client.getSnapshot().priorityPending, true);
  assert.equal(h.client.settings.getSnapshot().pending, false);
  assert.equal(h.client.command('stop'), stop);
  await assert.rejects(h.client.command(exposure), /capture to finish/);
  await Promise.all(cancelled);

  const saved = { ...h.state(), phase: 'saved', canCapture: true };
  h.reply(1, saved);
  assert.deepEqual(await stop, saved);
  h.reply(0, { ...saved, phase: 'recording' });
  await Promise.resolve();
  assert.equal(h.state().phase, 'saved');
  assert.equal(h.client.getSnapshot().sending, false);
  assert.equal(h.sent.length, 2);
});

test('Stop supersedes focus and recording startup without acknowledging an original capture', async () => {
  for (const action of [
    { ...exposure, key: 'focus', value: { x: 0.4, y: 0.7 } } as const,
    'start' as const,
  ]) {
    const h = harness(action === 'start' ? 'starting' : 'recording');
    const before = h.client.command(action);
    const cancelled = assert.rejects(before, CommandSupersededError);
    const stop = h.client.command('stop');
    await cancelled;
    h.reply(0);
    assert.equal(h.client.getSnapshot().priorityPending, true);
    h.reply(1, { ...h.state(), phase: 'saved' });
    assert.equal((await stop)?.phase, 'saved');
  }
});

test('cancel timer supersedes the photo request and waits for camera confirmation', async () => {
  const h = harness('countdown');
  const photo = h.client.command('photo');
  const cancelled = assert.rejects(photo, CommandSupersededError);
  const cancel = h.client.command('cancel-timer');
  assert.equal(h.client.getSnapshot().priorityPending, true);
  h.reply(0);
  assert.equal(h.client.getSnapshot().priorityPending, true);
  h.reply(1, { ...h.state(), phase: 'idle' });
  assert.equal((await cancel)?.phase, 'idle');
  await cancelled;
});

test('Stop does not cancel settings when there is no recording, or turn a disconnect into Stop', async () => {
  const h = harness('idle');
  const ordinary = h.client.command({ ...exposure, key: 'focus', value: { x: 0.5, y: 0.5 } });
  await assert.rejects(h.client.command('stop'), /no active capture/);
  assert.equal(h.sent.length, 1);
  const disconnected = assert.rejects(ordinary, /Connection closed/);
  h.client.reset();
  await disconnected;
  h.reply(0);
  assert.equal(h.client.getSnapshot().sending, false);
  assert.equal(h.sent.length, 1);
  const newCommand = h.client.command('photo');
  assert.notEqual(h.sent[0]!.id, h.sent[1]!.id);
  h.reply(0);
  assert.equal(h.client.getSnapshot().sending, true);
  h.reply(1);
  await newCommand;
});

test('the paired command host forwards Stop before an adjustment finishes and preserves save failure', async () => {
  const h = harness();
  let finishAdjustment!: (state: CaptureState) => void;
  let failSave!: (error: Error) => void;
  const host = new CommandHost((action) =>
    action === 'stop'
      ? new Promise((_, reject) => {
          failSave = reject;
        })
      : new Promise((resolve) => {
          finishAdjustment = resolve;
        }),
  );
  const ordinary = h.client.command(exposure);
  const cancelled = assert.rejects(ordinary, CommandSupersededError);
  const adjustment = host.receive(JSON.stringify(h.sent[0]), true);
  await Promise.resolve();
  const stop = h.client.command('stop');
  const failed = assert.rejects(stop, /Allow adding to Photos/);
  const stopping = host.receive(JSON.stringify(h.sent[1]), true);
  await Promise.resolve();
  assert.equal(typeof failSave, 'function');
  failSave(new Error('Allow adding to Photos. Your recording is kept in Relais.'));
  h.client.receive((await stopping)! as unknown as Record<string, unknown>);
  await failed;
  finishAdjustment(h.state());
  h.client.receive((await adjustment)! as unknown as Record<string, unknown>);
  await cancelled;
  assert.equal(h.client.getSnapshot().sending, false);
});
