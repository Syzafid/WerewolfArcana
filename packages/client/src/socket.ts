import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@werewolf/shared';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('/', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
