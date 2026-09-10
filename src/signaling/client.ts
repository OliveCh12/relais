import {
  parseDescription,
  privateLanOrigin,
  validId,
  validToken,
  type CreatedSession,
  type SignalDescription,
} from './protocol';

export async function signalRequest(
  server: string,
  path: string,
  method: string,
  signal: AbortSignal,
  token?: string,
  body?: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(abort, 5000);
  try {
    const response = await fetch(`${privateLanOrigin(server)}${path}`, {
      method,
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        response.status === 404 || response.status === 410 || response.status === 403
          ? 'This connection code is no longer available. Create a new one on the Camera phone.'
          : 'Could not connect. Check that the Mac and both phones are on the same Wi-Fi network.',
      );
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export async function createSession(server: string, signal: AbortSignal): Promise<CreatedSession> {
  const result = await signalRequest(server, '/sessions', 'POST', signal, undefined, {});
  if (typeof result !== 'object' || !result)
    throw new Error('Could not prepare the connection. Try again.');
  const value = result as Record<string, unknown>;
  if (
    !validId(value.sessionId) ||
    !validToken(value.cameraToken) ||
    !validToken(value.monitorToken) ||
    typeof value.expiresAt !== 'number'
  )
    throw new Error('Could not prepare the connection. Try again.');
  return {
    sessionId: value.sessionId,
    cameraToken: value.cameraToken,
    monitorToken: value.monitorToken,
    expiresAt: value.expiresAt,
  };
}

export async function pollDescription(
  server: string,
  sessionId: string,
  token: string,
  type: SignalDescription['type'],
  signal: AbortSignal,
  timeoutMs = 120_000,
): Promise<SignalDescription> {
  const deadline = Date.now() + timeoutMs;
  while (!signal.aborted && Date.now() < deadline) {
    const result = await signalRequest(
      server,
      `/sessions/${sessionId}/${type}`,
      'GET',
      signal,
      token,
    );
    if (result !== null) return parseDescription(result, type);
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, 500);
      signal.addEventListener('abort', finish, { once: true });
      if (signal.aborted) finish();
    });
  }
  throw new Error(signal.aborted ? 'Session closed.' : 'Connection timed out. Create a new code.');
}
