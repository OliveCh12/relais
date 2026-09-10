import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendCameraCommand } from '../src/monitor/commands';

test('monitor waits for matching native confirmation', async () => {
  const command = { id: '1', type: 'start-recording' as const };
  await assert.rejects(
    sendCameraCommand(
      { send: async () => ({ id: '2', ok: true, recording: 'recording' }) },
      command,
    ),
    /different command/,
  );
  await assert.rejects(
    sendCameraCommand(
      { send: async () => ({ id: '1', ok: false, code: 'STUB', message: 'Not implemented' }) },
      command,
    ),
    /Not implemented/,
  );
  assert.equal(
    (
      await sendCameraCommand(
        { send: async () => ({ id: '1', ok: true, recording: 'recording' }) },
        command,
      )
    ).recording,
    'recording',
  );
});
