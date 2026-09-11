export type NameWriteState = { status: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

/** Serializes edits and coalesces blur + keyboard Done into one durable write. */
export class NameWriter {
  private requested: string;
  private draft: string;
  private committed: string;
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;

  constructor(
    initial: string,
    private readonly write: (name: string) => Promise<void>,
    private readonly publish: (state: NameWriteState) => void,
    private readonly validate = (value: string): string | undefined =>
      !value || value.length > 60 ? 'Use a name between 1 and 60 characters.' : undefined,
  ) {
    this.draft = this.requested = this.committed = initial;
  }

  edit(input: string) {
    this.draft = input;
  }
  commit() {
    return this.save(this.draft);
  }

  save(input: string): Promise<void> {
    const name = input.trim();
    const message = this.validate(name);
    if (message) {
      this.generation += 1;
      this.requested = this.committed;
      this.publish({ status: 'error', message });
      return this.queue;
    }
    if (name === this.requested) return this.queue;
    this.requested = name;
    const generation = ++this.generation;
    this.publish({ status: 'saving' });
    this.queue = this.queue.then(async () => {
      try {
        if (name !== this.committed) await this.write(name);
        this.committed = name;
        if (generation === this.generation) this.publish({ status: 'saved' });
      } catch (error) {
        if (generation !== this.generation) return;
        this.requested = this.committed;
        this.publish({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not save this value. Try again.',
        });
      }
    });
    return this.queue;
  }
}
