import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PhotoTimer } from '../src/capture/PhotoTimer';
import { NameWriter, type NameWriteState } from '../src/connections/NameWriter';
import { parseSettingsAction } from '../src/capture/settings';
import { emptyCaptureState, parseCaptureState, parseRequest } from '../src/capture/protocol';

test('photo countdown completes once, and cancellation prevents delayed capture', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  const timer = new PhotoTimer();
  const ticks: number[] = [];
  const first = timer.wait(3, (value) => ticks.push(value));
  context.mock.timers.tick(1000);
  assert.deepEqual(ticks, [3, 2]);
  assert.equal(timer.cancel(), true);
  assert.equal(await first, false);
  context.mock.timers.tick(10000);
  assert.deepEqual(ticks, [3, 2]);
  assert.equal(timer.cancel(), false);
  const second = timer.wait(3, (value) => ticks.push(value));
  context.mock.timers.tick(3000);
  assert.equal(await second, true);
  assert.equal(timer.cancel(), false);
});

test('replacing a timer invalidates the previous capture', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  const timer = new PhotoTimer();
  const first = timer.wait(10, () => {});
  const second = timer.wait(3, () => {});
  assert.equal(await first, false);
  context.mock.timers.tick(3000);
  assert.equal(await second, true);
});

test('blur and Done coalesce; queued names cannot complete out of order', async () => {
  const writes: string[] = [];
  const states: NameWriteState[] = [];
  let release!: () => void;
  const writer = new NameWriter(
    'Old',
    async (name) => {
      writes.push(name);
      if (name === 'First')
        await new Promise<void>((resolve) => {
          release = resolve;
        });
    },
    (state) => states.push(state),
  );
  const first = writer.save(' First ');
  const duplicate = writer.save('First');
  assert.equal(first, duplicate);
  await Promise.resolve();
  const last = writer.save('Last');
  assert.deepEqual(writes, ['First']);
  release();
  await last;
  assert.deepEqual(writes, ['First', 'Last']);
  assert.deepEqual(
    states.map((s) => s.status),
    ['saving', 'saving', 'saved'],
  );
});

test('failed names remain retryable, and empty names never reach storage', async () => {
  let attempts = 0;
  const states: NameWriteState[] = [];
  const writer = new NameWriter(
    'Old',
    async () => {
      if (++attempts === 1) throw new Error('Storage unavailable');
    },
    (state) => states.push(state),
  );
  await writer.save('');
  assert.equal(attempts, 0);
  await writer.save('New');
  assert.equal(states.at(-1)?.status, 'error');
  await writer.save('New');
  assert.equal(attempts, 2);
  assert.equal(states.at(-1)?.status, 'saved');
});

test('camera controls reject invalid exposure, flash and timer values at the protocol boundary', () => {
  const action = (key: string, value: unknown) => ({ type: 'settings', revision: 3, key, value });
  for (const value of [-20, -0.5, 0, 3, 20])
    assert.ok(parseSettingsAction(action('exposure', value)));
  for (const value of [NaN, Infinity, -21, 21, '1'])
    assert.equal(parseSettingsAction(action('exposure', value)), null);
  for (const value of [0, 3, 10]) assert.ok(parseSettingsAction(action('timer', value)));
  for (const value of [-1, 1, 3.5, '3', 100])
    assert.equal(parseSettingsAction(action('timer', value)), null);
  for (const value of ['on', 'off', 'auto']) assert.ok(parseSettingsAction(action('flash', value)));
  assert.equal(parseSettingsAction(action('flash', true)), null);
  assert.ok(
    parseRequest({ type: 'capture-command', id: 'cancel-1', sequence: 2, action: 'cancel-timer' }),
  );
  assert.ok(parseCaptureState({ ...emptyCaptureState, phase: 'countdown' }));
});
