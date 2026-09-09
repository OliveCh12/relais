import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createSignalingServer } from '../scripts/signaling-server';
import { parsePairingQr, privateLanOrigin, type CreatedSession } from '../src/signaling/protocol';
import { parseEcho } from '../src/spikes/webrtc-preview/echo';

const descriptor = {
  kind: 'relais-spike',
  version: 1,
  server: 'http://192.168.1.5:8787',
  sessionId: 'a'.repeat(32),
  token: 'b'.repeat(48),
  expiresAt: 2000,
};

test('QR validates version, LAN endpoint, credentials and expiry', () => {
  assert.deepEqual(parsePairingQr(JSON.stringify(descriptor), 1000), descriptor);
  for (const value of [
    { ...descriptor, version: 2 },
    { ...descriptor, kind: 'relais-demo' },
    { ...descriptor, expiresAt: 999 },
    { ...descriptor, expiresAt: 1e10 },
    { ...descriptor, token: 'secret' },
    { ...descriptor, sessionId: '../sessions' },
    { ...descriptor, server: 'https://example.com' },
  ])
    assert.throws(() => parsePairingQr(JSON.stringify(value), 1000));
  assert.throws(() => parsePairingQr('x'.repeat(3000), 1000));
});

test('only explicit RFC1918 origins are accepted', () => {
  for (const value of [
    'http://10.0.0.1:8787',
    'http://172.16.0.1',
    'http://172.31.255.254',
    'http://192.168.1.2',
  ])
    assert.equal(privateLanOrigin(value), value);
  for (const value of [
    'http://127.0.0.1',
    'http://8.8.8.8',
    'http://169.254.169.254',
    'http://172.32.0.1',
    'http://192.168.1.1/other',
    'http://user:pass@10.0.0.1',
    'http://10.0.0.1?x=1',
    'http://local.example',
    'file:///etc/passwd',
  ])
    assert.throws(() => privateLanOrigin(value));
});

test('echo accepts only bounded spike messages', () => {
  assert.deepEqual(parseEcho('{"type":"rec-mock","id":1}'), { type: 'rec-mock', id: 1 });
  for (const value of [
    null,
    'not json',
    '{"type":"start-recording","id":1}',
    '{"type":"ping","id":-1}',
    'x'.repeat(300),
  ])
    assert.equal(parseEcho(value), null);
});

test('LAN signaling enforces roles, single publication, payload bounds and expiration', async (t) => {
  let now = 1000;
  const server = createSignalingServer({ now: () => now, ttl: 1000, maxSessions: 1 });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (path: string, method: string, token?: string, body?: unknown) =>
    fetch(origin + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const created = await request('/sessions', 'POST', undefined, {});
  assert.equal(created.status, 201);
  const session = (await created.json()) as CreatedSession;
  assert.notEqual(session.cameraToken, session.monitorToken);
  assert.equal((await request('/sessions', 'POST', undefined, {})).status, 429);
  const path = `/sessions/${session.sessionId}`;
  const offer = { type: 'offer', sdp: 'v=0\r\na=candidate:host\r\n' };
  assert.equal((await request(`${path}/offer`, 'GET')).status, 401);
  assert.equal((await request(`${path}/offer`, 'PUT', session.monitorToken, offer)).status, 403);
  assert.equal(
    (
      await request(`${path}/offer`, 'PUT', session.cameraToken, {
        type: 'offer',
        sdp: 'v=0' + 'x'.repeat(140000),
      })
    ).status,
    400,
  );
  assert.equal((await request(`${path}/offer`, 'PUT', session.cameraToken, offer)).status, 200);
  assert.equal((await request(`${path}/offer`, 'PUT', session.cameraToken, offer)).status, 409);
  assert.deepEqual(
    await (await request(`${path}/offer`, 'GET', session.monitorToken)).json(),
    offer,
  );
  const answer = { type: 'answer', sdp: 'v=0\r\n' };
  assert.equal((await request(`${path}/answer`, 'PUT', session.cameraToken, answer)).status, 403);
  assert.equal((await request(`${path}/answer`, 'PUT', session.monitorToken, answer)).status, 200);
  assert.deepEqual(
    await (await request(`${path}/answer`, 'GET', session.cameraToken)).json(),
    answer,
  );
  assert.equal((await request(path, 'DELETE', session.monitorToken)).status, 405);
  now = 2001;
  assert.equal((await request(`${path}/offer`, 'GET', session.monitorToken)).status, 404);
  const second = (await (
    await request('/sessions', 'POST', undefined, {})
  ).json()) as CreatedSession;
  assert.equal(
    (await request(`/sessions/${second.sessionId}`, 'DELETE', second.cameraToken)).status,
    200,
  );
  assert.equal(
    (await request(`/sessions/${second.sessionId}/offer`, 'GET', second.monitorToken)).status,
    404,
  );
});
