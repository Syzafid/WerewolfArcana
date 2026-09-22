export type Team = 'village' | 'werewolf' | 'neutral';

export type ActionType = 'independent' | 'reactive' | 'none';

export type TargetType = 'single_player' | 'two_players' | 'none';

export type ReactiveTrigger = 'onDeath' | 'onKilled' | 'onVoteTie' | null;

export type BalanceCategory =
  | 'investigative'
  | 'protective'
  | 'association'
  | 'village_killer'
  | 'outsider'
  | 'disruptive'
  | 'vote_empowerment'
  | 'reactive'
  | 'werewolf_core'
  | 'werewolf_deceptive'
  | 'neutral_independent';

export interface CompensationRule {
  addRoleId: string;
  condition: 'belowPlayerCount';
  threshold: number;
}

export interface RoleDef {
  id: string;
  name: string;
  indonesianName: string;
  description: string;
  team: Team;
  actionType: ActionType;
  targetType: TargetType;
  resolutionPriority: number; // lower number = resolved earlier in night Stage 2
  reactiveTrigger: ReactiveTrigger;
  visibility: {
    seeTeammates: boolean;
  };
  balanceWeight: number;
  balanceCategory: BalanceCategory;
  minPlayers: number;
  conflictsWith: string[];
  compensationRule: CompensationRule | null;
}
