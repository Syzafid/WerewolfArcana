import { create } from 'zustand';
import type {
  RoomState,
  PublicPlayerInfo,
  BalanceEvaluation,
  GameEvent,
  PublicVote,
  EndGameRevealData,
} from '@werewolf/shared';

interface HostStore {
  room: RoomState | null;
  publicPlayers: PublicPlayerInfo[];
  balanceEval: BalanceEvaluation | null;
  events: GameEvent[];
  votes: PublicVote[];
  revealData: EndGameRevealData | null;
  activeConfigTab: 'presets' | 'generator' | 'manual';

  setRoom: (room: RoomState | null) => void;
  setPublicPlayers: (players: PublicPlayerInfo[]) => void;
  setBalanceEval: (evaluation: BalanceEvaluation | null) => void;
  addEvent: (event: GameEvent) => void;
  setVotes: (votes: PublicVote[]) => void;
  setRevealData: (reveal: EndGameRevealData | null) => void;
  setActiveConfigTab: (tab: 'presets' | 'generator' | 'manual') => void;
  resetGame: () => void;
}

export const useHostStore = create<HostStore>((set) => ({
  room: null,
  publicPlayers: [],
  balanceEval: null,
  events: [],
  votes: [],
  revealData: null,
  activeConfigTab: 'presets',

  setRoom: (room) => set({ room }),
  setPublicPlayers: (publicPlayers) => set({ publicPlayers }),
  setBalanceEval: (balanceEval) => set({ balanceEval }),
  addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
  setVotes: (votes) => set({ votes }),
  setRevealData: (revealData) => set({ revealData }),
  setActiveConfigTab: (activeConfigTab) => set({ activeConfigTab }),
  resetGame: () =>
    set({
      room: null,
      publicPlayers: [],
      balanceEval: null,
      events: [],
      votes: [],
      revealData: null,
    }),
}));
