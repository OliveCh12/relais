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
import { deviceRegistry } from '../../connections/storage';
import { DeviceHandshake } from '../../connections/handshake';
import { PresencePublisher } from '../../connections/presence';
import type { SavedDevice } from '../../connections/model';
import type { LinkSample } from '../../connections/quality';

interface Callbacks {
  status: (value: string) => void;
  stream: (stream: MediaStream | null) => void;
  channel: (open: boolean) => void;
  rtt: (value: number) => void;
  stats: (value: { fps: number | null; kbps: number | null }) => void;
  qr: (value: PairingDescriptor) => void;
  remembered?: (value: SavedDevice) => void;
  quality?: (value: LinkSample | null) => void;
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
  private handshake: DeviceHandshake | null = null;
  private publisher: PresencePublisher | null = null;
  private lastPackets: { received: number; lost: number } | null = null;
  private lastPingAt = 0;
  private lastPong: { rtt: number; time: number } | null = null;
  private pingStalled = false;

  constructor(private readonly callbacks: Callbacks) {
    this.peer.addEventListener('connectionstatechange', () => {
      if (this.abort.signal.aborted) return;
      callbacks.status(
        this.peer.connectionState === 'connected'
          ? 'Both phones are connected.'
          : 'Connecting to the other phone…',
      );
      if (['failed', 'disconnected'].includes(this.peer.connectionState)) {
        this.dispose();
        callbacks.status('Connection lost. Restart sharing on the Camera phone.');
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
    if (this.abort.signal.aborted) throw new Error('Session closed.');
  }

  private attachChannel(channel: RTCDataChannel) {
    if (this.abort.signal.aborted) {
      channel.close();
      return;
    }
    this.channel = channel;
    const update = () => {
      if (this.abort.signal.aborted) return;
      this.callbacks.channel(channel.readyState === 'open');
      if (channel.readyState === 'open') {
        this.publisher?.stop();
        void this.handshake?.open();
      }
    };
    channel.addEventListener('open', update);
    channel.addEventListener('close', update);
    update();
    channel.addEventListener('message', ({ data }) => {
      if (this.abort.signal.aborted) return;
      this.handshake?.receive(data);
      const message = parseEcho(data);
      if (!message || channel.readyState !== 'open') return;
      if (message.type === 'ping') channel.send(JSON.stringify({ type: 'pong', id: message.id }));
      if (message.type === 'rec-mock')
        channel.send(JSON.stringify({ type: 'rec-mock-ack', id: message.id }));
      if (message.type === 'pong' && message.id === this.pendingPing?.id) {
        const rtt = performance.now() - this.pendingPing.start;
        this.lastPong = { rtt, time: performance.now() };
        this.pingStalled = false;
        this.callbacks.rtt(rtt);
        this.pendingPing = null;
      }
      if (message.type === 'rec-mock-ack') this.callbacks.status('Test command received.');
    });
  }

  private prepareHandshake(role: 'camera' | 'monitor', server: string, expected?: SavedDevice) {
    this.handshake = new DeviceHandshake({
      role,
      server,
      ...(expected ? { expected } : {}),
      registry: deviceRegistry,
      send: (text) => {
        if (this.channel?.readyState === 'open') this.channel.send(text);
      },
      remembered: (device) => this.callbacks.remembered?.(device),
      error: (message) => this.callbacks.status(message),
    });
  }

  private async gatheredDescription(type: 'offer' | 'answer') {
    const deadline = Date.now() + 10_000;
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.abort.signal.aborted || Date.now() > deadline) {
          finish();
          reject(new Error('Connection is taking too long. Check Wi-Fi and try again.'));
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
    this.prepareHandshake('camera', server);
    this.callbacks.status('Opening camera…');
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
    const descriptor: PairingDescriptor = {
      kind: 'relais-spike',
      version: 1,
      server,
      sessionId: session.sessionId,
      token: session.monitorToken,
      expiresAt: session.expiresAt,
    };
    this.callbacks.qr(descriptor);
    try {
      const identity = await deviceRegistry.getIdentity();
      this.assertActive();
      this.publisher = new PresencePublisher(
        identity.id,
        deviceRegistry.getSnapshot(),
        descriptor,
        session.cameraToken,
      );
      this.publisher.start();
    } catch {
      this.assertActive();
    }
    this.callbacks.status('Ready to connect from your device list or with this QR code.');
    const answer = await pollDescription(
      server,
      session.sessionId,
      session.cameraToken,
      'answer',
      this.abort.signal,
      Math.max(0, session.expiresAt - Date.now()),
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
        this.callbacks.status('Preview quality adjusts automatically.');
      }
    }
    this.startMetrics();
  }

  async startMonitor(descriptor: PairingDescriptor, expected?: SavedDevice) {
    this.prepareHandshake('monitor', descriptor.server, expected);
    this.callbacks.status('Connecting to the camera…');
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
    const now = performance.now();
    const pingTimedOut = !!this.pendingPing && now - this.pendingPing.start > 4000;
    if (pingTimedOut) {
      this.pendingPing = null;
      this.pingStalled = true;
    }
    if (!this.pendingPing && now - this.lastPingAt > 2000) this.ping();
    this.statsBusy = true;
    try {
      const report: Map<string, Record<string, unknown>> = await this.peer.getStats();
      if (this.abort.signal.aborted) return;
      const sample: LinkSample = {
        rtt: this.pingStalled
          ? 4000
          : this.lastPong && now - this.lastPong.time < 6000
            ? this.lastPong.rtt
            : null,
        loss: null,
        jitter: null,
      };
      for (const value of report.values()) {
        if (
          sample.rtt === null &&
          value.type === 'candidate-pair' &&
          value.state === 'succeeded' &&
          (value.nominated === true || value.selected === true) &&
          typeof value.currentRoundTripTime === 'number'
        )
          sample.rtt = value.currentRoundTripTime * 1000;
        if (value.type !== 'inbound-rtp' || (value.kind !== 'video' && value.mediaType !== 'video'))
          continue;
        if (typeof value.jitter === 'number') sample.jitter = value.jitter;
        if (typeof value.packetsLost === 'number' && typeof value.packetsReceived === 'number') {
          const previous = this.lastPackets;
          const received = value.packetsReceived;
          const lost = value.packetsLost;
          if (previous && received >= previous.received && lost >= previous.lost) {
            const total = received - previous.received + lost - previous.lost;
            if (total > 0) sample.loss = (lost - previous.lost) / total;
          }
          this.lastPackets = { received, lost };
        }
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
      this.callbacks.quality?.(sample);
    } catch {
      if (!this.abort.signal.aborted) this.callbacks.quality?.(null);
    } finally {
      this.statsBusy = false;
    }
  }

  async diagnostics() {
    this.assertActive();
    const report: Map<string, Record<string, unknown>> = await this.peer.getStats();
    return {
      connectionState: this.peer.connectionState,
      iceConnectionState: this.peer.iceConnectionState,
      reports: Array.from(report.values()),
    };
  }

  ping() {
    if (this.channel?.readyState !== 'open') return;
    this.pendingPing = { id: ++this.sequence, start: performance.now() };
    this.lastPingAt = this.pendingPing.start;
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
    this.handshake?.close();
    this.publisher?.stop();
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    this.metricsTimer = null;
    this.channel?.close();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream?.release();
    this.stream = null;
    this.peer.close();
    this.pendingPing = null;
    this.callbacks.channel(false);
    this.callbacks.quality?.(null);
    this.callbacks.stream(null);
    this.deleteSession();
  }
}
