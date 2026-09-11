import sun from '@expo/material-symbols/wb_sunny.xml';
import { Host, Icon as ComposeIcon } from '@expo/ui/jetpack-compose';
import check from '@expo/material-symbols/check_circle.xml';
import camera from '@expo/material-symbols/photo_camera.xml';
import monitor from '@expo/material-symbols/crop_free.xml';
import qr from '@expo/material-symbols/qr_code_scanner.xml';
import wifi from '@expo/material-symbols/wifi.xml';
import settings from '@expo/material-symbols/tune.xml';
import info from '@expo/material-symbols/info.xml';
import record from '@expo/material-symbols/radio_button_checked.xml';
import stop from '@expo/material-symbols/stop_circle.xml';
import flip from '@expo/material-symbols/cameraswitch.xml';
import torch from '@expo/material-symbols/flash_on.xml';
import torchOff from '@expo/material-symbols/flash_off.xml';
import close from '@expo/material-symbols/close.xml';
import gallery from '@expo/material-symbols/photo_library.xml';
import add from '@expo/material-symbols/add.xml';
import more from '@expo/material-symbols/more_vert.xml';
import code from '@expo/material-symbols/content_paste.xml';
import back from '@expo/material-symbols/arrow_back.xml';
import device from '@expo/material-symbols/mobile.xml';
import shutter from '../../../assets/icons/circle_fill.xml';
import stopSolid from '../../../assets/icons/stop_fill.xml';
import link0 from '@expo/material-symbols/signal_cellular_0_bar.xml';
import link1 from '@expo/material-symbols/signal_cellular_1_bar.xml';
import link2 from '@expo/material-symbols/signal_cellular_2_bar.xml';
import link3 from '@expo/material-symbols/signal_cellular_4_bar.xml';
import type { IconProps } from './types';

const icons = {
  sun,
  check,
  camera,
  monitor,
  qr,
  wifi,
  settings,
  info,
  record,
  stop,
  flip,
  torch,
  torchOff,
  close,
  gallery,
  add,
  more,
  code,
  back,
  device,
  shutter,
  stopSolid,
  link0,
  link1,
  link2,
  link3,
};

export function NativeIcon({ name, size = 24, color, label }: IconProps) {
  return (
    <ComposeIcon
      source={icons[name]}
      size={size}
      {...(color ? { tint: color } : {})}
      {...(label ? { contentDescription: label } : {})}
    />
  );
}

export function Icon(props: IconProps) {
  return (
    <Host matchContents style={{ alignSelf: 'center' }}>
      <NativeIcon {...props} />
    </Host>
  );
}
