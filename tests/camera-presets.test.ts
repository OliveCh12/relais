import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeviceRegistry, type DeviceStorage } from '../src/connections/registry';
import { emptyCaptureState, type CaptureState } from '../src/capture/protocol';
import { parsePreset, previewPreset, supportsSetting } from '../src/capture/presets';

const camera: CaptureState = {
  ...emptyCaptureState,
  mode: 'video',
  ready: true,
  canCapture: true,
  settings: {
    revision: 3,
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
      minExposure: -2,
      maxExposure: 2,
      exposure: 0,
      timer: 0,
      flash: 'auto',
      hasFlash: true,
    },
  },
};
test('presets reject ephemeral metering, duplicate controls and unknown modes', () => {
  assert.equal(parsePreset({ mode: 'portrait', settings: [] }), undefined);
  assert.equal(parsePreset({ settings: [{ key: 'focus', value: { x: 0.5, y: 0.5 } }] }), undefined);
  assert.equal(
    parsePreset({
      settings: [
        { key: 'grid', value: true },
        { key: 'grid', value: false },
      ],
    }),
    undefined,
  );
});
test('offline choices do not change the cached device or invent format catalogues', () => {
  const preview = previewPreset(camera, {
    mode: 'photo',
    settings: [{ key: 'grid', value: true }],
  });
  assert.equal(preview.mode, 'photo');
  assert.equal(preview.settings?.grid, true);
  assert.deepEqual(preview.settings?.profiles, []);
  assert.equal(camera.mode, 'video');
  assert.equal(camera.settings?.grid, false);
  assert.equal(supportsSetting(camera, { key: 'profile', value: '2160-120-false' }), false);
  assert.equal(supportsSetting(camera, { key: 'profile', value: '2160-60-false' }), true);
  assert.equal(supportsSetting(camera, { key: 'timer', value: 3 }), false);
  assert.equal(supportsSetting(camera, { key: 'exposure', value: 8 }), false);
});
test('camera preferences survive restart/re-pairing while corrupt cache never loses credentials', async () => {
  const values = new Map<string, string>();
  const storage: DeviceStorage = {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
  const create = () =>
    new DeviceRegistry(storage, async (bytes) => '1'.repeat(bytes * 2), 'Monitor');
  const device = {
    id: 'a'.repeat(32),
    name: 'Camera',
    pairId: 'b'.repeat(32),
    secret: 'c'.repeat(48),
    server: 'http://192.168.1.2:8787',
    lastConnectedAt: 10,
  };
  const registry = create();
  await registry.remember(device);
  await registry.cacheCamera(device.id, camera);
  await registry.savePreset(device.id, () => ({
    mode: 'video',
    settings: [{ key: 'profile', value: '2160-60-false' }],
  }));
  await registry.remember({ ...device, lastConnectedAt: 20 });
  const restarted = create();
  await restarted.load();
  assert.equal(restarted.getSnapshot()[0]?.preset?.settings[0]?.value, '2160-60-false');
  assert.equal(restarted.getSnapshot()[0]?.camera?.settings?.profile, '2160-60-false');
  values.set(`relais.camera.${device.id}`, '{');
  const recovered = create();
  await recovered.load();
  assert.equal(recovered.getSnapshot()[0]?.secret, device.secret);
  assert.equal(recovered.getSnapshot()[0]?.camera, undefined);
  await recovered.forget(device.id);
  assert.ok(![...values.keys()].some((key) => key.includes(device.id)));
});
