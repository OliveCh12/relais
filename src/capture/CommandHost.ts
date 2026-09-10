import {
  parseMessage,
  parseRequest,
  parseCaptureState,
  type CaptureAction,
  type CaptureReply,
} from './protocol';

export class CommandHost {
  private lastSequence = 0;
  private requests = new Map<string, { action: string; result: Promise<CaptureReply> }>();
  constructor(private perform: (action: CaptureAction) => Promise<unknown>) {}
  receive(text: unknown, trusted: boolean): Promise<CaptureReply | null> {
    if (!trusted) return Promise.resolve(null);
    const value = parseMessage(text);
    const request = value && parseRequest(value);
    if (!request) return Promise.resolve(null);
    const identity = JSON.stringify(request.action);
    const previous = this.requests.get(request.id);
    if (previous)
      return previous.action === identity
        ? previous.result
        : Promise.resolve({
            type: 'capture-reply',
            id: request.id,
            ok: false,
            error: 'This command was already used.',
          });
    if (request.sequence <= this.lastSequence)
      return Promise.resolve({
        type: 'capture-reply',
        id: request.id,
        ok: false,
        error: 'This command has expired.',
      });
    this.lastSequence = request.sequence;
    if (this.requests.size >= 128) this.requests.delete(this.requests.keys().next().value!);
    const result = Promise.resolve()
      .then(() => this.perform(request.action))
      .then<CaptureReply, CaptureReply>(
        (result) => {
          const state = parseCaptureState(result);
          return { type: 'capture-reply', id: request.id, ok: true, ...(state ? { state } : {}) };
        },
        (error: unknown) => ({
          type: 'capture-reply',
          id: request.id,
          ok: false,
          error:
            error instanceof Error ? error.message : 'The camera could not complete this action.',
        }),
      );
    this.requests.set(request.id, { action: identity, result });
    return result;
  }
}
