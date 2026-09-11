export type IconName =
  | 'sun'
  | 'gear'
  | 'video'
  | 'photo'
  | 'preset'
  | 'timer'
  | 'check'
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
  | 'gallery'
  | 'add'
  | 'more'
  | 'code'
  | 'back'
  | 'device'
  | 'shutter'
  | 'stopSolid'
  | 'link0'
  | 'link1'
  | 'link2'
  | 'link3';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  label?: string;
}

export const sfSymbols = {
  gear: 'gearshape.fill',
  video: 'video.fill',
  photo: 'photo.fill',
  preset: 'rectangle.stack.fill',
  timer: 'timer',
  sun: 'sun.max.fill',
  check: 'checkmark.circle.fill',
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
  add: 'plus',
  more: 'ellipsis',
  code: 'doc.on.clipboard',
  back: 'chevron.left',
  device: 'smartphone',
  shutter: 'circle.fill',
  stopSolid: 'stop.fill',
  link0: 'wifi',
  link1: 'wifi',
  link2: 'wifi',
  link3: 'wifi',
} as const;
