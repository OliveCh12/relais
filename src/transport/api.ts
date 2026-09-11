import type { CameraCommand, CommandResult } from '../domain/commands';

export interface CommandTransport {
  send(command: CameraCommand): Promise<CommandResult>;
}
