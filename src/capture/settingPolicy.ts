import type { CameraSetting } from './settings';

type SettingKey = CameraSetting['key'];
const policies: Record<SettingKey, { live: boolean; catalog: boolean; order: number }> = {
  position: { live: false, catalog: true, order: 0 },
  stabilization: { live: false, catalog: true, order: 1 },
  profile: { live: false, catalog: false, order: 2 },
  audio: { live: false, catalog: false, order: 3 },
  grid: { live: true, catalog: false, order: 4 },
  zoom: { live: true, catalog: false, order: 5 },
  exposure: { live: true, catalog: false, order: 6 },
  timer: { live: false, catalog: false, order: 7 },
  flash: { live: false, catalog: false, order: 8 },
  timerLight: { live: false, catalog: false, order: 9 },
  focus: { live: true, catalog: false, order: 10 },
};

export const isLiveSetting = (key: SettingKey) => policies[key].live;
export const changesCatalog = (key: SettingKey) => policies[key].catalog;
export const settingOrder = (key: SettingKey) => policies[key].order;
