export type GamePhase =
  | 'lobby'
  | 'config'
  | 'role_reveal'
  | 'night'
  | 'day'
  | 'voting'
  | 'ended';

export interface RoomSettings {
  enabledRoles: string[];
  dayDurationSec: number;
  nightDurationSec: number;
  groupId: string;
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  sessionToken: string;
  roleId: string;
  fakeRoleId?: string; // Drunk thinks they have this role!
  alive: boolean;
  connected: boolean;
  avatarSeed: string;
  partnerId?: string; // Lovers link
  roleModelId?: string; // Wild Child's role model
  executionerTargetId?: string; // Executioner's assigned target
  isDoused?: boolean; // Arsonist gas
  isCharmed?: boolean; // Piper charm
  charmedByPiper?: boolean; // Piper charm alternative property
  idiotPardoned?: boolean; // Village Idiot pardoned flag
  isCult?: boolean; // Cult Leader follower
  canVote?: boolean; // False for Village Idiot / Priest limit
  witchPotions?: { heal: boolean; poison: boolean }; // Witch items
  alertsLeft?: number; // Veteran alerts
  elderShields?: number; // Elder shield charges against werewolf attacks
  lastProtectedTargetId?: string; // Defender/Guardian/Doctor/Bodyguard/Crusader previous target
  lastRoleblockTargetId?: string; // Escort previous target
  lastJailedTargetId?: string; // Jailer previous target
  jailerExecutionsLeft?: number; // Jailer remaining execution charges (starts at 3)
  jailerLostExecutions?: boolean; // True if Jailer executed innocent villager, losing executions forever
  survivorVestsLeft?: number; // Survivor remaining bulletproof vests (starts at 3)
  vigilanteGuilt?: boolean; // Vigilante guilt suicide flag
  foxLostPower?: boolean; // Fox loses power if checks reveal 0 wolves
  hunterTargetId?: string; // Hunter's retaliatory target
  doppelgangerTargetId?: string; // Doppelganger target to inherit
  paranormalLostPower?: boolean; // Paranormal Investigator power loss
  holyWaterUsed?: boolean; // Priest holy water limit
  slayerUsedShot?: boolean; // Slayer public guess limit
  cursedFatherUsedInfect?: boolean; // Cursed Wolf-Father 1x infection limit
  stutteringJudgeUsed?: boolean; // Stuttering Judge 1x second voting round limit
  ghostLetter?: string; // Ghost daily letter clue
}

export interface PublicPlayerInfo {
  id: string;
  name: string;
  alive: boolean;
  connected: boolean;
  avatarSeed: string;
}

export interface RoomState {
  code: string;
  hostSocketId: string;
  hostToken: string;
  phase: GamePhase;
  phaseEndsAt: number | null; // epoch timestamp ms for synchronized countdown
  round: number;
  settings: RoomSettings;
  winner: string | string[] | null;
  extendedTimerUsed: boolean; // host extend timer once per phase
  seatingOrder?: string[]; // Circular player IDs arrangement
  wolfKillsQuota?: number; // Quota of kills per night (1 by default, 2 if wolf cub died)
  villageCursed?: boolean; // True if Elder was lynched by village, stripping village powers
  secondVoteRoundPending?: boolean; // True if Stuttering Judge invoked second voting round
  votingRound?: number; // 1 or 2 for daytime voting rounds
}
