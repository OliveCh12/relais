import { privateLanOrigin, validId, validToken } from '../signaling/protocol';

export const MAX_DEVICES = 12;
export const PRESENCE_TTL_MS = 12_000;
export interface DeviceIdentity {
  id: string;
  name: string;
}
export interface SavedDevice extends DeviceIdentity {
  pairId: string;
  secret: string;
  server: string;
  lastConnectedAt: number;
}
export const validName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.trim().length > 0 &&
  name.length <= 60 &&
  !/[\u0000-\u001f\u007f]/.test(name);
export function isIdentity(value: unknown): value is DeviceIdentity {
  if (!value || typeof value !== 'object') return false;
  const v = value as DeviceIdentity;
  return validId(v.id) && validName(v.name);
}
export function parseSavedDevice(value: unknown): SavedDevice {
  const v = value as SavedDevice;
  if (
    !isIdentity(v) ||
    !validId(v.pairId) ||
    !validToken(v.secret) ||
    typeof v.server !== 'string' ||
    !Number.isFinite(v.lastConnectedAt) ||
    v.lastConnectedAt < 0
  )
    throw new Error('Could not read this saved device.');
  return {
    id: v.id,
    name: v.name,
    pairId: v.pairId,
    secret: v.secret,
    server: privateLanOrigin(v.server),
    lastConnectedAt: v.lastConnectedAt,
  };
}

export type DeviceAvailability = 'checking' | 'available' | 'offline' | 'unreachable';
export const availabilityLabels: Record<DeviceAvailability, string> = {
  checking: 'Searching…',
  available: 'Online',
  offline: 'Offline',
  unreachable: 'Network unavailable',
};
