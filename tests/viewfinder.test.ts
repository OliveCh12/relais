import assert from 'node:assert/strict';
import { test } from 'node:test';
import { videoPoint, unrotatePoint, ViewfinderWriter } from '../src/capture/viewfinder';
import { parseSettingsAction } from '../src/capture/settings';
import { CommandHost } from '../src/capture/CommandHost';

test('focus ignores letterboxes and maps both contain and cover without stretching', () => {
  const view = { width: 400, height: 800 };
  const video = { width: 1920, height: 1080 };
  assert.equal(videoPoint({ x: 200, y: 80 }, view, video), null);
  assert.deepEqual(videoPoint({ x: 200, y: 400 }, view, video), { x: 0.5, y: 0.5 });
  assert.deepEqual(videoPoint({ x: 0, y: 287.5 }, view, video), { x: 0, y: 0 });
  const cropped = videoPoint({ x: 0, y: 400 }, view, video, true)!;
  assert.ok(cropped.x > 0 && cropped.x < 0.5);
  assert.equal(cropped.y, 0.5);
  assert.equal(videoPoint({ x: 0, y: 0 }, view, { width: 0, height: 0 }), null);
  assert.equal(videoPoint({ x: NaN, y: 0 }, view, video), null);
});
test('portrait and both landscape orientations map back to the unmirrored sensor', () => {
  assert.deepEqual(unrotatePoint({ x: 0.2, y: 0.75 }, 0), { x: 0.2, y: 0.75 });
  assert.deepEqual(unrotatePoint({ x: 0.2, y: 0.75 }, 90), { x: 0.75, y: 0.8 });
  assert.deepEqual(unrotatePoint({ x: 0.2, y: 0.75 }, 180), { x: 0.8, y: 0.25 });
  assert.deepEqual(unrotatePoint({ x: 0.2, y: 0.75 }, 270), { x: 0.25, y: 0.2 });
});
test('focus commands are bounded, paired and idempotent', async () => {
  const action = { type: 'settings', revision: 2, key: 'focus', value: { x: 0.2, y: 0.8 } };
  assert.deepEqual(parseSettingsAction(action), action);
  for (const value of [
    { x: -1, y: 0 },
    { x: 0, y: 2 },
    { x: NaN, y: 0 },
    { x: 0.2 },
    { x: 0, y: 0, extra: true },
  ])
    assert.equal(parseSettingsAction({ ...action, value }), null);
  let calls = 0;
  const host = new CommandHost(async () => {
    calls++;
  });
  const request = JSON.stringify({ type: 'capture-command', id: 'focus-1', sequence: 1, action });
  assert.equal(await host.receive(request, false), null);
  assert.equal((await host.receive(request, true))?.ok, true);
  assert.equal((await host.receive(request, true))?.ok, true);
  assert.equal(calls, 1);
});
test('a drag waits for focus, coalesces intermediate values and drops queued work on exit', async () => {
  const sent: number[] = [];
  let release!: () => void;
  const focus = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writer = new ViewfinderWriter(() => assert.fail('unexpected failure'));
  writer.focus(() => focus);
  for (let value = 1; value <= 100; value++)
    writer.write(async () => {
      sent.push(value);
    });
  assert.equal(sent.join(','), '');
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.join(','), '100');
  writer.dispose();
  writer.write(async () => {
    sent.push(101);
  });
  assert.equal(sent.join(','), '100');
});
test('a failed focus does not apply a queued exposure', async () => {
  let failures = 0;
  let exposure = false;
  const writer = new ViewfinderWriter(() => {
    failures++;
  });
  writer.write(async () => {
    throw new Error('disconnected');
  });
  writer.write(async () => {
    exposure = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(failures, 1);
  assert.equal(exposure, false);
});

test('a new focus target is never replaced by a following exposure drag', async () => {
  const calls: string[] = [];
  let release!: () => void;
  const writer = new ViewfinderWriter(() => assert.fail('unexpected error'));
  writer.write(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  writer.focus(async () => {
    calls.push('focus');
  });
  writer.write(async () => {
    calls.push('exposure');
  });
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.join(','), 'focus,exposure');
});
