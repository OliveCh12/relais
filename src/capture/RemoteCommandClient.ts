import { RemoteSettingsQueue, settingsChange } from './RemoteSettingsQueue';
import { parseCaptureState, type CaptureAction, type CaptureState } from './protocol';

export class CommandSupersededError extends Error {
  constructor() {
    super('Pending camera adjustments were cancelled by Stop.');
    this.name = 'CommandSupersededError';
  }
}

const priority = (action: CaptureAction) => action === 'stop' || action === 'cancel-timer';

export class RemoteCommandClient {
  readonly settings: RemoteSettingsQueue;
  private sequence = 0;
  private listeners = new Set<() => void>();
  private snapshot = { sending: false, priorityPending: false };
  private pending: {
    id: string;
    action: CaptureAction;
    promise: Promise<CaptureState | null>;
    resolve: (state: CaptureState | null) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  constructor(
    private getState: () => CaptureState | null = () => null,
    private send: (text: string) => void = () => {
      throw new Error('Connect to your camera first.');
    },
    private updateState: (state: CaptureState) => void = () => {},
  ) {
    this.settings = new RemoteSettingsQueue(() => this.getState(), this.sendCommand);
    this.settings.subscribe(() => this.publish());
  }

  configure(
    getState: typeof this.getState,
    send: typeof this.send,
    updateState: typeof this.updateState,
  ) {
    this.getState = getState;
    this.send = send;
    this.updateState = updateState;
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish() {
    this.snapshot = {
      sending: !!this.pending || this.settings.getSnapshot().pending,
      priorityPending: !!this.pending && priority(this.pending.action),
    };
    this.listeners.forEach((listener) => listener());
  }
  private clearPending() {
    const request = this.pending;
    this.pending = null;
    if (request) clearTimeout(request.timer);
    return request;
  }
  reset(error = new Error('Connection closed. Check your capture on the camera phone.')) {
    this.clearPending()?.reject(error);
    this.settings.reset(error);
    this.publish();
  }

  command = (action: CaptureAction): Promise<CaptureState | null> => {
    if (priority(action)) {
      // Repeated taps await the same save; they never send another native Stop.
      if (this.pending?.action === action) return this.pending.promise;
      const phase = this.getState()?.phase;
      if (action === 'stop' ? phase !== 'recording' && phase !== 'starting' : phase !== 'countdown')
        return Promise.reject(new Error('There is no active capture to stop.'));
      this.reset(new CommandSupersededError());
      return this.sendCommand(action);
    }
    const change = settingsChange(action);
    if (change) {
      if (this.pending && !this.settings.getSnapshot().pending)
        return Promise.reject(new Error('Wait for the capture to finish.'));
      return this.settings.enqueue(change);
    }
    if (this.settings.getSnapshot().pending)
      return Promise.reject(new Error('Wait for camera settings to finish applying.'));
    return this.sendCommand(action);
  };

  private sendCommand = (action: CaptureAction): Promise<CaptureState | null> => {
    if (this.pending) return Promise.reject(new Error('Wait for the camera to respond.'));
    const sequence = ++this.sequence;
    const id = `capture-${sequence}`;
    let resolve!: (state: CaptureState | null) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<CaptureState | null>((accept, fail) => {
      resolve = accept;
      reject = fail;
    });
    const timer = setTimeout(() => {
      if (this.pending?.id !== id) return;
      this.clearPending();
      this.publish();
      reject(new Error('The camera has not confirmed this action. Check it before trying again.'));
    }, 95_000);
    this.pending = { id, action, promise, resolve, reject, timer };
    this.publish();
    try {
      this.send(JSON.stringify({ type: 'capture-command', id, sequence, action }));
    } catch (error) {
      this.clearPending();
      this.publish();
      reject(error);
    }
    return promise;
  };

  receive(message: Record<string, unknown>) {
    if (message.type !== 'capture-reply' || message.id !== this.pending?.id) return;
    const request = this.clearPending();
    if (!request) return;
    this.publish();
    if (message.ok !== true) {
      request.reject(
        new Error(
          typeof message.error === 'string' ? message.error : 'Capture failed on the other phone.',
        ),
      );
      return;
    }
    const state = parseCaptureState(message.state);
    if (state) this.updateState(state);
    if (!state && settingsChange(request.action))
      request.reject(new Error('The camera has not confirmed its settings. Please reconnect.'));
    else request.resolve(state ?? this.getState());
  }
}
