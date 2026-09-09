// THROW AWAY — not the product camera pipeline
// The only allowed getUserMedia owner. No recording and no product engine imports.
import { mediaDevices, MediaStream, RTCPeerConnection, RTCRtpSender } from 'react-native-webrtc';
import type RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel';
import { createSession, pollDescription, signalRequest } from '../../signaling/client';
import {
  parseDescription,
  privateLanOrigin,
  type PairingDescriptor,
} from '../../signaling/protocol';
import { parseEcho } from './echo';

interface Callbacks {
  status: (value: string) => void;
  stream: (stream: MediaStream | null) => void;
  channel: (open: boolean) => void;
  rtt: (value: number) => void;
  stats: (value: { fps: number | null; kbps: number | null }) => void;
  qr: (value: PairingDescriptor) => void;
}

export class SpikeSession {
  private readonly abort = new AbortController();
  private readonly peer = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle' });
  private stream: MediaStream | null = null;
  private channel: RTCDataChannel | null = null;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private gatheringTimer: ReturnType<typeof setInterval> | null = null;
  private pendingPing: { id: number; start: number } | null = null;
  private sequence = 0;
  private cleanupSession: { server: string; sessionId: string; token: string } | null = null;
  private lastStats: { frames: number; bytes: number; time: number } | null = null;
  private statsBusy = false;

  constructor(private readonly callbacks: Callbacks) {
    this.peer.addEventListener('connectionstatechange', () => {
      if (this.abort.signal.aborted) return;
      callbacks.status(`WebRTC : ${this.peer.connectionState}`);
      if (['failed', 'disconnected'].includes(this.peer.connectionState)) {
        this.dispose();
        callbacks.status('Connexion perdue. Créez une nouvelle session de spike.');
      }
    });
    this.peer.addEventListener('track', (event) => {
      if (this.abort.signal.aborted) return;
      if (!event.track) return;
      this.stream = event.streams[0] ?? new MediaStream([event.track]);
      callbacks.stream(this.stream);
    });
    this.peer.addEventListener('datachannel', (event) => this.attachChannel(event.channel));
  }

  private assertActive() {
    if (this.abort.signal.aborted) throw new Error('Session fermée.');
  }

  private attachChannel(channel: RTCDataChannel) {
    if (this.abort.signal.aborted) {
      channel.close();
      return;
    }
    this.channel = channel;
    const update = () => {
      if (!this.abort.signal.aborted) this.callbacks.channel(channel.readyState === 'open');
    };
    channel.addEventListener('open', update);
    channel.addEventListener('close', update);
    update();
    channel.addEventListener('message', ({ data }) => {
      if (this.abort.signal.aborted) return;
      const message = parseEcho(data);
      if (!message || channel.readyState !== 'open') return;
      if (message.type === 'ping') channel.send(JSON.stringify({ type: 'pong', id: message.id }));
      if (message.type === 'rec-mock')
        channel.send(JSON.stringify({ type: 'rec-mock-ack', id: message.id }));
      if (message.type === 'pong' && message.id === this.pendingPing?.id) {
        this.callbacks.rtt(performance.now() - this.pendingPing.start);
        this.pendingPing = null;
      }
      if (message.type === 'rec-mock-ack')
        this.callbacks.status('rec-mock reçu et confirmé · aucun enregistrement');
    });
  }

  private async gatheredDescription(type: 'offer' | 'answer') {
    const deadline = Date.now() + 10_000;
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.abort.signal.aborted || Date.now() > deadline) {
          finish();
          reject(new Error('Collecte ICE interrompue ou expirée.'));
        } else if (this.peer.iceGatheringState === 'complete') {
          finish();
          resolve();
        }
      };
      const finish = () => {
        if (this.gatheringTimer) clearInterval(this.gatheringTimer);
        this.gatheringTimer = null;
        this.abort.signal.removeEventListener('abort', check);
      };
      this.gatheringTimer = setInterval(check, 100);
      this.abort.signal.addEventListener('abort', check, { once: true });
      check();
    });
    this.assertActive();
    return parseDescription(this.peer.localDescription, type);
  }

  async startCamera(serverInput: string) {
    const server = privateLanOrigin(serverInput);
    this.callbacks.status('Autorisation caméra et ouverture du capteur…');
    const stream = await mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'environment', width: 1280, height: 720, frameRate: 30 },
    });
    if (this.abort.signal.aborted) {
      stream.getTracks().forEach((track) => track.stop());
      stream.release();
      this.assertActive();
    }
    this.stream = stream;
    this.callbacks.stream(stream);
    for (const track of stream.getVideoTracks()) this.peer.addTrack(track, stream);
    this.attachChannel(this.peer.createDataChannel('relais-spike', { ordered: true }));
    const codecs = RTCRtpSender.getCapabilities('video').codecs;
    const preferred = [
      ...codecs.filter((codec) => codec.mimeType.toLowerCase() === 'video/h264'),
      ...codecs.filter((codec) => codec.mimeType.toLowerCase() !== 'video/h264'),
    ];
    for (const transceiver of this.peer.getTransceivers())
      transceiver.setCodecPreferences(preferred);
    await this.peer.setLocalDescription(await this.peer.createOffer());
    const offer = await this.gatheredDescription('offer');
    const session = await createSession(server, this.abort.signal);
    this.cleanupSession = { server, sessionId: session.sessionId, token: session.cameraToken };
    if (this.abort.signal.aborted) {
      this.deleteSession();
      this.assertActive();
    }
    await signalRequest(
      server,
      `/sessions/${session.sessionId}/offer`,
      'PUT',
      this.abort.signal,
      session.cameraToken,
      offer,
    );
    this.assertActive();
    this.callbacks.qr({
      kind: 'relais-spike',
      version: 1,
      server,
      sessionId: session.sessionId,
      token: session.monitorToken,
      expiresAt: session.expiresAt,
    });
    this.callbacks.status('QR prêt. Scannez-le sur le Moniteur.');
    const answer = await pollDescription(
      server,
      session.sessionId,
      session.cameraToken,
      'answer',
      this.abort.signal,
    );
    this.assertActive();
    await this.peer.setRemoteDescription(answer);
    for (const sender of this.peer.getSenders()) {
      if (sender.track?.kind !== 'video') continue;
      const parameters = sender.getParameters();
      for (const encoding of parameters.encodings) {
        encoding.maxBitrate = 2_500_000;
        encoding.maxFramerate = 30;
      }
      try {
        await sender.setParameters(parameters);
      } catch {
        this.callbacks.status('Limite bitrate non appliquée par WebRTC — vérifier les stats.');
      }
    }
    this.startMetrics();
  }

  async startMonitor(descriptor: PairingDescriptor) {
    this.callbacks.status('Récupération de l’offre LAN…');
    const offer = await pollDescription(
      descriptor.server,
      descriptor.sessionId,
      descriptor.token,
      'offer',
      this.abort.signal,
    );
    this.assertActive();
    await this.peer.setRemoteDescription(offer);
    await this.peer.setLocalDescription(await this.peer.createAnswer());
    const answer = await this.gatheredDescription('answer');
    await signalRequest(
      descriptor.server,
      `/sessions/${descriptor.sessionId}/answer`,
      'PUT',
      this.abort.signal,
      descriptor.token,
      answer,
    );
    this.assertActive();
    this.startMetrics();
  }

  private startMetrics() {
    this.assertActive();
    this.metricsTimer = setInterval(() => {
      void this.readMetrics();
    }, 1000);
  }

  private async readMetrics() {
    if (this.statsBusy || this.abort.signal.aborted) return;
    this.statsBusy = true;
    try {
      const report: Map<string, Record<string, unknown>> = await this.peer.getStats();
      if (this.abort.signal.aborted) return;
      for (const value of report.values()) {
        if (value.type !== 'inbound-rtp' || (value.kind !== 'video' && value.mediaType !== 'video'))
          continue;
        const frames = typeof value.framesDecoded === 'number' ? value.framesDecoded : null;
        const bytes = typeof value.bytesReceived === 'number' ? value.bytesReceived : null;
        const time = performance.now();
        const previous = this.lastStats;
        const seconds = previous ? (time - previous.time) / 1000 : 0;
        this.callbacks.stats({
          fps:
            typeof value.framesPerSecond === 'number'
              ? value.framesPerSecond
              : previous && frames !== null && seconds > 0
                ? Math.max(0, (frames - previous.frames) / seconds)
                : null,
          kbps:
            previous && bytes !== null && seconds > 0
              ? Math.max(0, ((bytes - previous.bytes) * 8) / seconds / 1000)
              : null,
        });
        if (frames !== null && bytes !== null) this.lastStats = { frames, bytes, time };
      }
    } catch {
      if (!this.abort.signal.aborted)
        this.callbacks.status('Stats WebRTC indisponibles sur ce device.');
    } finally {
      this.statsBusy = false;
    }
  }

  ping() {
    if (this.channel?.readyState !== 'open') return;
    this.pendingPing = { id: ++this.sequence, start: performance.now() };
    this.channel.send(JSON.stringify({ type: 'ping', id: this.sequence }));
  }

  recMock() {
    if (this.channel?.readyState === 'open')
      this.channel.send(JSON.stringify({ type: 'rec-mock', id: ++this.sequence }));
  }

  private deleteSession() {
    const session = this.cleanupSession;
    this.cleanupSession = null;
    if (session)
      void signalRequest(
        session.server,
        `/sessions/${session.sessionId}`,
        'DELETE',
        new AbortController().signal,
        session.token,
      ).catch(() => {});
  }

  dispose() {
    if (this.abort.signal.aborted) return;
    this.abort.abort();
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    this.metricsTimer = null;
    this.channel?.close();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream?.release();
    this.stream = null;
    this.peer.close();
    this.pendingPing = null;
    this.callbacks.channel(false);
    this.callbacks.stream(null);
    this.deleteSession();
  }
}
