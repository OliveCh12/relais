export const SESSION_TTL_MS = 10 * 60 * 1000;
export const MAX_SDP_BYTES = 128 * 1024;

export interface PairingDescriptor {
  kind: 'relais-spike';
  version: 1;
  server: string;
  sessionId: string;
  token: string;
  expiresAt: number;
}

export interface CreatedSession {
  sessionId: string;
  cameraToken: string;
  monitorToken: string;
  expiresAt: number;
}

export interface SignalDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export function privateLanOrigin(value: string): string {
  const url = new URL(value);
  const octets = url.hostname.split('.');
  const values = octets.map(Number);
  const [a, b] = values;
  if (
    url.protocol !== 'http:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    octets.length !== 4 ||
    octets.some((part, index) => !/^\d{1,3}$/.test(part) || values[index]! > 255) ||
    !(a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168))
  )
    throw new Error(
      'Use a private LAN IPv4 HTTP URL without a path (e.g. http://192.168.1.10:8787).',
    );
  return url.origin;
}

export const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
export const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{48}$/.test(value);

export function parsePairingQr(text: string, now = Date.now()): PairingDescriptor {
  if (text.length > 2048) throw new Error('QR code is too large.');
  const data: unknown = JSON.parse(text);
  if (typeof data !== 'object' || !data) throw new Error('Invalid QR code.');
  const value = data as Record<string, unknown>;
  if (
    value.kind !== 'relais-spike' ||
    value.version !== 1 ||
    typeof value.server !== 'string' ||
    !validId(value.sessionId) ||
    !validToken(value.token) ||
    typeof value.expiresAt !== 'number' ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= now ||
    value.expiresAt > now + SESSION_TTL_MS + 30_000
  )
    throw new Error(
      'Invalid or expired Relais QR code, or incompatible version. Check the time on both phones.',
    );
  return {
    kind: 'relais-spike',
    version: 1,
    server: privateLanOrigin(value.server),
    sessionId: value.sessionId,
    token: value.token,
    expiresAt: value.expiresAt,
  };
}

export function parseDescription(
  value: unknown,
  type: SignalDescription['type'],
): SignalDescription {
  if (typeof value !== 'object' || !value) throw new Error('Invalid SDP.');
  const description = value as Record<string, unknown>;
  if (
    description.type !== type ||
    typeof description.sdp !== 'string' ||
    !description.sdp.startsWith('v=0') ||
    description.sdp.length > MAX_SDP_BYTES
  )
    throw new Error('Invalid SDP.');
  return { type, sdp: description.sdp };
}
