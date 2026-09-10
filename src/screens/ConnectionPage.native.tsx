import { useEffect, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaptureSession } from '@/capture/SessionContext';
import { SettingsPage } from '@/components/SettingsPage';
import type { SettingsPageProps } from '@/components/SettingsPage.types';
import { PairingCodeImage } from '@/components/connection/PairingCodeImage';
import { QrScanner } from '@/components/QrScanner';
import { availabilityLabels } from '@/connections/model';
import { useDevices } from '@/connections/useDevices';
import { deviceRegistry } from '@/connections/storage';
import { linkQuality } from '@/connections/quality';
import { parsePairingQr, privateLanOrigin } from '@/signaling/protocol';
import { useAppTheme } from '@/design/useAppTheme';

export type ConnectionPageKind = 'add' | 'connect' | 'device' | 'info' | 'server' | 'code' | 'scan';
export default function ConnectionPage({ page }: { page: ConnectionPageKind }) {
  const { role, connection, fill, setFill, connectTo } = useCaptureSession();
  const focused = useIsFocused();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const devices = useDevices(
    connection.server,
    focused &&
      role === 'monitor' &&
      !!id &&
      (page === 'device' || page === 'info') &&
      !connection.connected,
    id,
  );
  const row = devices.rows.find((item) => item.device.id === id);
  const [error, setError] = useState('');
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { setMetricsEnabled } = connection;
  const measure =
    focused && page === 'info' && connection.connected && (!id || connection.device?.id === id);
  useEffect(() => {
    setMetricsEnabled(measure);
    return () => setMetricsEnabled(false);
  }, [measure, setMetricsEnabled]);
  const showError = (failure: unknown) =>
    setError(failure instanceof Error ? failure.message : 'Please try again.');
  const readCode = (value: string) => {
    try {
      connectTo(parsePairingQr(value));
    } catch {
      setError('This code is invalid or expired. Show a new code on the camera phone.');
    }
  };
  let title: string = 'Info';
  let sections: SettingsPageProps['sections'] = [];
  let content: SettingsPageProps['content'];
  if (page === 'add') {
    title = 'Add camera';
    sections = [
      {
        title: 'Connect another phone',
        footer: 'Open Camera on your other phone. Keep both apps open on the same Wi-Fi network.',
        rows: [
          {
            kind: 'action',
            label: 'Scan code',
            icon: 'qr',
            onPress: () => router.push('/monitor/scan'),
          },
          {
            kind: 'action',
            label: 'Enter code',
            icon: 'code',
            onPress: () => router.push('/monitor/code'),
          },
        ],
      },
    ];
  } else if (page === 'scan') {
    title = 'Scan code';
    sections = [
      {
        title: 'Camera connection code',
        footer: error || 'On the other phone, open Camera, then Connect a monitor.',
        rows: [
          {
            kind: 'action',
            label: 'Enter code instead',
            icon: 'code',
            onPress: () => router.replace('/monitor/code'),
          },
        ],
      },
    ];
    if (focused) content = <QrScanner key={error} onScan={readCode} />;
  } else if (page === 'code') {
    title = 'Enter code';
    sections = [
      {
        title: 'Connection code',
        footer: 'On the camera phone, choose Share code, then paste it here.',
        rows: [
          {
            kind: 'field',
            label: 'Connection code',
            value: '',
            maxLength: 2048,
            saveLabel: 'Connect',
            onSave: readCode,
          },
        ],
      },
    ];
  } else if (page === 'server') {
    title = 'Connection settings';
    sections = [
      {
        title: 'Mac connection',
        footer:
          'In this test version, the Mac prepares the local connection. Its address is usually detected automatically.',
        rows: [
          {
            kind: 'field',
            label: 'Mac address',
            value: connection.server,
            maxLength: 300,
            saveLabel: 'Save',
            onSave: (value) => {
              try {
                connection.setServer(privateLanOrigin(value));
                router.back();
              } catch (failure) {
                showError(failure);
              }
            },
          },
        ],
      },
    ];
  } else if (page === 'connect') {
    title = 'Connect a monitor';
    sections = [
      {
        title: connection.connected ? 'Monitor connected' : 'Pair your phones',
        footer: connection.connected
          ? 'Your monitor can take photos and start or stop video. Originals stay on this phone.'
          : 'On your other phone, open Monitor, tap +, then Scan code.',
        rows: [
          ...(connection.qr && !connection.connected
            ? [
                {
                  kind: 'action' as const,
                  label: 'Share code',
                  icon: 'code' as const,
                  onPress: () => {
                    void Share.share({ message: JSON.stringify(connection.qr) }).catch(showError);
                  },
                },
              ]
            : []),
          {
            kind: 'action',
            label: 'Info',
            icon: 'info',
            onPress: () => router.push('/camera/info'),
          },
          ...(!connection.qr && !connection.connected
            ? [
                {
                  kind: 'action' as const,
                  label: 'Connection settings',
                  icon: 'settings' as const,
                  onPress: () => router.push('/camera/server'),
                },
              ]
            : []),
        ],
      },
    ];
    if (connection.qr && !connection.connected)
      content = <PairingCodeImage value={JSON.stringify(connection.qr)} />;
  } else if (page === 'device') {
    title = row?.device.name ?? 'Camera';
    if (row) {
      sections = [
        {
          title: 'Saved camera',
          rows: [
            {
              kind: 'field',
              label: 'Name on this phone',
              value: row.device.name,
              maxLength: 60,
              saveLabel: 'Save name',
              onSave: (name) => {
                void deviceRegistry.rename(row.device.id, name).catch(showError);
              },
            },
            {
              kind: 'action',
              label:
                connection.device?.id === row.device.id && connection.connected
                  ? 'Back to camera'
                  : 'Connect',
              icon: 'camera',
              disabled:
                !row.descriptor &&
                !(connection.connected && connection.device?.id === row.device.id),
              onPress: () => {
                if (row.descriptor) connectTo(row.descriptor, row.device);
                else router.dismissTo('/monitor');
              },
            },
            {
              kind: 'action',
              label: 'Info',
              icon: 'info',
              onPress: () =>
                router.push({ pathname: '/monitor/info', params: { id: row.device.id } }),
            },
          ],
          footer: 'Open Camera on this phone and keep both apps on the same Wi-Fi network.',
        },
        {
          title: 'Pairing',
          rows: [
            {
              kind: 'action',
              label: 'Forget this camera',
              destructive: true,
              onPress: () =>
                Alert.alert(
                  'Forget this camera?',
                  'You can pair it again with its connection code.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Forget',
                      style: 'destructive',
                      onPress: () => {
                        void deviceRegistry
                          .forget(row.device.id)
                          .then(() => router.dismissTo('/monitor'))
                          .catch(showError);
                      },
                    },
                  ],
                ),
            },
          ],
        },
      ];
    } else
      sections = [
        {
          title: 'Camera unavailable',
          footer: 'This saved camera is no longer on this phone.',
          rows: [],
        },
      ];
  } else {
    const saved = id
      ? devices.rows.find((item) => item.device.id === id)?.device
      : connection.device;
    const connected = connection.connected && (!id || connection.device?.id === id);
    const quality = connected ? linkQuality(connection.quality) : null;
    const sample = connected ? connection.quality : null;
    sections = [
      {
        title: saved?.name ?? 'Connection',
        rows: [
          {
            kind: 'value',
            label: 'Availability',
            value: connected
              ? 'Connected'
              : row
                ? availabilityLabels[row.availability]
                : 'Not connected',
            icon: 'device',
          },
          {
            kind: 'value',
            label: 'Signal quality',
            value: quality?.label ?? 'Connect to measure',
            icon: quality ? `link${quality.bars}` : 'link0',
          },
          ...(saved
            ? [
                {
                  kind: 'value' as const,
                  label: 'Last connected',
                  value: new Date(saved.lastConnectedAt).toLocaleString('en-US'),
                },
              ]
            : []),
        ],
        footer:
          'Signal quality describes this connection, not Wi-Fi reception. Measurements run only while Info is open.',
      },
      {
        title: 'Connection details',
        rows: [
          {
            kind: 'value',
            label: 'Round-trip delay',
            value: sample?.rtt != null ? `${Math.round(sample.rtt)} ms` : 'Not measured',
          },
          {
            kind: 'value',
            label: 'Packet loss',
            value: sample?.loss != null ? `${(sample.loss * 100).toFixed(1)}%` : 'Not measured',
          },
          {
            kind: 'value',
            label: 'Jitter',
            value:
              sample?.jitter != null ? `${Math.round(sample.jitter * 1000)} ms` : 'Not measured',
          },
          {
            kind: 'value',
            label: 'Camera quality',
            value: connection.remote?.quality ?? 'On the camera phone',
          },
          { kind: 'value', label: 'Connection service', value: saved?.server ?? connection.server },
        ],
      },
      ...(role === 'monitor' && connected
        ? [
            {
              title: 'Preview',
              rows: [
                { kind: 'toggle' as const, label: 'Fill screen', value: fill, onChange: setFill },
              ],
            },
          ]
        : []),
    ];
  }
  if (error && page !== 'scan')
    sections.push({ title: 'Could not complete this action', footer: error, rows: [] });
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title }} />
      <StatusBar style="auto" />
      <SettingsPage sections={sections} {...(content ? { content } : {})} />
    </View>
  );
}
