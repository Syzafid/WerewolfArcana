import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientSocket, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, Role, GameState } from '@werewolf/shared';
import { setupSocketServer } from '../src/socket/socketServer.js';

describe('12-Player Full Game Lifecycle Simulation', () => {
  let server: http.Server;
  let port: number;
  let hostSocket: Socket<ServerToClientEvents, ClientToServerEvents>;
  const playerSockets: Socket<ServerToClientEvents, ClientToServerEvents>[] = [];

  const playerNames = [
    'Budi (Warga)',
    'Siti (Peramal)',
    'Agus (Pelindung)',
    'Dewi (Penyihir)',
    'Eko (Pemburu)',
    'Rina (Badut)',
    'Joko (Serigala)',
    'Sri (Serigala)',
    'Hendra (Serigala)',
    'Maya (Walikota)',
    'Fajar (Warga)',
    'Tari (Warga)',
  ];

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
    setupSocketServer(io);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 3002;
        resolve();
      });
    });
  });

  afterAll(() => {
    hostSocket?.disconnect();
    playerSockets.forEach((s) => s.disconnect());
    server.close();
  });

  it('should successfully simulate 12 players joining, starting game, resolving night actions, and conducting voting', async () => {
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
          reject(new Error(res.error || 'Failed to create room'));
        }
      });
    });

    expect(roomCode).toBeTruthy();
    console.log(`[SIMULASI 12 PEMAIN] Room dibuat dengan Kode: ${roomCode}`);

    // 2. 12 players join room
    const playerInfo: { id: string; name: string; socket: Socket<ServerToClientEvents, ClientToServerEvents> }[] = [];

    for (const name of playerNames) {
      const pSocket = ClientSocket(serverUrl);
      playerSockets.push(pSocket);

      await new Promise<void>((resolve, reject) => {
        pSocket.emit('player:join_room', { roomCode, playerName: name }, (res: any) => {
          if (res.success && res.playerId) {
            playerInfo.push({ id: res.playerId, name, socket: pSocket });
            resolve();
          } else {
            reject(new Error(res.error || `Player ${name} failed to join`));
          }
        });
      });
    }

    expect(playerInfo.length).toBe(12);
    console.log(`[SIMULASI 12 PEMAIN] Seluruh 12 pemain berhasil masuk lobby.`);

    // 3. Register role assignment listeners for all 12 players
    const assignedRoles: Record<string, Role> = {};
    const rolePromises = playerInfo.map(
      (p) =>
        new Promise<void>((resolve) => {
          p.socket.on('player:assigned_role', ({ role }: any) => {
            assignedRoles[p.id] = role;
            resolve();
          });
        })
    );

    // 4. Host starts game
    const hostStartPromise = new Promise<void>((resolve, reject) => {
      hostSocket.emit('host:start_game', { roomCode }, (res: any) => {
        if (res.success) resolve();
        else reject(new Error(res.error || 'Host failed to start game'));
      });
    });

    await Promise.all([hostStartPromise, ...rolePromises]);

    expect(Object.keys(assignedRoles).length).toBe(12);
    console.log(`[SIMULASI 12 PEMAIN] Game dimulai! Distribusi peran:`);
    for (const p of playerInfo) {
      const r = assignedRoles[p.id];
      console.log(`  - ${p.name}: ${r.indonesianName} (${r.team})`);
    }

    // Identify key roles
    const wolves = playerInfo.filter((p) => assignedRoles[p.id].team === 'werewolf');
    const villagers = playerInfo.filter((p) => assignedRoles[p.id].team === 'village');
    const neutrals = playerInfo.filter((p) => assignedRoles[p.id].team === 'neutral');

    expect(wolves.length).toBeGreaterThanOrEqual(2);
    expect(villagers.length).toBeGreaterThanOrEqual(5);

    // Wait for night phase
    const nightPhasePromise = new Promise<void>((resolve) => {
      hostSocket.on('room:phase_changed', ({ phase }: any) => {
        if (phase === 'night') resolve();
      });
    });

    // Skip role reveal to jump directly to night
    hostSocket.emit('host:skip_phase', { roomCode });
    await nightPhasePromise;
    console.log(`[SIMULASI 12 PEMAIN] Fase Malam 1 dimulai!`);

    // 5. Simulate Night Phase Actions
    // Target victim is the first villager
    const victim = villagers[0];
    console.log(`[SIMULASI 12 PEMAIN] Fase Malam 1: Kawanan Serigala memilih memangsa ${victim.name}`);

    for (const wolf of wolves) {
      wolf.socket.emit('player:submit_night_action', {
        roomCode,
        targetPlayerId: victim.id,
      });
    }

    // If there's a Seer, check a wolf
    const seer = playerInfo.find((p) => assignedRoles[p.id].id === 'seer');
    if (seer && wolves[0]) {
      console.log(`[SIMULASI 12 PEMAIN] Peramal (${seer.name}) mengintip peran ${wolves[0].name}`);
      seer.socket.emit('player:submit_night_action', {
        roomCode,
        targetPlayerId: wolves[0].id,
      });
    }

    // If there's a Guardian, protect someone
    const guardian = playerInfo.find((p) => assignedRoles[p.id].id === 'guardian');
    if (guardian && villagers[1]) {
      console.log(`[SIMULASI 12 PEMAIN] Pelindung (${guardian.name}) menjaga ${villagers[1].name}`);
      guardian.socket.emit('player:submit_night_action', {
        roomCode,
        targetPlayerId: villagers[1].id,
      });
    }

    await new Promise((r) => setTimeout(r, 100));

    // 6. Host skips night to Day Phase
    console.log(`[SIMULASI 12 PEMAIN] Host menyelesaikan malam -> Transisi ke Fase Siang...`);
    const dayPhasePromise = new Promise<void>((resolve) => {
      hostSocket.on('room:phase_changed', ({ phase }: any) => {
        if (phase === 'day') resolve();
      });
    });

    hostSocket.emit('host:skip_phase', { roomCode });
    await dayPhasePromise;
    console.log(`[SIMULASI 12 PEMAIN] Fase Siang Aktif! Warga berdiskusi.`);

    // 7. Host skips discussion into voting
    const votingPhasePromise = new Promise<void>((resolve) => {
      hostSocket.on('room:phase_changed', ({ phase }: any) => {
        if (phase === 'voting') resolve();
      });
    });

    hostSocket.emit('host:skip_phase', { roomCode });
    await votingPhasePromise;
    console.log(`[SIMULASI 12 PEMAIN] Fase Voting Dimulai! Seluruh warga memberikan suara...`);

    // 8. Day Voting: All alive players vote on wolves[0]
    const suspect = wolves[0];
    console.log(`[SIMULASI 12 PEMAIN] Mayoritas warga sepakat mencurigai dan memvoting: ${suspect.name}`);

    for (const p of playerInfo) {
      p.socket.emit('player:submit_vote', { roomCode, targetId: suspect.id });
    }

    // Wait a brief tick for vote processing
    await new Promise((r) => setTimeout(r, 150));

    // Host resolves voting
    const postVotingPromise = new Promise<void>((resolve) => {
      hostSocket.on('room:phase_changed', () => resolve());
    });

    hostSocket.emit('host:skip_phase', { roomCode });
    await postVotingPromise;

    console.log(`[SIMULASI 12 PEMAIN] Eksekusi voting selesai! Siklus 12 pemain tuntas 100% tanpa error.`);
  }, 20000);
});
