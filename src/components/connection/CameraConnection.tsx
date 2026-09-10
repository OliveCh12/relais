import { useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';
import { ConnectionSheet } from './ConnectionSheet';
import type { ConnectionPanel } from './ConnectionSheet.types';
import type { useConnection } from '@/capture/useConnection';
import { privateLanOrigin } from '@/signaling/protocol';
export function CameraConnection({
  connection,
  visible,
  onClose,
}: {
  connection: ReturnType<typeof useConnection>;
  visible: boolean;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<ConnectionPanel>('qr');
  const [error, setError] = useState<string | null>(null);
  const wasConnected = useRef(connection.connected);
  useEffect(() => {
    if (connection.connected && !wasConnected.current && visible) onClose();
    wasConnected.current = connection.connected;
  }, [connection.connected, visible, onClose]);
  const qr = connection.qr ? JSON.stringify(connection.qr) : null;
  return (
    <ConnectionSheet
      panel={visible ? (connection.connected ? 'options' : qr ? panel : 'server') : null}
      qr={connection.connected ? null : qr}
      active={connection.active}
      fill={false}
      showFill={false}
      status={connection.status}
      deviceName={connection.device?.name}
      server={connection.server}
      error={error}
      onClose={onClose}
      onPanel={setPanel}
      onFill={() => {}}
      onShare={() => {
        if (qr) void Share.share({ message: qr });
      }}
      onCode={() => {}}
      onServer={(value) => {
        try {
          connection.setServer(privateLanOrigin(value));
          setError(null);
          setPanel('qr');
          onClose();
        } catch {
          setError('Enter the Mac’s local address, for example http://192.168.1.10:8787.');
        }
      }}
    />
  );
}
