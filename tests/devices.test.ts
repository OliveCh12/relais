import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { DeviceRegistry, type DeviceStorage } from '../src/connections/registry';
import { DeviceHandshake } from '../src/connections/handshake';
import { linkQuality } from '../src/connections/quality';
import { PRESENCE_TTL_MS, type SavedDevice } from '../src/connections/model';
import { createSignalingServer } from '../scripts/signaling-server';
import type { CreatedSession } from '../src/signaling/protocol';

function memoryRegistry(seed = 1) {
  const values = new Map<string, string>();
  const storage: DeviceStorage = {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
  let counter = seed;
  const random = async (bytes: number) => (++counter).toString(16).padStart(bytes * 2, '0');
  return {
    registry: new DeviceRegistry(storage, random, 'Phone'),
    restart: () => new DeviceRegistry(storage, random, 'Phone'),
    storage,
    values,
  };
}

test('device memory survives restart, keeps local names and forgets credentials', async () => {
  const memory = memoryRegistry();
  const identity = await memory.registry.getIdentity();
  const device: SavedDevice = {
    id: 'a'.repeat(32),
    name: 'Camera',
    pairId: 'b'.repeat(32),
    secret: 'c'.repeat(48),
    server: 'http://192.168.1.2:8787',
    lastConnectedAt: 10,
  };
  await memory.registry.remember(device);
  await memory.registry.rename(device.id, 'Garden camera');
  const restarted = memory.restart();
  assert.deepEqual(await restarted.getIdentity(), identity);
  assert.equal(restarted.getSnapshot()[0]?.name, 'Garden camera');
  await restarted.remember({ ...device, lastConnectedAt: 20, server: 'http://192.168.1.3:8787' });
  assert.equal(restarted.getSnapshot()[0]?.name, 'Garden camera');
  await restarted.forget(device.id);
  assert.equal(memory.values.has(`relais.device.${device.id}`), false);
  const afterForget = memory.restart();
  await afterForget.load();
  assert.deepEqual(afterForget.getSnapshot(), []);
});

test('failed secure writes do not claim that a device was saved', async () => {
  const memory = memoryRegistry();
  await memory.registry.load();
  memory.storage.set = async () => {
    throw new Error('locked');
  };
  await assert.rejects(
    memory.registry.remember({
      id: 'a'.repeat(32),
      name: 'Camera',
      pairId: 'b'.repeat(32),
      secret: 'c'.repeat(48),
      server: 'http://192.168.1.2:8787',
      lastConnectedAt: 10,
    }),
    /locked/,
  );
  assert.equal(memory.registry.getSnapshot().length, 0);
});

async function link(camera: DeviceRegistry, monitor: DeviceRegistry, expected?: SavedDevice) {
  const errors: string[] = [];
  let saved = 0;
  let finish!: () => void;
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const remembered = () => {
    saved += 1;
    if (saved === 2) finish();
  };
  const first = new DeviceHandshake({
    registry: camera,
    role: 'camera',
    server: 'http://192.168.1.2:8787',
    send: (text) => second.receive(text),
    remembered,
    error: (message) => {
      errors.push(message);
      finish();
    },
  });
  const second = new DeviceHandshake({
    registry: monitor,
    role: 'monitor',
    server: 'http://192.168.1.2:8787',
    ...(expected ? { expected } : {}),
    send: (text) => first.receive(text),
    remembered,
    error: (message) => {
      errors.push(message);
      finish();
    },
  });
  const timeout = setTimeout(() => {
    errors.push('handshake timeout');
    finish();
  }, 1000);
  await Promise.all([first.open(), second.open()]);
  await done;
  clearTimeout(timeout);
  first.close();
  second.close();
  return { errors, saved };
}

test('QR association saves both peers, reconnects after restart and supports reversed roles', async () => {
  const one = memoryRegistry(10);
  const two = memoryRegistry(100);
  assert.deepEqual(await link(one.registry, two.registry), { errors: [], saved: 2 });
  const camera = one.restart();
  const monitor = two.restart();
  await Promise.all([camera.load(), monitor.load()]);
  const firstPair = monitor.getSnapshot()[0]!;
  assert.equal(camera.getSnapshot()[0]?.pairId, firstPair.pairId);
  assert.equal(camera.getSnapshot()[0]?.secret, firstPair.secret);
  assert.deepEqual(await link(camera, monitor, firstPair), { errors: [], saved: 2 });
  assert.equal(monitor.getSnapshot()[0]?.pairId, firstPair.pairId);
  assert.deepEqual(await link(monitor, camera, camera.getSnapshot()[0]), { errors: [], saved: 2 });
  await camera.forget((await monitor.getIdentity()).id);
  const refused = await link(camera, monitor, firstPair);
  assert.match(refused.errors.join(), /forgotten/);
  assert.equal(refused.saved, 0);
});

test('availability is private, expires, hides occupied sessions and follows a fresh session', async (t) => {
  let now = 1000;
  const server = createSignalingServer({ now: () => now });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
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
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const create = async () => {
    const session = (await (
      await request('/sessions', 'POST', undefined, {})
    ).json()) as CreatedSession;
    await request(`/sessions/${session.sessionId}/offer`, 'PUT', session.cameraToken, {
      type: 'offer',
      sdp: 'v=0\r\n',
    });
    return session;
  };
  const session = await create();
  const secret = 'd'.repeat(48);
  const path = `/presence/${'a'.repeat(32)}/${'b'.repeat(32)}`;
  assert.equal((await request(path, 'GET')).status, 401);
  assert.equal(
    (
      await request(path, 'PUT', secret, {
        sessionId: session.sessionId,
        cameraToken: session.monitorToken,
      })
    ).status,
    403,
  );
  const publish = (value: CreatedSession) =>
    request(path, 'PUT', secret, { sessionId: value.sessionId, cameraToken: value.cameraToken });
  assert.equal((await publish(session)).status, 200);
  assert.equal((await request(path, 'GET', 'e'.repeat(48))).status, 403);
  assert.equal((await (await request(path, 'GET', secret)).json()).sessionId, session.sessionId);
  now += PRESENCE_TTL_MS + 1;
  assert.equal(await (await request(path, 'GET', secret)).json(), null);
  await publish(session);
  await request(`/sessions/${session.sessionId}/answer`, 'PUT', session.monitorToken, {
    type: 'answer',
    sdp: 'v=0\r\n',
  });
  assert.equal(await (await request(path, 'GET', secret)).json(), null);
  const next = await create();
  await publish(next);
  assert.equal((await (await request(path, 'GET', secret)).json()).sessionId, next.sessionId);
  await request(`/sessions/${next.sessionId}`, 'DELETE', next.cameraToken);
  assert.equal(await (await request(path, 'GET', secret)).json(), null);
});

test('link indicator never invents reception and reflects degraded measured transport', () => {
  assert.equal(linkQuality(null).bars, 0);
  assert.equal(linkQuality({ rtt: NaN, loss: null, jitter: null }).bars, 0);
  assert.equal(linkQuality({ rtt: 30, loss: 0, jitter: 0.005 }).bars, 3);
  assert.equal(linkQuality({ rtt: 160, loss: 0, jitter: 0.005 }).bars, 2);
  assert.equal(linkQuality({ rtt: 30, loss: 0.12, jitter: 0.005 }).bars, 1);
});
