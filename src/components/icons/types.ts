export type IconName =
  | 'camera'
  | 'monitor'
  | 'qr'
  | 'wifi'
  | 'settings'
  | 'info'
  | 'record'
  | 'stop'
  | 'flip'
  | 'torch'
  | 'torchOff'
  | 'close'
  | 'gallery';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  label?: string;
}

export const sfSymbols = {
  camera: 'camera.fill',
  monitor: 'viewfinder',
  qr: 'qrcode.viewfinder',
  wifi: 'wifi',
  settings: 'slider.horizontal.3',
  info: 'info.circle',
  record: 'record.circle',
  stop: 'stop.circle',
  flip: 'arrow.triangle.2.circlepath.camera',
  torch: 'bolt.fill',
  torchOff: 'bolt.slash',
  close: 'xmark',
  gallery: 'photo.on.rectangle',
} as const;
