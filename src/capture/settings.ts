export interface CameraControls {
  timerLight?: boolean;
  exposure: number;
  minExposure: number;
  maxExposure: number;
  timer: 0 | 3 | 10;
  flash: 'auto' | 'off' | 'on';
  hasFlash: boolean;
}
export interface CameraProfile {
  id: string;
  height: number;
  fps: number;
  hdr: boolean;
}
export interface CameraSettings {
  controls?: CameraControls;
  revision: number;
  profiles: CameraProfile[];
  profile: string | null;
  audio: boolean;
  grid: boolean;
  position: 'front' | 'back';
  canFlip: boolean;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStops: number[];
  stabilization: boolean;
  canStabilize: boolean;
}
export type CameraSetting =
  | { key: 'focus'; value: { x: number; y: number } }
  | { key: 'profile'; value: string }
  | { key: 'audio' | 'grid' | 'stabilization' | 'timerLight'; value: boolean }
  | { key: 'position'; value: 'front' | 'back' }
  | { key: 'zoom' | 'exposure'; value: number }
  | { key: 'timer'; value: 0 | 3 | 10 }
  | { key: 'flash'; value: 'auto' | 'off' | 'on' };
export type SettingsAction = CameraSetting & { type: 'settings'; revision: number };
export const profileId = (profile: { height: number; fps: number; hdr: boolean }) =>
  `${profile.height}-${profile.fps}-${profile.hdr}`;
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
export function parseSettingsAction(value: unknown): SettingsAction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some((key) => !['type', 'revision', 'key', 'value'].includes(key)) ||
    v.type !== 'settings' ||
    !Number.isSafeInteger(v.revision) ||
    !finite(v.revision, 0, Number.MAX_SAFE_INTEGER)
  )
    return null;
  const point = v.value as { x?: unknown; y?: unknown } | null;
  const valid =
    (v.key === 'focus' &&
      !!point &&
      typeof point === 'object' &&
      Object.keys(point).every((key) => ['x', 'y'].includes(key)) &&
      finite(point.x, 0, 1) &&
      finite(point.y, 0, 1)) ||
    (v.key === 'profile' &&
      typeof v.value === 'string' &&
      /^\d{2,5}-\d{1,3}-(true|false)$/.test(v.value)) ||
    (typeof v.key === 'string' &&
      ['audio', 'grid', 'stabilization', 'timerLight'].includes(v.key) &&
      typeof v.value === 'boolean') ||
    (v.key === 'position' && typeof v.value === 'string' && ['front', 'back'].includes(v.value)) ||
    (v.key === 'zoom' && finite(v.value, 0.1, 1000)) ||
    (v.key === 'exposure' && finite(v.value, -20, 20)) ||
    (v.key === 'timer' && [0, 3, 10].includes(v.value as number)) ||
    (v.key === 'flash' && ['auto', 'off', 'on'].includes(v.value as string));
  return valid
    ? ({ type: 'settings', revision: v.revision, key: v.key, value: v.value } as SettingsAction)
    : null;
}
export function parseCameraSettings(value: unknown): CameraSettings | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as CameraSettings;
  if (
    !Number.isSafeInteger(s.revision) ||
    !finite(s.revision, 0, Number.MAX_SAFE_INTEGER) ||
    !Array.isArray(s.profiles) ||
    s.profiles.length > 128 ||
    !s.profiles.every(
      (p) =>
        p &&
        finite(p.height, 120, 16384) &&
        Number.isInteger(p.height) &&
        finite(p.fps, 1, 960) &&
        Number.isInteger(p.fps) &&
        typeof p.hdr === 'boolean' &&
        p.id === profileId(p),
    ) ||
    new Set(s.profiles.map((p) => p.id)).size !== s.profiles.length ||
    (s.profile !== null && !s.profiles.some((p) => p.id === s.profile)) ||
    !['audio', 'grid', 'canFlip', 'stabilization', 'canStabilize'].every(
      (key) => typeof s[key as keyof CameraSettings] === 'boolean',
    ) ||
    !['front', 'back'].includes(s.position) ||
    !finite(s.minZoom, 0.1, 1000) ||
    !finite(s.maxZoom, s.minZoom, 1000) ||
    !finite(s.zoom, s.minZoom, s.maxZoom) ||
    !Array.isArray(s.zoomStops) ||
    s.zoomStops.length > 32 ||
    !s.zoomStops.every((z) => finite(z, s.minZoom, s.maxZoom))
  )
    return null;
  const controls = s.controls;
  if (
    controls !== undefined &&
    (!controls ||
      !finite(controls.minExposure, -20, 20) ||
      !finite(controls.maxExposure, controls.minExposure, 20) ||
      !finite(controls.exposure, controls.minExposure, controls.maxExposure) ||
      ![0, 3, 10].includes(controls.timer) ||
      !['auto', 'off', 'on'].includes(controls.flash) ||
      typeof controls.hasFlash !== 'boolean' ||
      (controls.timerLight !== undefined && typeof controls.timerLight !== 'boolean'))
  )
    return null;
  return {
    ...(controls
      ? {
          controls: {
            ...(controls.timerLight === undefined ? {} : { timerLight: controls.timerLight }),
            exposure: controls.exposure,
            minExposure: controls.minExposure,
            maxExposure: controls.maxExposure,
            timer: controls.timer,
            flash: controls.flash,
            hasFlash: controls.hasFlash,
          },
        }
      : {}),
    revision: s.revision,
    profiles: s.profiles.map(({ id, height, fps, hdr }) => ({ id, height, fps, hdr })),
    profile: s.profile,
    audio: s.audio,
    grid: s.grid,
    position: s.position,
    canFlip: s.canFlip,
    zoom: s.zoom,
    minZoom: s.minZoom,
    maxZoom: s.maxZoom,
    zoomStops: [...s.zoomStops],
    stabilization: s.stabilization,
    canStabilize: s.canStabilize,
  };
}
