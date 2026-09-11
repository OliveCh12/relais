import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeviceRegistry, type DeviceStorage } from '../src/connections/registry';
import { emptyCaptureState, type CaptureAction, type CaptureState } from '../src/capture/protocol';
import { parsePreset, previewPreset, supportsSetting } from '../src/capture/presets';
import { applyCameraPreset } from '../src/capture/applyPreset';

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

test('presets change stabilization before selecting a newly available high-frame-rate profile', async () => {
  let state = structuredClone(camera);
  const actions: CaptureAction[] = [];
  const highRate = { id: '2160-120-false', height: 2160, fps: 120, hdr: false };
  await applyCameraPreset(
    {
      settings: [
        { key: 'profile', value: highRate.id },
        { key: 'stabilization', value: false },
      ],
    },
    () => state,
    async (action) => {
      actions.push(action);
      assert.equal(typeof action, 'object');
      if (typeof action !== 'object') return;
      assert.equal(action.revision, state.settings!.revision);
      if (action.key === 'stabilization') {
        state = {
          ...state,
          settings: {
            ...state.settings!,
            stabilization: false,
            profiles: [...state.settings!.profiles, highRate],
            revision: 4,
          },
        };
      } else {
        assert.equal(action.key, 'profile');
        assert.equal(action.value, highRate.id);
      }
    },
  );
  assert.deepEqual(
    actions.map((action) => typeof action === 'object' && action.key),
    ['stabilization', 'profile'],
  );
});

test('a rejected configuration stops preset application before dependent format changes', async () => {
  const actions: CaptureAction[] = [];
  await assert.rejects(
    applyCameraPreset(
      {
        settings: [
          { key: 'profile', value: '2160-60-false' },
          { key: 'stabilization', value: false },
        ],
      },
      () => camera,
      async (action) => {
        actions.push(action);
        throw new Error('Native configuration failed');
      },
    ),
    /Native configuration failed/,
  );
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0], {
    type: 'settings',
    revision: 3,
    key: 'stabilization',
    value: false,
  });
});

test('changing stabilization invalidates the cached catalog until the camera confirms it', () => {
  const preview = previewPreset(camera, { settings: [{ key: 'stabilization', value: false }] });
  assert.deepEqual(preview.settings?.profiles, []);
  assert.equal(preview.settings?.profile, null);
  assert.equal(camera.settings?.stabilization, true);
  assert.deepEqual(
    previewPreset(camera, { settings: [{ key: 'stabilization', value: true }] }).settings?.profiles,
    camera.settings?.profiles,
  );
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
  const hardware = {
    platform: 'android' as const,
    manufacturer: 'Google',
    model: 'Pixel 11 Pro',
    osVersion: '17',
  };
  await registry.cacheCamera(device.id, { ...camera, hardware });
  await registry.savePreset(device.id, () => ({
    mode: 'video',
    settings: [{ key: 'profile', value: '2160-60-false' }],
  }));
  await registry.remember({ ...device, lastConnectedAt: 20 });
  const restarted = create();
  await restarted.load();
  assert.equal(restarted.getSnapshot()[0]?.preset?.settings[0]?.value, '2160-60-false');
  assert.equal(restarted.getSnapshot()[0]?.camera?.settings?.profile, '2160-60-false');
  assert.deepEqual(restarted.getSnapshot()[0]?.camera?.hardware, hardware);
  values.set(`relais.camera.${device.id}`, '{');
  const recovered = create();
  await recovered.load();
  assert.equal(recovered.getSnapshot()[0]?.secret, device.secret);
  assert.equal(recovered.getSnapshot()[0]?.camera, undefined);
  await recovered.forget(device.id);
  assert.ok(![...values.keys()].some((key) => key.includes(device.id)));
});

test('caching a setting edit does not rewrite unchanged native format chunks', async () => {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const storage: DeviceStorage = {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      writes.push(key);
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
  const create = () =>
    new DeviceRegistry(storage, async (bytes) => '1'.repeat(bytes * 2), 'Monitor');
  const registry = create();
  const id = 'a'.repeat(32);
  await registry.remember({
    id,
    name: 'Camera',
    pairId: 'b'.repeat(32),
    secret: 'c'.repeat(48),
    server: 'http://192.168.1.2:8787',
    lastConnectedAt: 10,
  });
  await registry.cacheCamera(id, camera);
  writes.length = 0;
  const changed = { ...camera, settings: { ...camera.settings!, grid: true, revision: 4 } };
  await registry.cacheCamera(id, changed);
  assert.deepEqual(writes, [`relais.camera.${id}`]);
  writes.length = 0;
  await registry.cacheCamera(id, changed);
  assert.deepEqual(writes, []);
  const restarted = create();
  await restarted.load();
  assert.equal(restarted.getSnapshot()[0]?.camera?.settings?.grid, true);
  assert.deepEqual(
    restarted.getSnapshot()[0]?.camera?.settings?.profiles,
    camera.settings?.profiles,
  );
});
