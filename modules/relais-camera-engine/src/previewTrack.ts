export interface PreviewTrackInfo {
  id: string;
  kind: string;
  remote: boolean;
  enabled: boolean;
  readyState: 'live';
  peerConnectionId: number;
  constraints: object;
  settings: object;
}
