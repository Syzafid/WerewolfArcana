import type {
  RoomState,
  Player,
  PublicPlayerInfo,
  RoomSettings,
  NightAction,
  Vote,
  GameEvent,
} from '@werewolf/shared';
import { generateRoomCode, generateToken } from './roomCode.js';

export interface ActiveRoom {
  state: RoomState;
  players: Map<string, Player>; // playerId -> Player
  nightActions: Map<string, NightAction>; // playerId -> NightAction
  votes: Map<string, Vote>; // voterId -> Vote
  events: GameEvent[];
  hostDisconnectTimer: NodeJS.Timeout | null;
  phaseTimer: NodeJS.Timeout | null;
}

export class RoomManager {
  private rooms: Map<string, ActiveRoom> = new Map();

  public createRoom(hostSocketId: string, settings?: Partial<RoomSettings>, groupId?: string): ActiveRoom {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const hostToken = generateToken(20);
    const roomSettings: RoomSettings = {
      enabledRoles: settings?.enabledRoles || ['villager', 'villager', 'villager', 'werewolf', 'seer'],
      dayDurationSec: settings?.dayDurationSec || 90,
      nightDurationSec: settings?.nightDurationSec || 45,
      groupId: groupId || 'default-group',
    };

    const roomState: RoomState = {
      code,
      hostSocketId,
      hostToken,
      phase: 'lobby',
      phaseEndsAt: null,
      round: 0,
      settings: roomSettings,
      winner: null,
      extendedTimerUsed: false,
    };

    const room: ActiveRoom = {
      state: roomState,
      players: new Map(),
      nightActions: new Map(),
      votes: new Map(),
      events: [],
      hostDisconnectTimer: null,
      phaseTimer: null,
    };

    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): ActiveRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public deleteRoom(code: string): void {
    const room = this.rooms.get(code.toUpperCase());
    if (room) {
      if (room.hostDisconnectTimer) clearTimeout(room.hostDisconnectTimer);
      if (room.phaseTimer) clearTimeout(room.phaseTimer);
      this.rooms.delete(code.toUpperCase());
    }
  }

  public joinPlayer(code: string, playerName: string, socketId: string): { player?: Player; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room tidak ditemukan.' };

    if (room.state.phase !== 'lobby') {
      return { error: 'Permainan sudah dimulai. Room terkunci untuk pemain baru.' };
    }

    // Check duplicate name
    for (const p of room.players.values()) {
      if (p.name.trim().toLowerCase() === playerName.trim().toLowerCase() && p.connected) {
        return { error: 'Nama sudah digunakan di room ini.' };
      }
    }

    const playerId = 'p_' + generateToken(8).toLowerCase();
    const sessionToken = generateToken(24);
    const avatarSeed = playerName.toLowerCase() + '_' + Math.floor(Math.random() * 1000);

    const player: Player = {
      id: playerId,
      name: playerName.trim(),
      socketId,
      sessionToken,
      roleId: '',
      alive: true,
      connected: true,
      avatarSeed,
    };

    room.players.set(playerId, player);
    return { player };
  }

  public reconnectPlayer(code: string, playerId: string, sessionToken: string, newSocketId: string): { player?: Player; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room tidak ditemukan.' };

    const player = room.players.get(playerId);
    if (!player) return { error: 'Pemain tidak ditemukan.' };

    if (player.sessionToken !== sessionToken) {
      return { error: 'Token sesi tidak valid.' };
    }

    player.socketId = newSocketId;
    player.connected = true;
    return { player };
  }

  public reconnectHost(code: string, hostToken: string, newSocketId: string): { success: boolean; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room tidak ditemukan.' };

    if (room.state.hostToken !== hostToken) {
      return { success: false, error: 'Host token tidak cocok.' };
    }

    if (room.hostDisconnectTimer) {
      clearTimeout(room.hostDisconnectTimer);
      room.hostDisconnectTimer = null;
    }

    room.state.hostSocketId = newSocketId;
    return { success: true };
  }

  public getPublicPlayers(code: string): PublicPlayerInfo[] {
    const room = this.getRoom(code);
    if (!room) return [];

    return Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected,
      avatarSeed: p.avatarSeed,
    }));
  }

  public findRoomBySocketId(socketId: string): { room?: ActiveRoom; isHost: boolean; player?: Player } {
    for (const room of this.rooms.values()) {
      if (room.state.hostSocketId === socketId) {
        return { room, isHost: true };
      }
      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          return { room, isHost: false, player };
        }
      }
    }
    return { isHost: false };
  }
}

export const roomManager = new RoomManager();
