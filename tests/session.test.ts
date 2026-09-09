import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialSession, transition } from '../src/session/machine';

test('transport loss and recovery preserve a native recording', () => {
  let state = transition(initialSession, { type: 'choose-role', role: 'camera' });
  state = transition(state, { type: 'connected' });
  state = transition(state, { type: 'recording-requested' });
  assert.equal(state.recording, 'starting');
  state = transition(state, { type: 'recording-confirmed' });
  const recording = state;
  state = transition(state, { type: 'transport-lost' });
  assert.equal(state.recording, 'recording');
  assert.equal(state.connection, 'reconnecting');
  assert.deepEqual(transition(state, { type: 'close' }), state);
  assert.deepEqual(transition(state, { type: 'choose-role', role: 'monitor' }), state);
  assert.deepEqual(transition(state, { type: 'connected' }), recording);
  state = transition(state, { type: 'stop-requested' });
  assert.equal(state.recording, 'stopping');
  state = transition(state, { type: 'recording-stopped' });
  assert.deepEqual(transition(state, { type: 'close' }), initialSession);
});

test('unconnected clicks and unsolicited confirmations cannot begin recording', () => {
  assert.deepEqual(transition(initialSession, { type: 'recording-requested' }), initialSession);
  assert.deepEqual(transition(initialSession, { type: 'recording-confirmed' }), initialSession);
  assert.deepEqual(transition(initialSession, { type: 'connected' }), initialSession);
});

test('network loss while awaiting recording ACK preserves pending state', () => {
  const state = {
    role: 'monitor' as const,
    connection: 'connected' as const,
    recording: 'starting' as const,
  };
  const lost = transition(state, { type: 'transport-lost' });
  assert.equal(lost.recording, 'starting');
  assert.equal(transition(lost, { type: 'recording-confirmed' }).recording, 'recording');
});
