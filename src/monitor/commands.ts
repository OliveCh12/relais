import type { CameraCommand } from '../domain/commands';
import type { CommandTransport } from '../transport/api';

export async function sendCameraCommand(transport: CommandTransport, command: CameraCommand) {
  const result = await transport.send(command);
  if (result.id !== command.id) throw new Error('ACK reçu pour une autre commande.');
  if (!result.ok) throw new Error(result.message);
  return result;
}
