export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  badgeColor: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'village_victory',
    name: 'Cahaya Fajar Desa',
    description: 'Menangkan permainan di pihak Warga Desa.',
    icon: '🌾',
    xpReward: 200,
    badgeColor: 'from-amber-500 to-emerald-500',
  },
  {
    id: 'wolf_victory',
    name: 'Apex Predator',
    description: 'Menangkan pertempuran di pihak Kawanan Serigala.',
    icon: '🐺',
    xpReward: 250,
    badgeColor: 'from-rose-600 to-red-800',
  },
  {
    id: 'jester_win',
    name: 'Raja Tipu Daya',
    description: 'Menangkan permainan sebagai peran Netral (Badut/Tanner/dll).',
    icon: '🃏',
    xpReward: 300,
    badgeColor: 'from-purple-600 to-pink-600',
  },
  {
    id: 'eagle_eye',
    name: 'Mata Elang',
    description: 'Mengendus dan menemukan Serigala melalui kemampuan investigasi malam.',
    icon: '🔍',
    xpReward: 150,
    badgeColor: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'iron_shield',
    name: 'Perisai Pelindung',
    description: 'Melakukan aksi penjagaan atau perlindungan suci di malam hari.',
    icon: '🛡️',
    xpReward: 120,
    badgeColor: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'active_detective',
    name: 'Deduktor Ulung',
    description: 'Menulis catatan analisis di Jurnal Investigasi & Deduksi Pribadi.',
    icon: '📜',
    xpReward: 100,
    badgeColor: 'from-amber-600 to-yellow-600',
  },
  {
    id: 'crowd_pleaser',
    name: 'Ekspresif & Heboh',
    description: 'Mengirim minimal 5 reaksi emotikon interaktif selama permainan.',
    icon: '💬',
    xpReward: 80,
    badgeColor: 'from-pink-500 to-rose-500',
  },
  {
    id: 'lone_survivor',
    name: 'Penyintas Tangguh',
    description: 'Bertahan hidup hingga akhir dan keluar sebagai pemenang.',
    icon: '👑',
    xpReward: 200,
    badgeColor: 'from-yellow-400 to-amber-600',
  },
  {
    id: 'active_voter',
    name: 'Hakim Warga',
    description: 'Memberikan suara saat pemungutan suara siang hari.',
    icon: '🗳️',
    xpReward: 80,
    badgeColor: 'from-slate-500 to-slate-700',
  },
];

export const LEVEL_TIERS = [
  { level: 1, xpReq: 0, title: 'Warga Jelata' },
  { level: 2, xpReq: 120, title: 'Pengintai Pemula' },
  { level: 3, xpReq: 300, title: 'Penyelidik Malam' },
  { level: 4, xpReq: 600, title: 'Penjaga Fajar' },
  { level: 5, xpReq: 1050, title: 'Tetua Pemburu' },
  { level: 6, xpReq: 1650, title: 'Pawang Serigala' },
  { level: 7, xpReq: 2450, title: 'Sang Peramal Agung' },
  { level: 8, xpReq: 3500, title: 'Grandmaster Arcana' },
];

export interface PlayerGamificationState {
  xp: number;
  level: number;
  title: string;
  unlockedAchievements: string[];
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    nightActions: number;
    votesCast: number;
    emotesSent: number;
  };
}

export function calculateLevel(xp: number) {
  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TIERS[i].xpReq) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || { level: currentTier.level + 1, xpReq: currentTier.xpReq + 1500, title: 'Legenda Abadi' };
      break;
    }
  }

  const range = nextTier.xpReq - currentTier.xpReq;
  const currentInTier = xp - currentTier.xpReq;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((currentInTier / range) * 100)));

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentXp: xp,
    tierBaseXp: currentTier.xpReq,
    nextTierXp: nextTier.xpReq,
    neededForNext: nextTier.xpReq - xp,
    progressPercent,
  };
}

export function loadGamification(playerId: string | null): PlayerGamificationState {
  const defaultState: PlayerGamificationState = {
    xp: 0,
    level: 1,
    title: 'Warga Jelata',
    unlockedAchievements: [],
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      nightActions: 0,
      votesCast: 0,
      emotesSent: 0,
    },
  };

  if (!playerId) return defaultState;

  try {
    const raw = localStorage.getItem(`ww_gamification_${playerId}`);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    const { level, title } = calculateLevel(parsed.xp || 0);
    return {
      ...defaultState,
      ...parsed,
      level,
      title,
      stats: { ...defaultState.stats, ...(parsed.stats || {}) },
    };
  } catch {
    return defaultState;
  }
}

export function saveGamification(playerId: string | null, state: PlayerGamificationState) {
  if (!playerId) return;
  try {
    localStorage.setItem(`ww_gamification_${playerId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}
