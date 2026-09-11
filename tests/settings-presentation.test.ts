import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cameraSettingsSections } from '../src/components/cameraSettingsSections';
import type { SettingsRow } from '../src/components/SettingsPage.types';
import { emptyCaptureState, type CaptureAction, type CaptureState } from '../src/capture/protocol';

const state: CaptureState = {
  ...emptyCaptureState,
  mode: 'video',
  modes: ['photo', 'video', 'cinematic'],
  ready: true,
  canCapture: true,
  settings: {
    revision: 7,
    profiles: [
      { id: '2160-60-false', height: 2160, fps: 60, hdr: false },
      { id: '4320-30-false', height: 4320, fps: 30, hdr: false },
    ],
    profile: '2160-60-false',
    audio: true,
    stabilization: true,
    canStabilize: true,
    position: 'back',
    canFlip: true,
    grid: false,
    zoom: 1,
    minZoom: 1,
    maxZoom: 10,
    zoomStops: [1, 2],
    controls: {
      exposure: 0,
      minExposure: -2,
      maxExposure: 2,
      timer: 0,
      flash: 'off',
      hasFlash: false,
    },
  },
};

test('local and remote settings expose the camera catalog and send identical native commands', () => {
  const commands: CaptureAction[][] = [];
  for (const context of ['local', 'remote'] as const) {
    const actions: CaptureAction[] = [];
    const sections = cameraSettingsSections(
      state,
      (action) => actions.push(action),
      false,
      false,
      context,
    );
    const rows = sections.flatMap((section) => section.rows);
    const find = (label: string) => rows.find((row) => row.label === label);
    const resolution = find('Resolution');
    assert.equal(resolution?.kind, 'choice');
    if (resolution?.kind === 'choice') resolution.onChange('4320');
    const mode = find('Capture mode');
    if (mode?.kind === 'choice') {
      assert.ok(mode.options.some((option) => option.value === 'cinematic'));
      mode.onChange('cinematic');
    }
    const stabilization = find('Stabilization');
    if (stabilization?.kind === 'toggle') stabilization.onChange(false);
    commands.push(actions);
  }
  assert.deepEqual(commands[0], commands[1]);
  assert.deepEqual(commands[0], [
    { type: 'settings', revision: 7, key: 'profile', value: '4320-30-false' },
    'mode-cinematic',
    { type: 'settings', revision: 7, key: 'stabilization', value: false },
  ]);
});

test('recording keeps framing controls usable while protecting the original video configuration', () => {
  const rows = cameraSettingsSections(
    { ...state, phase: 'recording', canCapture: false },
    () => {},
    true,
    false,
  ).flatMap((section) => section.rows);
  const disabled = (label: string) => {
    const row: SettingsRow | undefined = rows.find((row) => row.label === label);
    assert.ok(row && 'disabled' in row);
    return row.disabled;
  };
  for (const label of [
    'Resolution',
    'Frame rate',
    'HDR video',
    'Record audio',
    'Stabilization',
    'Capture mode',
    'Camera',
  ])
    assert.equal(disabled(label), true, label);
  for (const label of ['Grid on camera', 'Zoom · 1×', 'Exposure · 0.0 EV'])
    assert.equal(disabled(label), false, label);
});
