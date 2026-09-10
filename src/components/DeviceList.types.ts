import type { DeviceRow } from '../connections/useDevices';
export interface DeviceListProps {
  rows: DeviceRow[];
  onSelect: (row: DeviceRow) => void;
  onDetails: (row: DeviceRow) => void;
  onRefresh: () => void;
}
export interface DeviceDetailsProps {
  row: DeviceRow;
  onClose: () => void;
  onRename: (name: string) => void;
  onForget: () => void;
  onConnect: () => void;
}
