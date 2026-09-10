import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mockCapabilities } from '../src/capabilities/mock';
import { defaultConfiguration, validateConfiguration } from '../src/capabilities/validate';
import {
  qualityGroups,
  reconcileConfiguration,
  selectQualityOption,
} from '../src/capabilities/selection';

test('every offered UI choice produces a valid per-lens configuration', () => {
  const initial = defaultConfiguration(mockCapabilities);
  for (const lens of mockCapabilities.lenses) {
    for (const fileQuality of lens.fileQualities) {
      const configuration = {
        ...initial,
        lens: lens.id,
        fileQuality,
        zoom: lens.zoom.min,
        torch: false,
      };
      for (const group of qualityGroups(mockCapabilities, configuration)) {
        for (const option of group.options) {
          const next = selectQualityOption(mockCapabilities, configuration, group.id, option.value);
          assert.doesNotThrow(() => validateConfiguration(mockCapabilities, next));
          assert.equal(
            qualityGroups(mockCapabilities, next).find(({ id }) => id === group.id)?.value,
            option.value,
          );
        }
      }
    }
  }
});

test('switching lenses removes unavailable fps and resets lens-specific controls', () => {
  const initial = defaultConfiguration(mockCapabilities);
  const fast = selectQualityOption(mockCapabilities, initial, 'fps', '60');
  const front = selectQualityOption(mockCapabilities, fast, 'lens', 'mock-front');
  assert.equal(front.fileQuality.fps, 30);
  assert.equal(front.torch, false);
  assert.deepEqual(qualityGroups(mockCapabilities, front).find(({ id }) => id === 'fps')?.options, [
    { value: '30', label: '30 fps' },
  ]);
  assert.strictEqual(selectQualityOption(mockCapabilities, front, 'fps', '60'), front);
  assert.strictEqual(selectQualityOption(mockCapabilities, front, 'hdr', 'true'), front);
});

test('a capabilities refresh keeps valid drafts and replaces invalid drafts', () => {
  const initial = defaultConfiguration(mockCapabilities);
  const chosen = selectQualityOption(mockCapabilities, initial, 'fps', '60');
  assert.strictEqual(reconcileConfiguration(mockCapabilities, chosen), chosen);
  const frontOnly = {
    ...mockCapabilities,
    lenses: mockCapabilities.lenses.filter(({ id }) => id === 'mock-front'),
  };
  const reconciled = reconcileConfiguration(frontOnly, chosen);
  assert.equal(reconciled.lens, 'mock-front');
  assert.doesNotThrow(() => validateConfiguration(frontOnly, reconciled));
});
