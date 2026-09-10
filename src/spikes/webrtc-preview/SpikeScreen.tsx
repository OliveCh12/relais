// THROW AWAY — not the product camera pipeline
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { RTCView, type MediaStream } from 'react-native-webrtc';
import { ConnectionSheet } from './ConnectionSheet';
import type { ConnectionPanel } from './ConnectionSheet.types';
import { ActionButton as Button } from '../../components/ActionButton';
import { CameraIconButton } from '../../components/CameraIconButton';
import { QrScanner } from '../../components/QrScanner';
import { parsePairingQr, type PairingDescriptor } from '../../signaling/protocol';
import { SpikeSession } from './session';
import { DeviceList, DeviceDetails } from '../../components/DeviceList';
import { ConnectionQuality } from '../../components/ConnectionQuality';
import { useDevices, type DeviceRow } from '../../connections/useDevices';
import { deviceRegistry } from '../../connections/storage';
import { findDevice } from '../../connections/presence';
import type { SavedDevice } from '../../connections/model';
import type { LinkSample } from '../../connections/quality';

export default function SpikeScreen() {
  useKeepAwake();
  const [server, setServer] = useState(() => {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    return host ? `http://${host}:8787` : '';
  });
  const [status, setStatus] = useState('Connect both phones to the same Wi-Fi network.');
  const [panel, setPanel] = useState<ConnectionPanel | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [fill, setFill] = useState(false);
  const insets = useSafeAreaInsets();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [qr, setQr] = useState<PairingDescriptor | null>(null);
  const [channelOpen, setChannelOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [focused, setFocused] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceRow | null>(null);
  const [rememberedDevice, setRememberedDevice] = useState<SavedDevice | null>(null);
  const [quality, setQuality] = useState<LinkSample | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pendingQr, setPendingQr] = useState<PairingDescriptor | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [stats, setStats] = useState<{ fps: number | null; kbps: number | null }>({
    fps: null,
    kbps: null,
  });
  const session = useRef<SpikeSession | null>(null);
  const generation = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);
  const devices = useDevices(server, focused && !active && !scanning);

  const stop = useCallback(() => {
    generation.current += 1;
    lookupAbort.current?.abort();
    lookupAbort.current = null;
    session.current?.dispose();
    session.current = null;
    setActive(false);
    setStream(null);
    setQr(null);
    setChannelOpen(false);
    setScanning(false);
    setPanel(null);
    setPanelError(null);
    setPendingQr(null);
    setRtt(null);
    setStats({ fps: null, kbps: null });
    setQuality(null);
    setRememberedDevice(null);
  }, []);

  const acceptPairingCode = (text: string) => {
    setScanning(false);
    try {
      setPendingQr(parsePairingQr(text.trim()));
      setPanel(null);
      setPanelError(null);
    } catch {
      const message = 'This code is invalid or expired. Request a new code from the other phone.';
      setPanelError(message);
      setStatus(message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        stop();
      };
    }, [stop]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        stop();
        setStatus('Live preview has closed. You can start it again.');
      }
    });
    return () => subscription.remove();
  }, [stop]);

  const start = useCallback(
    async (descriptor?: PairingDescriptor, serverInput = server, expected?: SavedDevice) => {
      stop();
      const current = generation.current;
      const guard =
        <T,>(callback: (value: T) => void) =>
        (value: T) => {
          if (generation.current === current) callback(value);
        };
      setActive(true);
      try {
        if (expected) {
          setStatus(`Connecting to ${expected.name}…`);
          const controller = new AbortController();
          lookupAbort.current = controller;
          const currentDescriptor = await findDevice(
            expected,
            serverInput || expected.server,
            controller.signal,
          );
          if (current !== generation.current) return;
          if (!currentDescriptor)
            throw new Error(
              'This phone is no longer available. Start sharing on it and try again.',
            );
          descriptor = currentDescriptor;
        }
        const next = new SpikeSession({
          status: guard(setStatus),
          stream: guard((value: MediaStream | null) => {
            setStream(value);
            if (!value) {
              setActive(false);
              setQr(null);
              setPanel(null);
            }
          }),
          qr: guard((value: PairingDescriptor | null) => {
            setQr(value);
            setPanel(value ? 'qr' : null);
          }),
          channel: guard((open: boolean) => {
            setChannelOpen(open);
            if (open) setPanel(null);
          }),
          rtt: guard(setRtt),
          stats: guard(setStats),
          remembered: guard(setRememberedDevice),
          quality: guard(setQuality),
        });
        session.current = next;
        if (descriptor) await next.startMonitor(descriptor, expected);
        else await next.startCamera(serverInput);
      } catch (error) {
        if (current !== generation.current) return;
        stop();
        setStatus(error instanceof Error ? error.message : 'Could not connect. Try again.');
      }
    },
    [server, stop],
  );

  const connectDevice = useCallback(
    (row: DeviceRow) => {
      if (row.availability !== 'available' || !row.descriptor) {
        setSelectedDevice(row);
        return;
      }
      setSelectedDevice(null);
      void start(row.descriptor, server || row.device.server, row.device);
    },
    [server, start],
  );
  const renameDevice = (name: string) => {
    if (!selectedDevice) return;
    void deviceRegistry
      .rename(selectedDevice.device.id, name)
      .then(() => setSelectedDevice(null))
      .catch((error: unknown) =>
        Alert.alert('Device name', error instanceof Error ? error.message : 'Name not saved.'),
      );
  };
  const forgetDevice = () => {
    if (!selectedDevice) return;
    const device = selectedDevice.device;
    setSelectedDevice(null);
    Alert.alert(
      `Forget ${device.name}?`,
      'You will need to scan a new QR code to pair this phone again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            void deviceRegistry
              .forget(device.id)
              .catch(() => Alert.alert('My devices', 'Could not forget this device. Try again.'));
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!__DEV__) return;
    const controls = {
      camera: (url: string) => {
        setServer(url);
        void start(undefined, url);
      },
      monitor: (code: string) => {
        void start(parsePairingQr(code));
      },
      stop,
      showPanel: (value: ConnectionPanel | null) => setPanel(value),
      ping: () => session.current?.ping(),
      recMock: () => session.current?.recMock(),
      devices: () =>
        devices.rows.map(({ device, availability }) => ({
          id: device.id,
          name: device.name,
          availability,
        })),
      reconnect: (id: string) => {
        const row = devices.rows.find((item) => item.device.id === id);
        if (row) connectDevice(row);
      },
      details: (id: string) =>
        setSelectedDevice(devices.rows.find((item) => item.device.id === id) ?? null),
      snapshot: () => ({
        panel,
        status,
        active,
        qr,
        channelOpen,
        rtt,
        stats,
        hasStream: !!stream,
        remembered: rememberedDevice
          ? { id: rememberedDevice.id, name: rememberedDevice.name }
          : null,
        quality,
      }),
      diagnostics: () => session.current?.diagnostics(),
    };
    const runtime = globalThis as typeof globalThis & { __relaisSpikeTest?: typeof controls };
    runtime.__relaisSpikeTest = controls;
    return () => {
      if (runtime.__relaisSpikeTest === controls) delete runtime.__relaisSpikeTest;
    };
  }, [
    panel,
    active,
    channelOpen,
    qr,
    rtt,
    start,
    stats,
    status,
    stop,
    stream,
    rememberedDevice,
    quality,
    devices.rows,
    connectDevice,
  ]);

  const share = () => {
    if (qr)
      void Share.share({ message: JSON.stringify(qr) }).catch(() =>
        setStatus('Sharing unavailable. Use the QR code.'),
      );
  };
  const openPanel = (value: ConnectionPanel) => {
    setPanelError(null);
    setPanel(value);
  };
  const saveServer = (value: string) => {
    try {
      const address = new URL(value.trim());
      if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password)
        throw new Error('Invalid address');
      setServer(address.origin);
      setPanel(null);
      setPanelError(null);
    } catch {
      setPanelError('Enter an address such as http://192.168.1.10:8787.');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {stream && (
        <RTCView
          streamURL={stream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit={fill ? 'cover' : 'contain'}
          mirror={false}
        />
      )}
      <View
        style={[
          styles.toolbar,
          { top: insets.top + 6, left: insets.left + 12, right: insets.right + 12 },
        ]}
      >
        <CameraIconButton
          icon="close"
          label="Close live preview"
          onPress={() => {
            stop();
            router.back();
          }}
        />
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {channelOpen ? 'Live' : qr ? 'Ready to connect' : active ? 'Connecting…' : 'Monitor'}
          </Text>
          {channelOpen && <ConnectionQuality sample={quality} />}
        </View>
        <CameraIconButton
          icon="settings"
          label="Preview options"
          onPress={() => openPanel('options')}
        />
      </View>
      {!stream && (
        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.setup}>
          <ScrollView
            contentContainerStyle={[styles.setupContent, { paddingTop: insets.top + 92 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {pendingQr ? 'Camera found' : scanning ? 'Scan the code' : 'Connect your phones'}
            </Text>
            <Text style={styles.description}>{status}</Text>
            {!active && !scanning && !pendingQr && (
              <>
                <DeviceList
                  rows={devices.rows}
                  onSelect={connectDevice}
                  onDetails={setSelectedDevice}
                  onRefresh={devices.refresh}
                />
                {!!devices.error && <Text style={styles.description}>{devices.error}</Text>}
                <Button dark icon="qr" label="Scan a QR code" onPress={() => setScanning(true)} />
                <Button
                  dark
                  secondary
                  icon="camera"
                  label="Share this phone’s view"
                  disabled={!server.trim()}
                  onPress={() => {
                    void start();
                  }}
                />
                <Text style={styles.caption}>Preview only · Same Wi-Fi network</Text>
              </>
            )}
            {scanning && (
              <>
                <QrScanner onScan={acceptPairingCode} />
                <Button dark secondary label="Cancel" onPress={stop} />
              </>
            )}
            {pendingQr && !scanning && !active && (
              <>
                <Text style={styles.description}>This camera’s video will appear here.</Text>
                <Button
                  dark
                  label="Connect"
                  onPress={() => {
                    void start(pendingQr);
                  }}
                />
                <Button dark secondary label="Cancel" onPress={stop} />
              </>
            )}
            {active && <Button dark secondary label="Cancel connection" onPress={stop} />}
          </ScrollView>
        </SafeAreaView>
      )}
      {stream && qr && !channelOpen && (
        <View style={[styles.footer, { bottom: insets.bottom + 20 }]}>
          <Button dark icon="qr" label="Show connection QR code" onPress={() => openPanel('qr')} />
        </View>
      )}
      <ConnectionSheet
        panel={panel}
        qr={qr ? JSON.stringify(qr) : null}
        active={active}
        fill={fill}
        status={status}
        deviceName={rememberedDevice?.name}
        server={server}
        error={panelError}
        onClose={() => setPanel(null)}
        onPanel={openPanel}
        onFill={setFill}
        onShare={share}
        onCode={acceptPairingCode}
        onServer={saveServer}
      />
      {stream && channelOpen && (
        <View pointerEvents="none" style={[styles.footer, { bottom: insets.bottom + 12 }]}>
          <Text style={styles.caption}>Live preview · No recording</Text>
          {rememberedDevice && (
            <Text style={styles.caption}>{rememberedDevice.name} · Device saved</Text>
          )}
        </View>
      )}
      {selectedDevice && (
        <DeviceDetails
          key={selectedDevice.device.id}
          row={
            devices.rows.find((row) => row.device.id === selectedDevice.device.id) ?? selectedDevice
          }
          onClose={() => setSelectedDevice(null)}
          onRename={renameDevice}
          onForget={forgetDevice}
          onConnect={() =>
            connectDevice(
              devices.rows.find((row) => row.device.id === selectedDevice.device.id) ??
                selectedDevice,
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  toolbar: {
    position: 'absolute',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    backgroundColor: '#00000099',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  statusText: { color: 'white', fontSize: 14, fontWeight: '600' },
  setup: { flex: 1 },
  setupContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '600' },
  description: { color: '#D1D1D6', fontSize: 15, lineHeight: 22 },
  caption: { color: '#C7C7CC', fontSize: 12, textAlign: 'center' },
  footer: { position: 'absolute', left: 24, right: 24 },
});
