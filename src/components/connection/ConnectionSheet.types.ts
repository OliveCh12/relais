export type ConnectionPanel = 'qr' | 'options' | 'code' | 'server' | 'add' | 'scan';

export interface ConnectionSheetProps {
  panel: ConnectionPanel | null;
  qr: string | null;
  active: boolean;
  fill: boolean;
  showFill?: boolean;
  status: string;
  deviceName: string | undefined;
  server: string;
  error: string | null;
  onClose: () => void;
  onPanel: (panel: ConnectionPanel) => void;
  onFill: (fill: boolean) => void;
  onShare: () => void;
  onCode: (code: string) => void;
  onServer: (server: string) => void;
}

export const connectionTitles: Record<ConnectionPanel, string> = {
  qr: 'Connect a monitor',
  options: 'Connection',
  code: 'Join with a code',
  server: 'Mac connection',
  add: 'Add camera',
  scan: 'Scan code',
};

export const qrInstructions =
  'On the other phone, open Monitor, tap +, then Scan code. The connection will be saved for next time.';
export const previewExplanation =
  'Photos and videos are saved on the camera phone. You can capture from either phone.';
export const serverExplanation =
  'In this test version, the Mac prepares the connection. Its address is usually detected automatically.';
