import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyCaptureState, parseCaptureState, parseMessage } from '../src/capture/protocol';
import { parseCameraSettings, type CameraSettings } from '../src/capture/settings';

const settings: CameraSettings = {
  revision: 1,
  profiles: [{ id: '2160-30-true', height: 2160, fps: 30, hdr: true }],
  profile: '2160-30-true',
  audio: true,
  grid: false,
  position: 'back',
  canFlip: true,
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 20,
  zoomStops: [0.5, 1, 2, 5],
  stabilization: true,
  canStabilize: true,
};
test('remote state accepts only coherent native capabilities and rejects unsafe ranges', () => {
  assert.deepEqual(parseCameraSettings(settings), settings);
  assert.deepEqual(parseCaptureState({ ...emptyCaptureState, settings })?.settings, settings);
  for (const invalid of [
    { ...settings, profile: '1080-60-false' },
    { ...settings, profiles: [...settings.profiles, ...settings.profiles] },
    { ...settings, maxZoom: 0.1 },
    { ...settings, zoom: NaN },
    { ...settings, zoomStops: [100] },
    { ...settings, audio: 'true' },
  ])
    assert.equal(parseCameraSettings(invalid), null);
});
test('bounded control messages fit a large native catalog without allowing unbounded data', () => {
  const profiles = Array.from({ length: 100 }, (_, i) => ({
    id: `2160-${i + 1}-true`,
    height: 2160,
    fps: i + 1,
    hdr: true,
  }));
  const message = JSON.stringify({
    type: 'capture-state',
    state: { ...emptyCaptureState, settings: { ...settings, profiles } },
  });
  assert.ok(parseCaptureState(parseMessage(message)?.state));
  assert.equal(parseMessage(JSON.stringify({ padding: 'x'.repeat(32768) })), null);
});

test('exposure and timer capabilities remain bounded and older peers remain compatible', () => {
  const controls = {
    exposure: 0,
    minExposure: -2,
    maxExposure: 2,
    timer: 3,
    flash: 'auto',
    hasFlash: true,
  };
  assert.deepEqual(parseCameraSettings({ ...settings, controls })?.controls, controls);
  assert.ok(parseCameraSettings(settings));
  assert.equal(
    parseCameraSettings({ ...settings, controls: { ...controls, canFocus: false } })?.controls
      ?.canFocus,
    false,
  );
  assert.equal(
    parseCameraSettings({ ...settings, controls: { ...controls, timerLight: false } })?.controls
      ?.timerLight,
    false,
  );
  for (const patch of [
    { exposure: 3 },
    { minExposure: 4 },
    { maxExposure: NaN },
    { timer: 5 },
    { timer: '3' },
    { flash: 'true' },
    { hasFlash: 1 },
    { timerLight: 1 },
    { canFocus: 'false' },
  ])
    assert.equal(parseCameraSettings({ ...settings, controls: { ...controls, ...patch } }), null);
});

test('hardware metadata describes the camera without changing its supported formats', () => {
  for (const hardware of [
    { platform: 'ios', manufacturer: 'Apple', model: 'iPhone18,1', osVersion: '26.5' },
    { platform: 'android', manufacturer: 'Google', model: 'Pixel 11 Pro', osVersion: '17' },
  ]) {
    const state = parseCaptureState({ ...emptyCaptureState, settings, hardware });
    assert.deepEqual(state?.hardware, hardware);
    assert.deepEqual(state?.settings?.profiles, settings.profiles);
    const parsed = state!;
    hardware.model = 'Renamed model';
    assert.notEqual(parsed.hardware?.model, hardware.model);
  }
  assert.ok(parseCaptureState({ ...emptyCaptureState, settings }));
  for (const invalid of [
    { platform: 'web', manufacturer: 'Apple', model: 'iPhone', osVersion: '26' },
    { platform: 'ios', manufacturer: 'Apple', model: '', osVersion: '26' },
    { platform: 'android', manufacturer: 'Google', model: 'x'.repeat(121), osVersion: '17' },
    { platform: 'ios', manufacturer: 'Apple', model: 'iPhone\nCamera', osVersion: '26' },
  ])
    assert.equal(parseCaptureState({ ...emptyCaptureState, settings, hardware: invalid }), null);
});
