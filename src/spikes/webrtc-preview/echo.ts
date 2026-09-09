export type EchoMessage =
  | { type: 'ping'; id: number }
  | { type: 'pong'; id: number }
  | { type: 'rec-mock'; id: number }
  | { type: 'rec-mock-ack'; id: number };

export function parseEcho(value: unknown): EchoMessage | null {
  if (typeof value !== 'string' || value.length > 256) return null;
  try {
    const message: unknown = JSON.parse(value);
    if (typeof message !== 'object' || !message) return null;
    const data = message as Record<string, unknown>;
    if (
      !['ping', 'pong', 'rec-mock', 'rec-mock-ack'].includes(String(data.type)) ||
      typeof data.id !== 'number' ||
      !Number.isSafeInteger(data.id) ||
      data.id < 0
    )
      return null;
    return data as EchoMessage;
  } catch {
    return null;
  }
}
