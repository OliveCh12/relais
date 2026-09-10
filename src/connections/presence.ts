import { signalRequest } from '../signaling/client';
import { parsePairingQr, type PairingDescriptor } from '../signaling/protocol';
import type { SavedDevice } from './model';

export async function findDevice(
  device: SavedDevice,
  server: string,
  signal: AbortSignal,
): Promise<PairingDescriptor | null> {
  const result = await signalRequest(
    server,
    `/presence/${device.pairId}/${device.id}`,
    'GET',
    signal,
    device.secret,
  );
  if (!result) return null;
  return parsePairingQr(
    JSON.stringify({ ...(result as object), kind: 'relais-spike', version: 1, server }),
  );
}

export class PresencePublisher {
  private abort = new AbortController();
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private ownId: string,
    private devices: readonly SavedDevice[],
    private descriptor: PairingDescriptor,
    private cameraToken: string,
  ) {}
  start() {
    void this.publish();
  }
  private path(device: SavedDevice) {
    return `/presence/${device.pairId}/${this.ownId}`;
  }
  private async publish() {
    await Promise.allSettled(
      this.devices.map((device) =>
        signalRequest(
          this.descriptor.server,
          this.path(device),
          'PUT',
          this.abort.signal,
          device.secret,
          {
            sessionId: this.descriptor.sessionId,
            cameraToken: this.cameraToken,
          },
        ),
      ),
    );
    if (!this.abort.signal.aborted)
      this.timer = setTimeout(() => {
        void this.publish();
      }, 4000);
  }
  stop() {
    if (this.abort.signal.aborted) return;
    this.abort.abort();
    if (this.timer) clearTimeout(this.timer);
    for (const device of this.devices)
      void signalRequest(
        this.descriptor.server,
        this.path(device),
        'DELETE',
        new AbortController().signal,
        device.secret,
      ).catch(() => {});
  }
}
