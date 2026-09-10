import { isIdentity, type DeviceIdentity, type SavedDevice } from './model';
import { validId, validToken } from '../signaling/protocol';
import type { DeviceRegistry } from './registry';

export class DeviceHandshake {
  private closed = false;
  private peer: DeviceIdentity | null = null;
  private pending: SavedDevice | null = null;
  private paired = false;
  private processing = Promise.resolve();
  constructor(
    private options: {
      registry: DeviceRegistry;
      role: 'camera' | 'monitor';
      server: string;
      expected?: SavedDevice;
      send: (text: string) => void;
      remembered: (device: SavedDevice) => void;
      error: (message: string) => void;
    },
  ) {}
  async open() {
    try {
      const identity = await this.options.registry.getIdentity();
      if (!this.closed)
        this.options.send(
          JSON.stringify({
            type: 'device-hello',
            ...identity,
            ...(this.options.expected
              ? { pairId: this.options.expected.pairId, secret: this.options.expected.secret }
              : {}),
          }),
        );
    } catch {
      this.options.error('Connected. Saving devices is unavailable in this version.');
    }
  }
  receive(text: unknown) {
    if (this.closed || typeof text !== 'string' || text.length > 1024) return;
    let value: Record<string, unknown>;
    try {
      value = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return;
    }
    if (!value || !['device-hello', 'device-pair', 'device-paired'].includes(String(value.type)))
      return;
    this.processing = this.processing
      .then(() => this.handle(value))
      .catch((error: unknown) => {
        if (!this.closed)
          this.options.error(error instanceof Error ? error.message : 'Device not saved.');
      });
  }
  private async handle(value: Record<string, unknown>) {
    if (this.closed || !isIdentity(value)) return;
    const identity = await this.options.registry.getIdentity();
    if (this.closed || value.id === identity.id) return;
    if (this.options.expected && value.id !== this.options.expected.id)
      throw new Error('This phone’s identity has changed. Scan its new QR code.');
    if (value.type === 'device-hello') {
      if (this.peer) return;
      this.peer = { id: value.id, name: value.name };
      if (this.options.role !== 'camera') return;
      const existing = this.options.registry.getSnapshot().find((item) => item.id === value.id);
      const restoring = value.pairId !== undefined || value.secret !== undefined;
      if (
        restoring &&
        (!existing || value.pairId !== existing.pairId || value.secret !== existing.secret)
      )
        throw new Error('This pairing was forgotten. Scan a new QR code.');
      const credentials =
        restoring && existing ? existing : await this.options.registry.credentials();
      if (this.closed) return;
      const device = await this.options.registry.remember({
        ...this.peer,
        pairId: credentials.pairId,
        secret: credentials.secret,
        server: this.options.server,
        lastConnectedAt: Date.now(),
      });
      if (this.closed) return;
      this.options.send(
        JSON.stringify({
          type: 'device-pair',
          ...identity,
          pairId: device.pairId,
          secret: device.secret,
        }),
      );
      this.pending = device;
    } else if (
      this.options.role === 'monitor' &&
      !this.paired &&
      this.peer?.id === value.id &&
      validId(value.pairId) &&
      validToken(value.secret)
    ) {
      if (
        this.options.expected &&
        (value.pairId !== this.options.expected.pairId ||
          value.secret !== this.options.expected.secret)
      )
        throw new Error('This pairing has changed. Scan the phone’s new QR code.');
      const device = await this.options.registry.remember({
        ...this.peer,
        pairId: value.pairId,
        secret: value.secret,
        server: this.options.server,
        lastConnectedAt: Date.now(),
      });
      if (!this.closed) {
        this.paired = true;
        this.options.send(
          JSON.stringify({ type: 'device-paired', ...identity, pairId: device.pairId }),
        );
        this.options.remembered(device);
      }
    } else if (
      value.type === 'device-paired' &&
      this.options.role === 'camera' &&
      this.pending?.id === value.id &&
      this.pending.pairId === value.pairId &&
      !this.paired
    ) {
      this.paired = true;
      this.options.remembered(this.pending);
    }
  }
  close() {
    this.closed = true;
  }
}
