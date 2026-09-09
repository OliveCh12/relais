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
      throw new Error(`Signaling HTTP ${response.status}. Vérifiez le LAN et la session.`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export async function createSession(server: string, signal: AbortSignal): Promise<CreatedSession> {
  const result = await signalRequest(server, '/sessions', 'POST', signal, undefined, {});
  if (typeof result !== 'object' || !result) throw new Error('Réponse signaling invalide.');
  const value = result as Record<string, unknown>;
  if (
    !validId(value.sessionId) ||
    !validToken(value.cameraToken) ||
    !validToken(value.monitorToken) ||
    typeof value.expiresAt !== 'number'
  )
    throw new Error('Réponse signaling invalide.');
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
): Promise<SignalDescription> {
  const deadline = Date.now() + 120_000;
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
  throw new Error(signal.aborted ? 'Session fermée.' : 'Pairing expiré. Créez un nouveau QR.');
}
