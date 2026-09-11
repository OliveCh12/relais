import assert from 'node:assert/strict';
import test from 'node:test';
import { meteringModes } from '../modules/relais-camera-engine/src/android/metering';

test('touch metering never requests unsupported native modes', () => {
  assert.deepEqual(meteringModes(undefined), []);
  assert.deepEqual(
    meteringModes({
      supportsFocusMetering: false,
      supportsExposureMetering: false,
      supportsWhiteBalanceMetering: false,
    }),
    [],
  );
  assert.deepEqual(
    meteringModes({
      supportsFocusMetering: false,
      supportsExposureMetering: true,
      supportsWhiteBalanceMetering: true,
    }),
    ['AE', 'AWB'],
  );
  assert.deepEqual(
    meteringModes({
      supportsFocusMetering: true,
      supportsExposureMetering: true,
      supportsWhiteBalanceMetering: true,
    }),
    ['AF', 'AE', 'AWB'],
  );
});
