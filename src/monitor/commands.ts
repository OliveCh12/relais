import type { CameraCommand } from '../domain/commands';
import type { CommandTransport } from '../transport/api';

export async function sendCameraCommand(transport: CommandTransport, command: CameraCommand) {
  const result = await transport.send(command);
  if (result.id !== command.id) throw new Error('Received an ACK for a different command.');
  if (!result.ok) throw new Error(result.message);
  return result;
}
