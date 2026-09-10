import assert from 'node:assert/strict';
import test from 'node:test';
import { closestRecordingProfile } from '../modules/relais-camera-engine/src/recordingProfiles';

test('recording selection keeps native resolution/cadence/HDR combinations intact', () => {
  const profiles = [
    { height: 720, fps: 30, hdr: false },
    { height: 2160, fps: 30, hdr: true },
    { height: 2160, fps: 60, hdr: false },
  ];
  assert.deepEqual(
    closestRecordingProfile(profiles, { height: 2160, fps: 60, hdr: true }),
    profiles[2],
  );
  assert.deepEqual(
    closestRecordingProfile(profiles, { height: 720, fps: 30, hdr: true }),
    profiles[0],
  );
  assert.equal(closestRecordingProfile([], { height: 2160, fps: 30, hdr: true }), null);
});

test('camera change adapts to an actual profile without inventing a 4K capability', () => {
  const front = [{ height: 1080, fps: 30, hdr: false }];
  assert.deepEqual(closestRecordingProfile(front, { height: 2160, fps: 120, hdr: true }), front[0]);
});
