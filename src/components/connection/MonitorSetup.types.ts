import type { DeviceListProps } from '../DeviceList.types';
export interface MonitorSetupProps extends Omit<DeviceListProps, 'onDetails'> {
  status: string;
  connecting: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onSettings: () => void;
}
