import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  MAX_SDP_BYTES,
  SESSION_TTL_MS,
  parseDescription,
  validId,
  validToken,
  type SignalDescription,
} from '../src/signaling/protocol';
import { PRESENCE_TTL_MS } from '../src/connections/model';

interface Session {
  cameraToken: string;
  monitorToken: string;
  expiresAt: number;
  offer: SignalDescription | null;
  answer: SignalDescription | null;
}

const sameToken = (left: string, right: string) =>
  left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));

async function readBody(request: IncomingMessage): Promise<unknown> {
  if (!request.headers['content-type']?.startsWith('application/json'))
    throw new Error('content-type');
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk as Uint8Array);
    length += bytes.length;
    if (length > MAX_SDP_BYTES + 8192) throw new Error('body-size');
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

export function createSignalingServer({
  now = Date.now,
  maxSessions = 32,
  ttl = SESSION_TTL_MS,
} = {}) {
  const sessions = new Map<string, Session>();
  const presence = new Map<string, { secret: string; sessionId: string; expiresAt: number }>();
  const sweep = () => {
    for (const [id, session] of sessions) if (session.expiresAt <= now()) sessions.delete(id);
    for (const [id, item] of presence)
      if (item.expiresAt <= now() || !sessions.has(item.sessionId)) presence.delete(id);
  };
  const timer = setInterval(sweep, 15_000);
  timer.unref();
  const send = (response: ServerResponse, status: number, value: unknown) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(JSON.stringify(value));
  };
  const server = createServer(async (request, response) => {
    sweep();
    if (request.headers.origin) return send(response, 403, { error: 'native-clients-only' });
    try {
      const presenceMatch = /^\/presence\/([a-f0-9]{32})\/([a-f0-9]{32})$/.exec(request.url ?? '');
      if (presenceMatch) {
        const key = `${presenceMatch[1]}/${presenceMatch[2]}`;
        const secret = request.headers.authorization?.replace(/^Bearer /, '') ?? '';
        if (!validToken(secret)) return send(response, 401, { error: 'unauthorized' });
        const existing = presence.get(key);
        if (existing && !sameToken(existing.secret, secret))
          return send(response, 403, { error: 'unauthorized' });
        if (request.method === 'GET') {
          const session = existing ? sessions.get(existing.sessionId) : null;
          return send(
            response,
            200,
            session && !session.answer && session.offer
              ? {
                  sessionId: existing!.sessionId,
                  token: session.monitorToken,
                  expiresAt: session.expiresAt,
                }
              : null,
          );
        }
        if (request.method === 'DELETE') {
          presence.delete(key);
          return send(response, 200, { removed: true });
        }
        if (request.method === 'PUT') {
          const body = (await readBody(request)) as Record<string, unknown>;
          if (!body || !validId(body.sessionId) || !validToken(body.cameraToken))
            return send(response, 400, { error: 'invalid-presence' });
          const session = sessions.get(body.sessionId);
          if (!session || !sameToken(session.cameraToken, body.cameraToken))
            return send(response, 403, { error: 'camera-only' });
          if (!existing && presence.size >= maxSessions * 12)
            return send(response, 429, { error: 'capacity' });
          presence.set(key, {
            secret,
            sessionId: body.sessionId,
            expiresAt: Math.min(now() + PRESENCE_TTL_MS, session.expiresAt),
          });
          return send(response, 200, { published: true });
        }
        return send(response, 405, { error: 'method' });
      }
      if (request.url === '/sessions' && request.method === 'POST') {
        await readBody(request);
        if (sessions.size >= maxSessions) return send(response, 429, { error: 'capacity' });
        const sessionId = randomBytes(16).toString('hex');
        const session = {
          cameraToken: randomBytes(24).toString('hex'),
          monitorToken: randomBytes(24).toString('hex'),
          expiresAt: now() + ttl,
          offer: null,
          answer: null,
        };
        sessions.set(sessionId, session);
        return send(response, 201, {
          sessionId,
          cameraToken: session.cameraToken,
          monitorToken: session.monitorToken,
          expiresAt: session.expiresAt,
        });
      }
      const match = /^\/sessions\/([a-f0-9]{32})(?:\/(offer|answer))?$/.exec(request.url ?? '');
      const sessionId = match?.[1];
      const slot = match?.[2];
      const session = sessionId ? sessions.get(sessionId) : undefined;
      if (!session || !sessionId)
        return send(response, 404, { error: 'session-missing-or-expired' });
      const token = request.headers.authorization?.replace(/^Bearer /, '') ?? '';
      const camera = sameToken(token, session.cameraToken);
      const monitor = sameToken(token, session.monitorToken);
      if (!camera && !monitor) return send(response, 401, { error: 'unauthorized' });
      if (request.method === 'DELETE' && !slot && camera) {
        sessions.delete(sessionId);
        return send(response, 200, { closed: true });
      }
      if (slot !== 'offer' && slot !== 'answer') return send(response, 405, { error: 'method' });
      const mayWrite = slot === 'offer' ? camera : monitor;
      if (request.method === 'GET' && !mayWrite) return send(response, 200, session[slot]);
      if (request.method === 'PUT' && mayWrite) {
        const description = parseDescription(await readBody(request), slot);
        if (session[slot]) return send(response, 409, { error: 'already-published' });
        session[slot] = description;
        return send(response, 200, { accepted: true });
      }
      return send(response, 403, { error: 'role-or-method' });
    } catch {
      if (!response.headersSent) send(response, 400, { error: 'invalid-payload' });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.maxConnections = 64;
  server.on('close', () => {
    clearInterval(timer);
    sessions.clear();
    presence.clear();
  });
  return server;
}
