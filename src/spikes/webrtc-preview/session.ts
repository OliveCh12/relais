// Isolated getUserMedia comparison; product capture uses native outputs.
import { mediaDevices } from 'react-native-webrtc';
import { PeerSession, type PeerCallbacks } from '../../transport/PeerSession';
import { parseEcho } from './echo';

export class SpikeSession extends PeerSession {
  constructor(callbacks: PeerCallbacks) {
    super({
      ...callbacks,
      message: (text) => {
        const message = parseEcho(text);
        if (message?.type === 'rec-mock')
          this.send(JSON.stringify({ type: 'rec-mock-ack', id: message.id }));
        if (message?.type === 'rec-mock-ack') callbacks.status('Test command received.');
      },
    });
  }
  override startCamera(server: string) {
    return super.startCamera(server, () =>
      mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'environment', width: 1280, height: 720, frameRate: 30 },
      }),
    );
  }
  recMock() {
    this.send(JSON.stringify({ type: 'rec-mock', id: Date.now() }));
  }
}
