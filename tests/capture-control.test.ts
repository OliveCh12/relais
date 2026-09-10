import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandHost } from '../src/capture/CommandHost';
import { emptyCaptureState, parseCaptureState, parseMessage } from '../src/capture/protocol';

const request = (sequence: number, action = 'photo', id = `capture-${sequence}`) =>
  JSON.stringify({ type: 'capture-command', id, sequence, action });

test('capture commands require a completed pairing and valid bounded input', async () => {
  let captures = 0;
  const host = new CommandHost(async () => {
    captures += 1;
  });
  assert.equal(await host.receive(request(1), false), null);
  assert.equal(await host.receive(request(1, 'focus'), true), null);
  assert.equal(await host.receive(request(0), true), null);
  assert.equal(await host.receive('x'.repeat(8193), true), null);
  assert.equal(await host.receive('null', true), null);
  assert.equal(captures, 0);
  assert.equal((await host.receive(request(1), true))?.ok, true);
  assert.equal(captures, 1);
});

test('duplicate requests share one native operation and cannot be reused for another action', async () => {
  let captures = 0;
  let finish!: () => void;
  const host = new CommandHost(() => {
    captures += 1;
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  const first = host.receive(request(1), true);
  const duplicate = host.receive(request(1), true);
  await Promise.resolve();
  assert.equal(captures, 1);
  assert.equal((await host.receive(request(1, 'start'), true))?.ok, false);
  finish();
  assert.deepEqual(await duplicate, await first);
});

test('evicted requests and reordered commands never repeat a capture', async () => {
  let captures = 0;
  const host = new CommandHost(async () => {
    captures += 1;
  });
  for (let i = 1; i <= 130; i += 1) await host.receive(request(i), true);
  assert.equal((await host.receive(request(1), true))?.ok, false);
  assert.equal((await host.receive(request(10, 'stop', 'another-id'), true))?.ok, false);
  assert.equal(captures, 130);
});

test('native errors reach the monitor without claiming capture success', async () => {
  const host = new CommandHost(async () => {
    throw new Error('Not enough space.');
  });
  assert.deepEqual(await host.receive(request(1), true), {
    type: 'capture-reply',
    id: 'capture-1',
    ok: false,
    error: 'Not enough space.',
  });
  assert.deepEqual(parseCaptureState(emptyCaptureState), emptyCaptureState);
  assert.equal(parseCaptureState({ ...emptyCaptureState, canCapture: 'yes' }), null);
  assert.equal(parseCaptureState({ ...emptyCaptureState, mode: 'cinematic' }), null);
  assert.equal(parseCaptureState({ ...emptyCaptureState, startedAt: Infinity }), null);
  assert.equal(parseMessage('[]'), null);
});
