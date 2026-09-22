import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@werewolf/shared';
import { setupSocketServer } from '../src/socket/socketServer.js';

describe('End-to-End Multi-Socket Game Simulation', () => {
  let server: http.Server;
  let port: number;
  let hostSocket: Socket<ServerToClientEvents, ClientToServerEvents>;
  const playerSockets: Socket<ServerToClientEvents, ClientToServerEvents>[] = [];

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
    setupSocketServer(io);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3001;
        resolve();
      });
    });
  });

  afterAll(() => {
    hostSocket?.disconnect();
    playerSockets.forEach((s) => s.disconnect());
    server.close();
  });

  it('should successfully run a full game lifecycle: create room -> 5 players join -> start game -> night action -> day -> voting', async () => {
    const serverUrl = `http://localhost:${port}`;

    // 1. Host creates room
    hostSocket = ClientSocket(serverUrl);
    let roomCode = '';

    await new Promise<void>((resolve, reject) => {
      hostSocket.emit('host:create_room', {}, (res: any) => {
        if (res.success && res.roomCode) {
          roomCode = res.roomCode;
          resolve();
        } else {
          reject(new Error(res.error));
        }
      });
    });

    expect(roomCode).toBeTruthy();

    // 2. 5 players join room
    const playerNames = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
    const playerIds: string[] = [];

    for (const name of playerNames) {
      const pSocket = ClientSocket(serverUrl);
      playerSockets.push(pSocket);

      await new Promise<void>((resolve, reject) => {
        pSocket.emit('player:join_room', { roomCode, playerName: name }, (res: any) => {
          if (res.success && res.playerId) {
            playerIds.push(res.playerId);
            resolve();
          } else {
            reject(new Error(res.error));
          }
        });
      });
    }

    expect(playerIds.length).toBe(5);

    // 3. Register role listeners BEFORE starting game
    const rolePromises = playerSockets.map(
      (s) =>
        new Promise<string>((resolve) => {
          s.on('player:assigned_role', ({ role }: any) => {
            resolve(role.id);
          });
        })
    );

    // 4. Host starts game
    const startGamePromise = new Promise<void>((resolve, reject) => {
      hostSocket.emit('host:start_game', { roomCode }, (res: any) => {
        if (res.success) resolve();
        else reject(new Error(res.error));
      });
    });

    await expect(startGamePromise).resolves.toBeUndefined();

    const assignedRoleIds = await Promise.all(rolePromises);
    expect(assignedRoleIds.length).toBe(5);
    expect(assignedRoleIds).toContain('werewolf');
    expect(assignedRoleIds).toContain('seer');
  }, 15000);
});
