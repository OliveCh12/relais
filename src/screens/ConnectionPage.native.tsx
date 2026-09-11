import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { Stack, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaptureSession } from '@/capture/SessionContext';
import { SettingsPage } from '@/components/SettingsPage';
import type { SettingsPageProps } from '@/components/SettingsPage.types';
import { PairingCodeImage } from '@/components/connection/PairingCodeImage';
import { QrScanner } from '@/components/QrScanner';
import { parsePairingQr } from '@/signaling/protocol';
import { useAppTheme } from '@/design/useAppTheme';

export type ConnectionPageKind = 'add' | 'connect' | 'server' | 'code' | 'scan';
export default function ConnectionPage({ page }: { page: ConnectionPageKind }) {
  const { connection, connectTo } = useCaptureSession();
  const focused = useIsFocused();
  const [error, setError] = useState('');
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { setMetricsEnabled } = connection;
  const measure = focused && page === 'connect' && connection.connected;
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
  let title: string = 'Connection';
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
            kind: 'navigation',
            label: 'Scan code',
            icon: 'qr',
            onPress: () => router.push('/monitor/scan'),
          },
          {
            kind: 'navigation',
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
            kind: 'navigation',
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
            kind: 'name',
            id: 'connection-server',
            label: 'Mac address',
            validate: () => undefined,
            value: connection.server,
            maxLength: 300,
            onSave: connection.setServer,
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
            kind: 'group',
            label: 'Connection',
            icon: 'wifi',
            rows: [
              {
                kind: 'value',
                label: 'Monitor',
                value: connection.device?.name ?? 'Not connected',
                icon: 'device',
              },
              {
                kind: 'value',
                label: 'Availability',
                value: connection.connected ? 'Connected' : connection.status,
              },
              { kind: 'value', label: 'Connection service', value: connection.server },
            ],
          },
          ...(!connection.qr && !connection.connected
            ? [
                {
                  kind: 'navigation' as const,
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
