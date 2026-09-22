import type { Server, Socket } from 'socket.io';
import {
  ALL_ROLES,
  type ServerToClientEvents,
  type ClientToServerEvents,
} from '@werewolf/shared';
import { roomManager } from '../rooms/roomManager.js';
import { GameLoop } from '../engine/gameLoop.js';
import { formatPublicVotes } from '../engine/votingSystem.js';

export function setupSocketServer(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const gameLoop = new GameLoop(io);

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. HOST EVENTS
    socket.on('host:create_room', (payload, callback) => {
      try {
        const room = roomManager.createRoom(socket.id, payload.settings, payload.groupId);
        socket.join(`room:${room.state.code}`);

        const publicPlayers = roomManager.getPublicPlayers(room.state.code);
        callback({
          success: true,
          roomCode: room.state.code,
          hostToken: room.state.hostToken,
        });

        socket.emit('room:created', {
          room: room.state,
          publicPlayers,
        });
      } catch (err: unknown) {
        callback({ success: false, error: (err as Error).message });
      }
    });

    socket.on('host:update_settings', ({ roomCode, settings }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.hostSocketId !== socket.id) return;
      room.state.settings = { ...room.state.settings, ...settings };
    });

    socket.on('host:start_game', ({ roomCode }, callback) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) return callback({ success: false, error: 'Room tidak ditemukan.' });
      if (room.state.hostSocketId !== socket.id) {
        return callback({ success: false, error: 'Hanya host yang dapat memulai permainan.' });
      }

      const res = gameLoop.startGame(room);
      callback(res);
    });

    socket.on('host:extend_timer', ({ roomCode }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.hostSocketId !== socket.id) return;
      gameLoop.extendTimer(room);
    });

    socket.on('host:skip_phase', ({ roomCode }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.hostSocketId !== socket.id) return;
      gameLoop.skipPhase(room);
    });

    socket.on('host:kick_player', ({ roomCode, playerId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.hostSocketId !== socket.id) return;

      const player = room.players.get(playerId);
      if (player) {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        playerSocket?.disconnect(true);
        room.players.delete(playerId);

        const publicPlayers = roomManager.getPublicPlayers(roomCode);
        io.to(`room:${roomCode}`).emit('room:player_list_updated', { publicPlayers });
      }
    });

    socket.on('host:force_end_game', ({ roomCode }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.hostSocketId !== socket.id) return;

      gameLoop.endGame(room, {
        hasWinner: true,
        winner: 'stalemate',
        winnerTitle: 'Diakhiri Oleh Host',
        reason: 'Host moderator memilih untuk mengakhiri permainan.',
      });
    });

    socket.on('host:reconnect', ({ roomCode, hostToken }, callback) => {
      const result = roomManager.reconnectHost(roomCode, hostToken, socket.id);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      const room = roomManager.getRoom(roomCode)!;
      socket.join(`room:${room.state.code}`);
      const publicPlayers = roomManager.getPublicPlayers(room.state.code);

      socket.emit('room:created', {
        room: room.state,
        publicPlayers,
      });

      callback({ success: true });
    });

    // 2. PLAYER EVENTS
    socket.on('player:join_room', ({ roomCode, playerName }, callback) => {
      const result = roomManager.joinPlayer(roomCode, playerName, socket.id);
      if (result.error || !result.player) {
        return callback({ success: false, error: result.error });
      }

      const player = result.player;
      socket.join(`room:${roomCode.toUpperCase()}`);
      socket.join(`player:${player.id}`);

      const publicPlayers = roomManager.getPublicPlayers(roomCode);
      io.to(`room:${roomCode.toUpperCase()}`).emit('room:player_list_updated', { publicPlayers });

      callback({
        success: true,
        playerId: player.id,
        sessionToken: player.sessionToken,
      });
    });

    socket.on('player:reconnect', ({ roomCode, playerId, sessionToken }, callback) => {
      const result = roomManager.reconnectPlayer(roomCode, playerId, sessionToken, socket.id);
      if (result.error || !result.player) {
        return callback({ success: false, error: result.error });
      }

      const player = result.player;
      const room = roomManager.getRoom(roomCode)!;

      socket.join(`room:${room.state.code}`);
      socket.join(`player:${player.id}`);

      const roleDef = player.roleId ? ALL_ROLES[player.roleId] : undefined;
      if (roleDef && roleDef.team === 'werewolf') {
        socket.join(`room:${room.state.code}:wolves`);
      }

      const publicPlayers = roomManager.getPublicPlayers(room.state.code);
      io.to(`room:${room.state.code}`).emit('room:player_list_updated', { publicPlayers });

      socket.emit('player:reconnected_state', {
        player,
        room: room.state,
        publicPlayers,
        role: roleDef,
      });

      callback({ success: true });
    });

    socket.on('player:submit_night_action', ({ roomCode, targetPlayerId, secondaryTargetId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.phase !== 'night') return;

      const { player } = roomManager.findRoomBySocketId(socket.id);
      if (!player || !player.alive) return;

      room.nightActions.set(player.id, {
        playerId: player.id,
        roleId: player.roleId,
        targetPlayerId,
        secondaryTargetId,
        timestamp: Date.now(),
      });
    });

    socket.on('player:submit_vote', ({ roomCode, targetId }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.state.phase !== 'voting') return;

      const { player } = roomManager.findRoomBySocketId(socket.id);
      if (!player || !player.alive) return;

      room.votes.set(player.id, {
        voterId: player.id,
        targetId,
        round: room.state.round,
        timestamp: Date.now(),
      });

      const publicVotes = formatPublicVotes(room.votes, room.players);
      io.to(`room:${room.state.code}`).emit('room:vote_update', { votes: publicVotes });
    });

    socket.on('player:send_wolf_chat', ({ roomCode, text }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const { player } = roomManager.findRoomBySocketId(socket.id);
      if (!player) return;

      const roleDef = ALL_ROLES[player.roleId];
      if (roleDef && roleDef.team === 'werewolf') {
        io.to(`room:${room.state.code}:wolves`).emit('wolves:chat_message', {
          senderId: player.id,
          senderName: player.name,
          text,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('player:trigger_stuttering_judge', ({ roomCode }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
      if (!player || player.roleId !== 'stuttering_judge' || !player.alive || player.stutteringJudgeUsed) return;

      player.stutteringJudgeUsed = true;
      room.state.secondVoteRoundPending = true;

      io.to(`room:${room.state.code}`).emit('room:game_event', {
        event: {
          id: 'ev_judge_ready_' + Date.now(),
          type: 'judge_invoked',
          message: `👨‍⚖️ Hakim Gagap (${player.name}) bersiap memukul palunya! Hari ini akan diselenggarakan 2 ronde voting!`,
          timestamp: Date.now(),
        },
      });
    });

    socket.on('player:submit_ghost_letter', ({ roomCode, letter }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;
      const player = Array.from(room.players.values()).find((p) => p.socketId === socket.id);
      if (!player || player.roleId !== 'ghost' || player.alive) return; // Ghost must be dead

      const cleanLetter = (letter || '').trim().toUpperCase().charAt(0);
      if (!cleanLetter) return;
      player.ghostLetter = cleanLetter;

      io.to(`room:${room.state.code}`).emit('room:game_event', {
        event: {
          id: 'ev_ghost_' + Date.now(),
          type: 'ghost_letter',
          message: `👻 Bisikan gaib sang Hantu (${player.name}) terukir di dinding desa: [ ${cleanLetter} ]`,
          timestamp: Date.now(),
        },
      });
    });

    socket.on('player:send_emote', ({ roomCode, emoji, senderName }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const { player } = roomManager.findRoomBySocketId(socket.id);
      const name = senderName || player?.name || 'Pemain';

      io.to(`room:${room.state.code}`).emit('room:emote', {
        id: `emote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        emoji,
        senderName: name,
      });
    });

    // 3. DISCONNECTION
    socket.on('disconnect', () => {
      const found = roomManager.findRoomBySocketId(socket.id);
      if (!found.room) return;

      const room = found.room;

      if (found.isHost) {
        // Host disconnected: start 60 seconds grace period
        if (!room.hostDisconnectTimer) {
          room.hostDisconnectTimer = setTimeout(() => {
            roomManager.deleteRoom(room.state.code);
          }, 60000);
        }
      } else if (found.player) {
        found.player.connected = false;
        const publicPlayers = roomManager.getPublicPlayers(room.state.code);
        io.to(`room:${room.state.code}`).emit('room:player_list_updated', { publicPlayers });
      }
    });
  });
}
