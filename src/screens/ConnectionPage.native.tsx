import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Stack, router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaptureSession } from '@/capture/SessionContext';
import { SettingsPage } from '@/components/SettingsPage';
import type { SettingsPageProps } from '@/components/SettingsPage.types';
import { PairingCodeImage } from '@/components/connection/PairingCodeImage';
import { QrScanner } from '@/components/QrScanner';
import { ActionButton } from '@/components/ActionButton';
import { AppText } from '@/components/ui';
import { parsePairingQr } from '@/signaling/protocol';
import { useAppTheme } from '@/design/useAppTheme';

export type ConnectionPageKind = 'add' | 'connect' | 'server' | 'code' | 'scan' | 'share';
export default function ConnectionPage({ page }: { page: ConnectionPageKind }) {
  const { connection, connectTo } = useCaptureSession();
  const focused = useIsFocused();
  const wasConnected = useRef(connection.connected);
  useEffect(() => {
    const justConnected = connection.connected && !wasConnected.current;
    wasConnected.current = connection.connected;
    if (justConnected && focused && (page === 'connect' || page === 'share'))
      router.dismissTo('/camera');
  }, [connection.connected, focused, page]);
  const [error, setError] = useState('');
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { setMetricsEnabled } = connection;
  const measure = focused && page === 'connect' && connection.connected;
  useEffect(() => {
    setMetricsEnabled(measure);
    return () => setMetricsEnabled(false);
  }, [measure, setMetricsEnabled]);
  const readCode = (value: string) => {
    try {
      connectTo(parsePairingQr(value));
      return true;
    } catch {
      setError('This code is invalid or expired. Show a new code on the camera phone.');
      return false;
    }
  };
  let title: string = 'Connection';
  let sections: SettingsPageProps['sections'] = [];
  let content: SettingsPageProps['content'];
  if (page === 'share') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 20 }}
      >
        <Stack.Screen options={{ title: 'Connection code' }} />
        <AppText>
          Touch and hold the code to copy it. On your other phone, open Monitor, tap +, then Enter
          code. Keep Camera open on this phone until your monitor connects.
        </AppText>
        <AppText selectable style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
          {connection.qr
            ? JSON.stringify(connection.qr)
            : connection.connected
              ? 'Your monitor is connected.'
              : 'Preparing a new code… Return to Camera if no code appears.'}
        </AppText>
      </ScrollView>
    );
  } else if (page === 'add') {
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
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom }}>
        <Stack.Screen options={{ title: 'Scan code', freezeOnBlur: false }} />
        <StatusBar style="auto" />
        <View style={{ padding: 20, gap: 12 }}>
          <AppText>On the other phone, open Camera, then Connect a monitor.</AppText>
          <ActionButton
            label="Enter code instead"
            icon="code"
            secondary
            onPress={() => router.replace('/monitor/code')}
          />
        </View>
        {focused && <QrScanner fill onScan={readCode} />}
      </View>
    );
  } else if (page === 'code') {
    title = 'Enter code';
    sections = [
      {
        title: 'Connection code',
        footer: 'On the camera phone, choose View code, copy it, then paste it here.',
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
                  kind: 'navigation' as const,
                  label: 'View code',
                  icon: 'code' as const,
                  onPress: () => router.push('/camera/code'),
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
  if (error) sections.push({ title: 'Could not complete this action', footer: error, rows: [] });
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title }} />
      <StatusBar style="auto" />
      <SettingsPage sections={sections} {...(content ? { content } : {})} />
    </View>
  );
}
