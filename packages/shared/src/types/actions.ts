export interface NightAction {
  playerId: string;
  roleId: string;
  targetPlayerId: string | null;
  secondaryTargetId?: string | null;
  timestamp: number;
}

export interface Vote {
  voterId: string;
  targetId: string | null; // null represents abstain
  round: number;
  timestamp: number;
}

export interface PublicVote {
  voterId: string;
  voterName: string;
  targetId: string | null;
  targetName: string | null;
}

export interface GameEvent {
  id: string;
  type:
    | 'player_died'
    | 'player_saved'
    | 'vote_result'
    | 'phase_change'
    | 'stalemate_triggered'
    | 'judge_round'
    | 'judge_invoked'
    | 'ghost_letter';
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface EndGameRevealPlayer {
  id: string;
  name: string;
  roleId: string;
  roleName: string;
  roleIndonesianName: string;
  team: string;
  alive: boolean;
}

export interface EndGameRevealData {
  winner: string | string[]; // 'werewolf' | 'village' | 'lovers' | 'tanner' etc.
  players: EndGameRevealPlayer[];
  rounds: number;
  durationSec: number;
}
