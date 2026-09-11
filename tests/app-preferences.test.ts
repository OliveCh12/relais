import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreferenceStore } from '../src/preferences/Preferences';
import { preferredProfile } from '../src/preferences/quality';
import { emptyCaptureState, type CaptureState } from '../src/capture/protocol';
import { NameWriter } from '../src/connections/NameWriter';
import { privateLanOrigin } from '../src/signaling/protocol';

function memory() {
  const values = new Map<string, string>();
  const storage = {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => {
      values.set(key, value);
    },
    remove: async (key: string) => {
      values.delete(key);
    },
  };
  return { values, storage, create: () => new PreferenceStore(storage) };
}
test('app preferences merge concurrent edits and survive a restart', async () => {
  const store = memory();
  const preferences = store.create();
  await preferences.load();
  assert.equal(preferences.getSnapshot().value.quality, 'best');
  await Promise.all([
    preferences.update({ quality: 'balanced' }),
    preferences.update({ server: 'http://192.168.1.2:8787' }),
  ]);
  const restarted = store.create();
  await restarted.load();
  assert.deepEqual(restarted.getSnapshot().value, {
    quality: 'balanced',
    server: 'http://192.168.1.2:8787',
    fillPreview: false,
  });
  await restarted.update({ server: '', fillPreview: true });
  const previewRestart = store.create();
  await previewRestart.load();
  assert.equal(previewRestart.getSnapshot().value.fillPreview, true);
  assert.equal(restarted.getSnapshot().value.server, '');
});
test('failed preference writes keep the committed value and can be retried', async () => {
  const store = memory();
  const preferences = store.create();
  await preferences.load();
  const write = store.storage.set;
  store.storage.set = async () => {
    throw new Error('Storage locked');
  };
  await assert.rejects(preferences.update({ quality: 'balanced' }), /locked/);
  assert.equal(preferences.getSnapshot().value.quality, 'best');
  store.storage.set = write;
  await preferences.update({ quality: 'balanced' });
  await assert.rejects(preferences.update({ server: 'https://example.com' }));
  assert.equal(preferences.getSnapshot().value.server, '');
});
test('auto-save coalesces blur and Done, validates addresses and supports clearing an override', async () => {
  const values: string[] = [];
  const writer = new NameWriter(
    '',
    async (value) => {
      if (value) privateLanOrigin(value);
      values.push(value);
    },
    () => {},
    () => undefined,
  );
  writer.edit('http://192.168.1.2:8787');
  assert.deepEqual(values, []);
  await Promise.all([writer.commit(), writer.commit()]);
  await writer.save('https://example.com');
  await writer.save('');
  assert.deepEqual(values, ['http://192.168.1.2:8787', '']);
});
const profiles = [
  { id: '1080-30-false', height: 1080, fps: 30, hdr: false },
  { id: '1080-60-false', height: 1080, fps: 60, hdr: false },
  { id: '2160-30-false', height: 2160, fps: 30, hdr: false },
  { id: '2160-60-false', height: 2160, fps: 60, hdr: false },
  { id: '2160-60-true', height: 2160, fps: 60, hdr: true },
];
const camera: CaptureState = {
  ...emptyCaptureState,
  mode: 'video',
  ready: true,
  canCapture: true,
  settings: {
    revision: 1,
    profiles,
    profile: '1080-30-false',
    audio: true,
    grid: false,
    position: 'back',
    canFlip: true,
    zoom: 1,
    minZoom: 1,
    maxZoom: 5,
    zoomStops: [1, 2],
    stabilization: true,
    canStabilize: true,
  },
};
test('preferred quality selects only advertised combinations, preserving HDR and respecting photo/keep modes', () => {
  assert.equal(preferredProfile(camera, 'best')?.id, '2160-60-false');
  assert.equal(preferredProfile(camera, 'balanced')?.id, '1080-30-false');
  assert.equal(
    preferredProfile(
      { ...camera, settings: { ...camera.settings!, profile: '2160-60-true' } },
      'best',
    )?.id,
    '2160-60-true',
  );
  const limited = { ...camera, settings: { ...camera.settings!, profiles: profiles.slice(0, 3) } };
  assert.equal(preferredProfile(limited, 'best')?.id, '2160-30-false');
  assert.equal(
    preferredProfile(
      { ...limited, settings: { ...limited.settings!, profiles: profiles.slice(0, 2) } },
      'best',
    )?.id,
    '1080-60-false',
  );
  assert.equal(preferredProfile({ ...camera, mode: 'photo' }, 'best'), undefined);
  assert.equal(preferredProfile(camera, 'camera'), undefined);
  assert.equal(
    preferredProfile({ ...camera, settings: { ...camera.settings!, profiles: [] } }, 'best'),
    undefined,
  );
});

test('best available follows the camera catalog above 4K60 and includes intermediate resolutions', () => {
  const advertised = [...profiles, { id: '2160-120-false', height: 2160, fps: 120, hdr: false }];
  const withProfiles = (next: typeof profiles): CaptureState => ({
    ...camera,
    settings: { ...camera.settings!, profiles: next },
  });
  assert.equal(preferredProfile(withProfiles(advertised), 'best')?.id, '2160-120-false');
  // A future native engine may advertise 8K; the Monitor must not impose a 4K ceiling.
  const higherResolution = { id: '4320-30-false', height: 4320, fps: 30, hdr: false };
  assert.equal(
    preferredProfile(withProfiles([...advertised, higherResolution]), 'best')?.id,
    higherResolution.id,
  );
  const qhd = { id: '1440-60-false', height: 1440, fps: 60, hdr: false };
  assert.equal(preferredProfile(withProfiles([profiles[0]!, qhd]), 'best')?.id, qhd.id);
  assert.equal(preferredProfile(withProfiles(advertised), 'balanced')?.id, '1080-30-false');
});
