import { create } from 'zustand';
import type {
  RoleDef,
  RoomState,
  PublicPlayerInfo,
  GameEvent,
  WolfChatMessage,
  PersonalNightLog,
} from '@werewolf/shared';

const getStoredLogs = (playerId: string | null): PersonalNightLog[] => {
  if (!playerId) return [];
  try {
    const raw = localStorage.getItem(`ww_personal_logs_${playerId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getStoredNotes = (playerId: string | null): Record<string, string> => {
  if (!playerId) return {};
  try {
    const raw = localStorage.getItem(`ww_personal_notes_${playerId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

import {
  ACHIEVEMENTS,
  calculateLevel,
  loadGamification,
  saveGamification,
  type PlayerGamificationState,
} from '../utils/gamification.js';
import { soundManager } from '../utils/soundManager.js';

interface NightResultPayload {
  message: string;
  targetId?: string;
  isWolf?: boolean;
  round?: number;
  targetName?: string;
  actionDescription?: string;
}

interface PlayerStore {
  playerId: string | null;
  sessionToken: string | null;
  playerName: string;
  roomCode: string;
  room: RoomState | null;
  publicPlayers: PublicPlayerInfo[];
  role: RoleDef | null;
  teammates: { id: string; name: string; roleName: string }[];
  partner: { id: string; name: string } | null;
  nightPrompt: { canAct: boolean; role: RoleDef; targets: PublicPlayerInfo[]; roleOptions?: { id: string; name: string }[] } | null;
  nightResult: NightResultPayload | null;
  submittedNightTarget: string | null;
  submittedVoteTarget: string | null;
  wolfChatMessages: WolfChatMessage[];
  isRoleModalOpen: boolean;
  isLogModalOpen: boolean;
  isAchievementsModalOpen: boolean;
  hasUnreadLog: boolean;
  personalLogs: PersonalNightLog[];
  personalNotes: Record<string, string>;
  eventsLog: GameEvent[];
  gamification: PlayerGamificationState;
  pendingToast: { type: 'achievement' | 'levelup'; title: string; description: string; icon?: string } | null;

  setAuth: (playerId: string, sessionToken: string, roomCode: string, playerName: string) => void;
  setRoom: (room: RoomState | null) => void;
  setPublicPlayers: (players: PublicPlayerInfo[]) => void;
  setRole: (
    role: RoleDef | null,
    teammates?: { id: string; name: string; roleName: string }[],
    partner?: { id: string; name: string } | null
  ) => void;
  setNightPrompt: (
    prompt: { canAct: boolean; role: RoleDef; targets: PublicPlayerInfo[]; roleOptions?: { id: string; name: string }[] } | null
  ) => void;
  setNightResult: (result: NightResultPayload | null) => void;
  setSubmittedNightTarget: (target: string | null) => void;
  setSubmittedVoteTarget: (target: string | null) => void;
  addWolfChatMessage: (msg: WolfChatMessage) => void;
  setIsRoleModalOpen: (open: boolean) => void;
  setIsLogModalOpen: (open: boolean) => void;
  setIsAchievementsModalOpen: (open: boolean) => void;
  clearPendingToast: () => void;
  setHasUnreadLog: (unread: boolean) => void;
  addOrUpdatePersonalLog: (log: Partial<PersonalNightLog> & { round: number }) => void;
  setPersonalNote: (key: string, note: string) => void;
  clearPersonalLogs: () => void;
  addEvent: (event: GameEvent) => void;
  addPlayerXP: (amount: number, reason?: string) => void;
  unlockPlayerAchievement: (achievementId: string) => void;
  triggerEmoteGamification: () => void;
  triggerVoteGamification: () => void;
  triggerNightActionGamification: () => void;
  triggerGameEndedGamification: (winner: string) => void;
  clearSession: () => void;
}

const initialPlayerId = localStorage.getItem('ww_player_id');

export const usePlayerStore = create<PlayerStore>((set) => ({
  playerId: initialPlayerId,
  sessionToken: localStorage.getItem('ww_session_token'),
  playerName: localStorage.getItem('ww_player_name') || '',
  roomCode: localStorage.getItem('ww_room_code') || '',
  room: null,
  publicPlayers: [],
  role: null,
  teammates: [],
  partner: null,
  nightPrompt: null,
  nightResult: null,
  submittedNightTarget: null,
  submittedVoteTarget: null,
  wolfChatMessages: [],
  isRoleModalOpen: false,
  isLogModalOpen: false,
  isAchievementsModalOpen: false,
  hasUnreadLog: false,
  personalLogs: getStoredLogs(initialPlayerId),
  personalNotes: getStoredNotes(initialPlayerId),
  gamification: loadGamification(initialPlayerId),
  pendingToast: null,
  eventsLog: [],

  setAuth: (playerId, sessionToken, roomCode, playerName) => {
    localStorage.setItem('ww_player_id', playerId);
    localStorage.setItem('ww_session_token', sessionToken);
    localStorage.setItem('ww_room_code', roomCode);
    localStorage.setItem('ww_player_name', playerName);
    set({
      playerId,
      sessionToken,
      roomCode,
      playerName,
      personalLogs: getStoredLogs(playerId),
      personalNotes: getStoredNotes(playerId),
      gamification: loadGamification(playerId),
    });
  },

  setRoom: (room) => set({ room }),
  setPublicPlayers: (publicPlayers) => set({ publicPlayers }),
  setRole: (role, teammates = [], partner = null) => set({ role, teammates, partner }),
  setNightPrompt: (nightPrompt) => set({ nightPrompt, submittedNightTarget: null }),
  setNightResult: (nightResult) => {
    if (nightResult) {
      const state = usePlayerStore.getState();
      const currentRound = nightResult.round || state.room?.round || 1;
      const role = state.role;

      let resultType: PersonalNightLog['resultType'] = 'info';
      if (nightResult.isWolf === true) resultType = 'wolf';
      else if (nightResult.isWolf === false) resultType = 'village';
      else {
        const lowerMsg = nightResult.message.toLowerCase();
        if (lowerMsg.includes('lindungi') || lowerMsg.includes('perisai') || lowerMsg.includes('kebal')) {
          resultType = 'shield';
        } else if (lowerMsg.includes('serang') || lowerMsg.includes('tewas') || lowerMsg.includes('mati') || lowerMsg.includes('racun') || lowerMsg.includes('tembakan')) {
          resultType = 'danger';
        }
      }

      const existingIdx = state.personalLogs.findIndex((l) => l.round === currentRound);
      const updatedLogs = [...state.personalLogs];

      if (existingIdx >= 0) {
        const existing = updatedLogs[existingIdx];
        updatedLogs[existingIdx] = {
          ...existing,
          resultMessage: nightResult.message,
          resultType: resultType !== 'info' ? resultType : existing.resultType,
          targetName: nightResult.targetName || existing.targetName,
          targetId: nightResult.targetId || existing.targetId,
          actionDescription: nightResult.actionDescription || existing.actionDescription,
          timestamp: Date.now(),
        };
      } else {
        updatedLogs.push({
          id: `log_${currentRound}_${Date.now()}`,
          round: currentRound,
          roleId: role?.id || 'unknown',
          roleName: role?.indonesianName || 'Pemain',
          actionTitle: `Malam ${currentRound}`,
          actionDescription: nightResult.actionDescription || `Aksi pada Malam ${currentRound}`,
          targetName: nightResult.targetName,
          targetId: nightResult.targetId,
          resultMessage: nightResult.message,
          resultType,
          timestamp: Date.now(),
        });
      }

      // Sort logs by round ascending
      updatedLogs.sort((a, b) => a.round - b.round);

      if (state.playerId) {
        localStorage.setItem(`ww_personal_logs_${state.playerId}`, JSON.stringify(updatedLogs));
      }

      if (nightResult.isWolf === true) {
        state.unlockPlayerAchievement('eagle_eye');
      }

      set({
        nightResult,
        personalLogs: updatedLogs,
        hasUnreadLog: true,
      });
    } else {
      set({ nightResult: null });
    }
  },
  setSubmittedNightTarget: (submittedNightTarget) => set({ submittedNightTarget }),
  setSubmittedVoteTarget: (submittedVoteTarget) => set({ submittedVoteTarget }),
  addWolfChatMessage: (msg) => set((state) => ({ wolfChatMessages: [...state.wolfChatMessages, msg] })),
  setIsRoleModalOpen: (isRoleModalOpen) => set({ isRoleModalOpen }),
  setIsLogModalOpen: (isLogModalOpen) => {
    if (isLogModalOpen) {
      set({ isLogModalOpen: true, hasUnreadLog: false });
    } else {
      set({ isLogModalOpen: false });
    }
  },
  setHasUnreadLog: (hasUnreadLog) => set({ hasUnreadLog }),
  addOrUpdatePersonalLog: (partialLog) => {
    set((state) => {
      const currentRound = partialLog.round;
      const existingIdx = state.personalLogs.findIndex((l) => l.round === currentRound);
      let updatedLogs: PersonalNightLog[];

      if (existingIdx >= 0) {
        updatedLogs = [...state.personalLogs];
        updatedLogs[existingIdx] = {
          ...updatedLogs[existingIdx],
          ...partialLog,
          id: updatedLogs[existingIdx].id,
          timestamp: Date.now(),
        };
      } else {
        const newLog: PersonalNightLog = {
          id: `log_${currentRound}_${Date.now()}`,
          round: currentRound,
          roleId: partialLog.roleId || state.role?.id || 'unknown',
          roleName: partialLog.roleName || state.role?.indonesianName || 'Pemain',
          actionTitle: partialLog.actionTitle || `Malam ${currentRound}`,
          actionDescription: partialLog.actionDescription || 'Aksi malam hari dicatat',
          targetName: partialLog.targetName,
          targetId: partialLog.targetId,
          resultMessage: partialLog.resultMessage,
          resultType: partialLog.resultType || 'info',
          timestamp: Date.now(),
        };
        updatedLogs = [...state.personalLogs, newLog];
      }

      updatedLogs.sort((a, b) => a.round - b.round);

      if (state.playerId) {
        localStorage.setItem(`ww_personal_logs_${state.playerId}`, JSON.stringify(updatedLogs));
      }

      return { personalLogs: updatedLogs };
    });
  },
  setPersonalNote: (key, note) => {
    set((state) => {
      const updated = { ...state.personalNotes, [key]: note };
      if (state.playerId) {
        localStorage.setItem(`ww_personal_notes_${state.playerId}`, JSON.stringify(updated));
      }
      return { personalNotes: updated };
    });
    if (note.trim().length > 2) {
      usePlayerStore.getState().unlockPlayerAchievement('active_detective');
    }
  },
  clearPersonalLogs: () => {
    const state = usePlayerStore.getState();
    if (state.playerId) {
      localStorage.removeItem(`ww_personal_logs_${state.playerId}`);
      localStorage.removeItem(`ww_personal_notes_${state.playerId}`);
    }
    set({ personalLogs: [], personalNotes: {} });
  },
  addEvent: (event) => set((state) => ({ eventsLog: [event, ...state.eventsLog] })),

  setIsAchievementsModalOpen: (isAchievementsModalOpen) => set({ isAchievementsModalOpen }),
  clearPendingToast: () => set({ pendingToast: null }),

  addPlayerXP: (amount, reason) => {
    const state = usePlayerStore.getState();
    const oldXp = state.gamification.xp;
    const newXp = oldXp + amount;
    const oldLevel = calculateLevel(oldXp).level;
    const newLevelInfo = calculateLevel(newXp);

    const updatedGamification = {
      ...state.gamification,
      xp: newXp,
      level: newLevelInfo.level,
      title: newLevelInfo.title,
    };
    saveGamification(state.playerId, updatedGamification);

    if (newLevelInfo.level > oldLevel) {
      soundManager.playLevelUp();
      set({
        gamification: updatedGamification,
        pendingToast: {
          type: 'levelup',
          title: '🎉 NAIK LEVEL!',
          description: `Hebat! Anda kini mencapai Level ${newLevelInfo.level} (${newLevelInfo.title})!`,
        },
      });
    } else {
      set({ gamification: updatedGamification });
    }
  },

  unlockPlayerAchievement: (achievementId) => {
    const state = usePlayerStore.getState();
    if (state.gamification.unlockedAchievements.includes(achievementId)) return;

    const ach = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!ach) return;

    const updatedAchievements = [...state.gamification.unlockedAchievements, achievementId];
    const newXp = state.gamification.xp + ach.xpReward;
    const newLevelInfo = calculateLevel(newXp);

    const updatedGamification = {
      ...state.gamification,
      xp: newXp,
      level: newLevelInfo.level,
      title: newLevelInfo.title,
      unlockedAchievements: updatedAchievements,
    };
    saveGamification(state.playerId, updatedGamification);

    soundManager.playAchievement();
    set({
      gamification: updatedGamification,
      pendingToast: {
        type: 'achievement',
        title: '🏆 PENCAPAIAN TERBUKA!',
        description: `${ach.name}: +${ach.xpReward} XP!`,
        icon: ach.icon,
      },
    });
  },

  triggerEmoteGamification: () => {
    const state = usePlayerStore.getState();
    const newCount = (state.gamification.stats.emotesSent || 0) + 1;
    const updatedStats = { ...state.gamification.stats, emotesSent: newCount };
    const updated = { ...state.gamification, stats: updatedStats };
    saveGamification(state.playerId, updated);
    set({ gamification: updated });
    state.addPlayerXP(10);
    if (newCount >= 5) {
      state.unlockPlayerAchievement('crowd_pleaser');
    }
  },

  triggerVoteGamification: () => {
    const state = usePlayerStore.getState();
    const newVotes = (state.gamification.stats.votesCast || 0) + 1;
    const updatedStats = { ...state.gamification.stats, votesCast: newVotes };
    const updated = { ...state.gamification, stats: updatedStats };
    saveGamification(state.playerId, updated);
    set({ gamification: updated });
    state.addPlayerXP(30);
    state.unlockPlayerAchievement('active_voter');
  },

  triggerNightActionGamification: () => {
    const state = usePlayerStore.getState();
    const newActions = (state.gamification.stats.nightActions || 0) + 1;
    const updatedStats = { ...state.gamification.stats, nightActions: newActions };
    const updated = { ...state.gamification, stats: updatedStats };
    saveGamification(state.playerId, updated);
    set({ gamification: updated });
    state.addPlayerXP(50);

    const roleId = state.role?.id || '';
    if (['guardian', 'bodyguard', 'crusader', 'doctor'].includes(roleId)) {
      state.unlockPlayerAchievement('iron_shield');
    }
  },

  triggerGameEndedGamification: (winner: string) => {
    const state = usePlayerStore.getState();
    const isPlayerAlive = state.publicPlayers.find((p) => p.id === state.playerId)?.alive ?? true;
    const myTeam = state.role?.team;

    const won =
      (winner === 'werewolf' && myTeam === 'werewolf') ||
      (winner === 'village' && myTeam === 'village') ||
      (winner === 'tanner' && state.role?.id === 'tanner') ||
      (winner === 'lovers' && state.partner !== null);

    const updatedStats = {
      ...state.gamification.stats,
      gamesPlayed: state.gamification.stats.gamesPlayed + 1,
      gamesWon: state.gamification.stats.gamesWon + (won ? 1 : 0),
    };
    const updated = { ...state.gamification, stats: updatedStats };
    saveGamification(state.playerId, updated);
    set({ gamification: updated });

    state.addPlayerXP(100);
    if (won) {
      state.addPlayerXP(200);
      if (myTeam === 'village') state.unlockPlayerAchievement('village_victory');
      if (myTeam === 'werewolf') state.unlockPlayerAchievement('wolf_victory');
      if (state.role?.id === 'jester' || state.role?.id === 'tanner') state.unlockPlayerAchievement('jester_win');
      if (isPlayerAlive) state.unlockPlayerAchievement('lone_survivor');
    }
  },
  clearSession: () => {
    const state = usePlayerStore.getState();
    if (state.playerId) {
      localStorage.removeItem(`ww_personal_logs_${state.playerId}`);
      localStorage.removeItem(`ww_personal_notes_${state.playerId}`);
    }
    localStorage.removeItem('ww_player_id');
    localStorage.removeItem('ww_session_token');
    localStorage.removeItem('ww_room_code');
    localStorage.removeItem('ww_player_name');
    set({
      playerId: null,
      sessionToken: null,
      playerName: '',
      roomCode: '',
      room: null,
      publicPlayers: [],
      role: null,
      teammates: [],
      partner: null,
      nightPrompt: null,
      nightResult: null,
      submittedNightTarget: null,
      submittedVoteTarget: null,
      wolfChatMessages: [],
      eventsLog: [],
      personalLogs: [],
      personalNotes: {},
      isLogModalOpen: false,
      hasUnreadLog: false,
    });
  },
}));

