export type BalanceVerdict = 'green' | 'yellow' | 'red';

export interface BalanceEvaluation {
  score: number;
  verdict: BalanceVerdict;
  verdictLabel: string;
  reasons: string[];
}

export interface Preset {
  id: string;
  name: string;
  theme: string;
  description: string;
  emphasisCategory: string;
  suggestedRoles: string[];
}

export interface RoleActivationHistory {
  groupId: string;
  roleId: string;
  lastActiveAt: number;
  timesActiveRecently: number;
  winRateWhenActive: number | null;
}

export interface GameSession {
  id: string;
  groupId: string;
  enabledRoles: string[];
  winningTeam: string | string[];
  playerCount: number;
  durationSec: number;
  endedAt: number;
}
