import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandHost } from '../src/capture/CommandHost';
import {
  emptyCaptureState,
  parseCaptureState,
  parseMessage,
  type CaptureAction,
} from '../src/capture/protocol';

const request = (
  sequence: number,
  action: CaptureAction | string = 'photo',
  id = `capture-${sequence}`,
) => JSON.stringify({ type: 'capture-command', id, sequence, action });

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

test('remote settings validate the payload and bind duplicate IDs to its full contents', async () => {
  const changes: CaptureAction[] = [];
  const host = new CommandHost(async (action) => {
    changes.push(action);
  });
  const action = { type: 'settings', revision: 4, key: 'profile', value: '2160-60-true' } as const;
  assert.equal((await host.receive(request(1, action), true))?.ok, true);
  assert.equal((await host.receive(request(1, action), true))?.ok, true);
  assert.equal(
    (await host.receive(request(1, { ...action, value: '1080-30-false' }), true))?.ok,
    false,
  );
  assert.equal(changes.length, 1);
  for (const invalid of [
    { ...action, revision: -1 },
    { ...action, key: 'focus' },
    { ...action, value: 'unavailable' },
    { type: 'settings', revision: 4, key: 'zoom', value: -1 },
    { type: 'settings', revision: 4, key: 'audio', value: 1 },
    { ...action, extra: 'ignored?' },
  ])
    assert.equal(
      await host.receive(
        JSON.stringify({ type: 'capture-command', id: 'invalid', sequence: 2, action: invalid }),
        true,
      ),
      null,
    );
});

test('a capture acknowledgement waits for the gallery operation and carries import failure', async () => {
  let fail!: (error: Error) => void;
  const host = new CommandHost(
    () =>
      new Promise((_, reject) => {
        fail = reject;
      }),
  );
  let replied = false;
  const result = host.receive(request(1, 'stop'), true).then((reply) => {
    replied = true;
    return reply;
  });
  await Promise.resolve();
  assert.equal(replied, false);
  fail(new Error('Allow adding to Photos. Your capture is still in Relais.'));
  assert.equal((await result)?.ok, false);
});
