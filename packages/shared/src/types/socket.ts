import type { RoleDef } from './role.js';
import type { GamePhase, PublicPlayerInfo, RoomSettings, RoomState, Player } from './room.js';
import type { GameEvent, PublicVote, EndGameRevealData } from './actions.js';

export interface WolfChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ServerToClientEvents {
  'room:created': (data: { room: RoomState; publicPlayers: PublicPlayerInfo[] }) => void;
  'room:player_list_updated': (data: { publicPlayers: PublicPlayerInfo[] }) => void;
  'room:phase_changed': (data: { phase: GamePhase; endsAt: number | null; round: number }) => void;
  'room:timer_extended': (data: { endsAt: number }) => void;
  'room:game_event': (data: { event: GameEvent }) => void;
  'room:vote_update': (data: { votes: PublicVote[] }) => void;
  'room:game_ended': (data: { reveal: EndGameRevealData }) => void;
  'room:error': (data: { message: string }) => void;

  // Private to specific player
  'player:assigned_role': (data: {
    role: RoleDef;
    teammates?: { id: string; name: string; roleName: string }[];
    partner?: { id: string; name: string };
  }) => void;
  'player:night_prompt': (data: {
    canAct: boolean;
    role: RoleDef;
    targets: PublicPlayerInfo[];
    roleOptions?: { id: string; name: string }[];
  }) => void;
  'player:night_result': (data: {
    message: string;
    targetId?: string;
    targetName?: string;
    isWolf?: boolean;
    team?: string;
    round?: number;
    actionDescription?: string;
  }) => void;
  'player:reconnected_state': (data: {
    player: Player;
    room: RoomState;
    publicPlayers: PublicPlayerInfo[];
    role?: RoleDef;
    teammates?: { id: string; name: string; roleName: string }[];
    partner?: { id: string; name: string };
  }) => void;

  // Wolves sub-room
  'wolves:chat_message': (data: WolfChatMessage) => void;
  'wolves:target_proposed': (data: { proposerId: string; proposerName: string; targetId: string | null }) => void;

  // Live Floating Emotes
  'room:emote': (data: { id: string; emoji: string; senderName: string }) => void;
}

export interface ClientToServerEvents {
  'host:create_room': (
    payload: { settings?: Partial<RoomSettings>; groupId?: string },
    callback: (res: { success: boolean; roomCode?: string; hostToken?: string; error?: string }) => void
  ) => void;
  'host:update_settings': (payload: { roomCode: string; settings: RoomSettings }) => void;
  'host:start_game': (
    payload: { roomCode: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;
  'host:extend_timer': (payload: { roomCode: string }) => void;
  'host:skip_phase': (payload: { roomCode: string }) => void;
  'host:kick_player': (payload: { roomCode: string; playerId: string }) => void;
  'host:force_end_game': (payload: { roomCode: string }) => void;
  'host:reconnect': (
    payload: { roomCode: string; hostToken: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'player:join_room': (
    payload: { roomCode: string; playerName: string },
    callback: (res: { success: boolean; playerId?: string; sessionToken?: string; error?: string }) => void
  ) => void;
  'player:reconnect': (
    payload: { roomCode: string; playerId: string; sessionToken: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;
  'player:submit_night_action': (payload: {
    roomCode: string;
    targetPlayerId: string | null;
    secondaryTargetId?: string | null;
  }) => void;
  'player:submit_vote': (payload: {
    roomCode: string;
    targetId: string | null;
  }) => void;
  'player:send_wolf_chat': (payload: {
    roomCode: string;
    text: string;
  }) => void;
  'player:trigger_stuttering_judge': (payload: {
    roomCode: string;
  }) => void;
  'player:submit_ghost_letter': (payload: {
    roomCode: string;
    letter: string;
  }) => void;
  'player:send_emote': (payload: {
    roomCode: string;
    emoji: string;
    senderName?: string;
  }) => void;
}

export interface PersonalNightLog {
  id: string;
  round: number;
  roleId: string;
  roleName: string;
  actionTitle: string;
  actionDescription: string;
  targetName?: string;
  targetId?: string;
  resultMessage?: string;
  resultType?: 'wolf' | 'village' | 'neutral' | 'shield' | 'danger' | 'info';
  timestamp: number;
}
