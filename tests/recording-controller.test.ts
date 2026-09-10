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
  await assert.rejects(controller.stop(), /Photos permission denied/);
  assert.equal(controller.getSnapshot().phase, 'pending');
  assert.equal(controller.getSnapshot().pendingPath, '/documents/clip.mp4');
  await controller.retrySave();
  assert.equal(controller.getSnapshot().phase, 'saved');
  assert.equal(attempts, 2);
});

test('camera release waits for the native file but does not wait for a slow gallery import', async () => {
  let finish!: (path: string) => void;
  let releaseSave!: (id: string) => void;
  let stopCalls = 0;
  const controller = new RecordingController(
    () =>
      new Promise((resolve) => {
        releaseSave = resolve;
      }),
  );
  await controller.start(async () => ({
    startRecording: async (callback) => {
      finish = callback;
    },
    stopRecording: async () => {
      stopCalls += 1;
    },
  }));
  let released = false;
  let saved = false;
  const capture = controller.stopCapture().then(() => {
    released = true;
  });
  const complete = controller.stop().then(() => {
    saved = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stopCalls, 1);
  assert.equal(released, false);
  assert.equal(controller.getSnapshot().phase, 'stopping');

  finish('/documents/clip.mp4');
  await capture;
  assert.equal(released, true);
  assert.equal(saved, false);
  assert.equal(controller.getSnapshot().phase, 'saving');
  assert.equal(controller.getSnapshot().pendingPath, '/documents/clip.mp4');

  releaseSave('asset');
  await complete;
  assert.equal(saved, true);
  assert.equal(controller.getSnapshot().phase, 'saved');
});

test('camera release completes after a failed native start', async () => {
  const controller = new RecordingController(async () => assert.fail('No file to save'));
  const starting = controller.start(async () => {
    throw new Error('Camera unavailable');
  });
  await controller.stopCapture();
  await starting;
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.equal(controller.getSnapshot().message, 'Camera unavailable');
});

test('a failed stop can be retried without losing the active recorder', async () => {
  let finish!: (path: string) => void;
  let stopCalls = 0;
  const controller = new RecordingController(async () => 'asset');
  await controller.start(async () => ({
    startRecording: async (callback) => {
      finish = callback;
    },
    stopRecording: async () => {
      if (++stopCalls === 1) throw new Error('Stop failed');
      finish('/documents/clip.mp4');
    },
  }));
  await assert.rejects(controller.stopCapture(), /Stop failed/);
  assert.equal(controller.getSnapshot().phase, 'recording');
  await controller.stop();
  assert.equal(stopCalls, 2);
  assert.equal(controller.getSnapshot().phase, 'saved');
});
