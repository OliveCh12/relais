import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RecordingController,
  type NativeRecorder,
} from '../modules/relais-camera-engine/src/RecordingController';

test('an early stop waits for native start and gallery confirmation; repeated taps create one recorder', async () => {
  let releaseStart!: () => void;
  let finish!: (path: string) => void;
  let releaseSave!: (id: string) => void;
  let creations = 0;
  const controller = new RecordingController(
    () =>
      new Promise((resolve) => {
        releaseSave = resolve;
      }),
  );
  const recorder: NativeRecorder = {
    startRecording: (callback) => {
      finish = callback;
      return new Promise((resolve) => {
        releaseStart = resolve;
      });
    },
    stopRecording: async () => {
      finish('/documents/real-native-video.mp4');
    },
  };
  const create = async () => {
    creations += 1;
    return recorder;
  };
  const starting = controller.start(create);
  void controller.start(create);
  const stopping = controller.stop();
  await Promise.resolve();
  assert.equal(controller.getSnapshot().phase, 'starting');
  releaseStart();
  await starting;
  await Promise.resolve();
  assert.equal(creations, 1);
  assert.equal(controller.getSnapshot().phase, 'saving');
  releaseSave('photos-asset');
  await stopping;
  assert.equal(controller.getSnapshot().phase, 'saved');
  assert.equal(controller.getSnapshot().pendingPath, null);
});

test('a refused gallery write preserves the completed file and retries saving without recapturing', async () => {
  let finish!: (path: string) => void;
  let attempts = 0;
  const controller = new RecordingController(async (path) => {
    assert.equal(path, '/documents/clip.mp4');
    if (++attempts === 1) throw new Error('Photos permission denied');
    return 'asset';
  });
  await controller.start(async () => ({
    startRecording: async (callback) => {
      finish = callback;
    },
    stopRecording: async () => {
      finish('/documents/clip.mp4');
    },
  }));
  await controller.stop();
  assert.equal(controller.getSnapshot().phase, 'pending');
  assert.equal(controller.getSnapshot().pendingPath, '/documents/clip.mp4');
  await controller.retrySave();
  assert.equal(controller.getSnapshot().phase, 'saved');
  assert.equal(attempts, 2);
});
