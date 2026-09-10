import type { DeviceListProps } from '../DeviceList.types';
export interface MonitorSetupProps extends DeviceListProps {
  status: string;
  connecting: boolean;
  onScan: () => void;
  onCode: () => void;
  onCancel: () => void;
  onSettings: () => void;
}
