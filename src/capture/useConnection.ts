import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';
import { appPreferences, detectedServer, usePreferences } from '@/preferences/usePreferences';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { PeerSession } from '../transport/PeerSession';
import { openNativePreview, type MediaStream } from '../transport/native/media';
import { deviceRegistry } from '../connections/storage';
import type { SavedDevice } from '../connections/model';
import type { LinkSample } from '../connections/quality';
import { type PairingDescriptor } from '../signaling/protocol';
import { CommandHost } from './CommandHost';
import { previewSettings } from './RemoteSettingsQueue';
import { RemoteCommandClient } from './RemoteCommandClient';
import { parseCaptureState, parseMessage, type CaptureAction, type CaptureState } from './protocol';

export function useConnection(
  role: 'camera' | 'monitor',
  camera?: {
    state: CaptureState;
    perform: (action: CaptureAction) => Promise<unknown>;
  },
) {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const preferences = usePreferences();
  const [fallbackServer, setFallbackServer] = useState(detectedServer);
  const server = preferences.value.server || fallbackServer;
  const setServer = useCallback((server: string) => appPreferences.update({ server }), []);
  const [active, setActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Open Camera on your other phone.');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [qr, setQr] = useState<PairingDescriptor | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [device, setDevice] = useState<SavedDevice | null>(null);
  const [quality, setQuality] = useState<LinkSample | null>(null);
  const [remote, updateRemote] = useState<CaptureState | null>(null);
  const remoteRef = useRef<CaptureState | null>(null);
  const remoteSignature = useRef('null');
  const setRemote = useCallback((state: CaptureState | null) => {
    const signature = JSON.stringify(state);
    if (signature === remoteSignature.current) return;
    remoteSignature.current = signature;
    remoteRef.current = state;
    updateRemote(state);
  }, []);
  const [retry, setRetry] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAt = useRef(0);
  const session = useRef<PeerSession | null>(null);
  const generation = useRef(0);
  const cameraRef = useRef(camera);
  const trusted = useRef(false);
  const lastState = useRef('');
  const metricsEnabled = useRef(false);
  const [commands] = useState(() => new RemoteCommandClient());
  useLayoutEffect(() => {
    commands.configure(
      () => remoteRef.current,
      (text) => {
        if (!trusted.current || !session.current) throw new Error('Connect to your camera first.');
        session.current.send(text);
      },
      setRemote,
    );
  }, [commands, setRemote]);
  const commandSnapshot = useSyncExternalStore(commands.subscribe, commands.getSnapshot);
  const settingsSnapshot = commands.settings.getSnapshot();

  const publish = useCallback(() => {
    if (!cameraRef.current || !trusted.current || !session.current) return;
    const text = JSON.stringify({ type: 'capture-state', state: cameraRef.current.state });
    if (text === lastState.current) return;
    try {
      session.current.send(text);
      lastState.current = text;
    } catch {}
  }, []);
  useEffect(() => {
    cameraRef.current = camera;
    publish();
  }, [camera, publish]);

  const stop = useCallback(() => {
    generation.current += 1;
    commands.reset();
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    session.current?.dispose();
    session.current = null;
    trusted.current = false;
    lastState.current = '';
    setActive(false);
    setConnected(false);
    setQr(null);
    setStream(null);
    setDevice(null);
    setRemote(null);
    setQuality(null);
    setConnectionError(null);
  }, [setRemote, commands]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') stop();
      if (state !== 'inactive') setForeground(state === 'active');
    });
    void deviceRegistry
      .load()
      .then(() => {
        setFallbackServer((current) => current || deviceRegistry.getSnapshot()[0]?.server || '');
      })
      .catch(() => {});
    return () => {
      subscription.remove();
      stop();
    };
  }, [stop]);
  useFocusEffect(useCallback(() => () => stop(), [stop]));

  const start = useCallback(
    async (descriptor?: PairingDescriptor, expected?: SavedDevice) => {
      stop();
      const current = generation.current;
      const isCurrent = () => generation.current === current;
      const host = new CommandHost(async (action) => {
        if (!isCurrent() || !trusted.current || !cameraRef.current)
          throw new Error('Camera is no longer connected.');
        return cameraRef.current.perform(action);
      });
      setActive(true);
      const close = (reason?: string) => {
        if (!isCurrent()) return;
        stop();
        setStatus(reason || 'Connection lost. Open Camera on your other phone to reconnect.');
        setConnectionError(
          reason || 'Connection lost. Open Camera on your other phone to reconnect.',
        );
        retryAt.current = Date.now() + 3000;
        retryTimer.current = setTimeout(() => setRetry((value) => value + 1), 3000);
      };
      try {
        const peer = new PeerSession(
          {
            closed: close,
            status: (value) => {
              if (isCurrent()) setStatus(value);
            },
            stream: (value) => {
              if (isCurrent()) setStream(value);
            },
            qr: (value) => {
              if (isCurrent()) setQr(value);
            },
            channel: () => {},
            trusted: (value) => {
              if (!isCurrent()) return;
              trusted.current = value;
              setConnected(value);
              if (value) {
                lastState.current = '';
                publish();
              }
            },
            remembered: (value) => {
              if (isCurrent()) setDevice(value);
            },
            quality: (value) => {
              if (isCurrent()) setQuality(value);
            },
            rtt: () => {},
            stats: () => {},
            message: (text) => {
              if (!isCurrent() || !trusted.current) return;
              const message = parseMessage(text);
              if (!message) return;
              if (role === 'camera') {
                void host.receive(text, trusted.current).then((reply) => {
                  if (reply && isCurrent()) {
                    try {
                      peer.send(JSON.stringify(reply));
                    } catch {}
                  }
                });
              } else if (message.type === 'capture-state') {
                const state = parseCaptureState(message.state);
                if (state) setRemote(state);
              } else commands.receive(message);
            },
          },
          { metrics: metricsEnabled.current, previewBitrate: 8_000_000 },
        );
        session.current = peer;
        if (descriptor) await peer.startMonitor(descriptor, expected);
        else await peer.startCamera(server, openNativePreview);
      } catch (error) {
        if (!isCurrent()) return;
        close();
        setStatus(error instanceof Error ? error.message : 'Could not connect. Try again.');
        setConnectionError(
          error instanceof Error ? error.message : 'Could not connect. Try again.',
        );
      }
    },
    [publish, role, server, stop, setRemote, commands],
  );

  useEffect(() => {
    if (
      role === 'camera' &&
      preferences.loaded &&
      focused &&
      foreground &&
      camera?.state.ready &&
      camera.state.canShare &&
      server &&
      !active &&
      !session.current &&
      Date.now() >= retryAt.current
    )
      void start();
  }, [
    role,
    focused,
    foreground,
    camera?.state.ready,
    camera?.state.canShare,
    preferences.loaded,
    server,
    active,
    retry,
    start,
  ]);

  const getEpoch = useCallback(() => generation.current, []);
  const getRemote = useCallback(() => remoteRef.current, []);
  const diagnostics = useCallback(() => session.current?.diagnostics(), []);
  const setMetricsEnabled = useCallback((enabled: boolean) => {
    metricsEnabled.current = enabled;
    session.current?.setMetricsEnabled(enabled);
  }, []);

  return {
    diagnostics,
    setMetricsEnabled,
    error: connectionError,
    server,
    setServer,
    status,
    active,
    connected,
    qr,
    stream,
    device,
    quality,
    remote,
    getRemote,
    getEpoch,
    sending: commandSnapshot.sending,
    priorityPending: commandSnapshot.priorityPending,
    settingsPending: settingsSnapshot.pending,
    settingsPreview: previewSettings(remote, settingsSnapshot),
    focused: focused && foreground,
    start,
    stop,
    command: commands.command,
  };
}
