import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mockCapabilities } from '../src/capabilities/mock';
import {
  defaultConfiguration,
  parseCapabilities,
  validateConfiguration,
} from '../src/capabilities/validate';
import { webCameraEngine } from '../src/camera/web/stub';

test('shared native fixture explicitly refuses capture', async () => {
  assert.equal(mockCapabilities.source, 'stub');
  assert.equal(mockCapabilities.canRecord, false);
  assert.equal(mockCapabilities.canPreview, false);
  assert.deepEqual(await webCameraEngine.getCapabilities(), mockCapabilities);
  await assert.rejects(webCameraEngine.startRecording(), /ERR_CAMERA_ENGINE_STUB/);
  await assert.rejects(webCameraEngine.stopRecording(), /ERR_CAMERA_ENGINE_STUB/);
  await assert.rejects(webCameraEngine.startPreview(), /ERR_CAMERA_ENGINE_STUB/);
});

test('quality validation rejects unsupported cross products and changed profile contents', () => {
  const config = defaultConfiguration(mockCapabilities);
  assert.doesNotThrow(() => validateConfiguration(mockCapabilities, config));
  for (const candidate of [
    { ...config, torch: true },
    { ...config, zoom: NaN },
    { ...config, lens: 'nonexistent' },
    { ...config, fileQuality: { ...config.fileQuality, fps: 120 } },
    { ...config, fileQuality: { ...config.fileQuality, hdr: true } },
    { ...config, previewQuality: { ...config.previewQuality, width: 3840 } },
    { ...config, lens: 'mock-front', fileQuality: mockCapabilities.lenses[0]!.fileQualities[1]! },
  ])
    assert.throws(() => validateConfiguration(mockCapabilities, candidate), /Unsupported/);
});

test('capability boundary rejects invalid native payloads and fake stub capture', () => {
  for (const candidate of [
    null,
    {},
    { ...mockCapabilities, canRecord: true },
    {
      ...mockCapabilities,
      previewQualities: [{ width: 1920, height: 1080, fps: 60, maxBitrate: 10_000_000 }],
    },
    { ...mockCapabilities, lenses: [] },
  ])
    assert.throws(() => parseCapabilities(candidate), /Invalid or incompatible/);
});
