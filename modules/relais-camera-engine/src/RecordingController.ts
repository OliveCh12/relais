export type RecordingPhase =
  'idle' | 'starting' | 'recording' | 'stopping' | 'saving' | 'saved' | 'pending' | 'error';

export interface RecordingState {
  phase: RecordingPhase;
  startedAt: number | null;
  message: string;
  pendingPath: string | null;
}

export interface NativeRecorder {
  startRecording(finished: (path: string) => void, failed: (error: Error) => void): Promise<void>;
  stopRecording(): Promise<void>;
}

export class RecordingController {
  private state: RecordingState = {
    phase: 'idle',
    startedAt: null,
    message: '',
    pendingPath: null,
  };
  private listeners = new Set<() => void>();
  private recorder: NativeRecorder | null = null;
  private starting: Promise<void> | null = null;
  private completion: Promise<void> = Promise.resolve();
  private complete: () => void = () => {};

  constructor(private readonly save: (path: string) => Promise<string>) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(change: Partial<RecordingState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((listener) => listener());
  }

  start(create: () => Promise<NativeRecorder>): Promise<void> {
    if (!['idle', 'saved', 'error'].includes(this.state.phase)) return Promise.resolve();
    this.update({ phase: 'starting', message: 'Preparing…', startedAt: null, pendingPath: null });
    this.completion = new Promise((resolve) => {
      this.complete = resolve;
    });
    this.starting = this.begin(create);
    return this.starting;
  }

  private async begin(create: () => Promise<NativeRecorder>) {
    try {
      this.recorder = await create();
      await this.recorder.startRecording(
        (path) => {
          void this.finish(path);
        },
        (error) => this.fail(error),
      );
      if (this.state.phase === 'starting') {
        this.update({ phase: 'recording', startedAt: Date.now(), message: 'Recording' });
      }
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown) {
    this.recorder = null;
    this.update({
      phase: 'error',
      startedAt: null,
      message: error instanceof Error ? error.message : 'Recording interrupted.',
    });
    this.complete();
  }

  private async finish(path: string) {
    this.recorder = null;
    this.update({
      phase: 'saving',
      startedAt: null,
      pendingPath: path,
      message: 'Adding to gallery…',
    });
    try {
      await this.save(path);
      this.update({ phase: 'saved', pendingPath: null, message: 'Video added to gallery' });
    } catch (error) {
      this.update({
        phase: 'pending',
        message:
          error instanceof Error
            ? error.message
            : 'Your video is still in Relais. Try adding it to the gallery again.',
      });
    } finally {
      this.complete();
    }
  }

  async stop(): Promise<void> {
    await this.starting;
    if (this.state.phase === 'recording' && this.recorder) {
      this.update({ phase: 'stopping', message: 'Finishing recording…' });
      try {
        await this.recorder.stopRecording();
      } catch (error) {
        this.update({ phase: 'recording', message: 'Could not stop recording. Try again.' });
        throw error;
      }
    }
    await this.completion;
  }

  async retrySave() {
    if (this.state.phase === 'pending' && this.state.pendingPath)
      await this.finish(this.state.pendingPath);
  }
}
