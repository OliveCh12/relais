import { networkInterfaces } from 'node:os';
import { createSignalingServer } from './signaling-server';
import { privateLanOrigin } from '../src/signaling/protocol';

const port = Number(process.env.RELAIS_SIGNALING_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid Relais port.');
const server = createSignalingServer();
server.listen(port, '0.0.0.0', () => {
  console.log('SPIKE — ephemeral signaling, no media. Stop: Ctrl+C.');
  for (const addresses of Object.values(networkInterfaces()))
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      try {
        console.log(`LAN: ${privateLanOrigin(`http://${address.address}:${port}`)}`);
      } catch {
        /* Ignore public and virtual non-LAN interfaces. */
      }
    }
});
const close = () => {
  server.close();
  server.closeAllConnections();
};
process.once('SIGINT', close);
process.once('SIGTERM', close);
