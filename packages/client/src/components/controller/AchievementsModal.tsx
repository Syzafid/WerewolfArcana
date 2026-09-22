import React from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { ACHIEVEMENTS, calculateLevel } from '../../utils/gamification.js';
import { Trophy, Award, X, Sparkles, Flame, CheckCircle2, Lock, Star } from 'lucide-react';

export const AchievementsModal: React.FC = () => {
  const {
    isAchievementsModalOpen,
    setIsAchievementsModalOpen,
    gamification,
    playerName,
  } = usePlayerStore();

  if (!isAchievementsModalOpen) return null;

  const levelInfo = calculateLevel(gamification.xp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-slate-950 border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Top Gold Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />

        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-black text-slate-100 text-base flex items-center gap-1.5">
                Profil & Medali Arcana
              </h2>
              <p className="text-[11px] text-slate-400">Pencapaian dan rekam jejak deduksi</p>
            </div>
          </div>
          <button
            onClick={() => setIsAchievementsModalOpen(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Level Hero Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 space-y-3 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Gelar Kehormatan</span>
                </span>
                <h3 className="text-lg font-cinzel font-black text-slate-100">
                  {levelInfo.title}
                </h3>
                <p className="text-xs text-slate-400">{playerName || 'Pemain'}</p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex flex-col items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 border-2 border-yellow-300">
                <span className="text-[9px] uppercase tracking-wider leading-none">LEVEL</span>
                <span className="text-xl leading-none mt-0.5">{levelInfo.level}</span>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Kemajuan XP:</span>
                <span className="text-amber-300 font-bold">
                  {gamification.xp} / {levelInfo.nextTierXp} XP ({levelInfo.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-700 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Player Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-slate-400">Total Main</span>
              <div className="text-sm font-black text-slate-200">{gamification.stats.gamesPlayed}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-emerald-400">Menang</span>
              <div className="text-sm font-black text-emerald-300">{gamification.stats.gamesWon}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-amber-400">Aksi Malam</span>
              <div className="text-sm font-black text-amber-300">{gamification.stats.nightActions}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-rose-400">Vote</span>
              <div className="text-sm font-black text-rose-300">{gamification.stats.votesCast}</div>
            </div>
          </div>

          {/* Achievements List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Koleksi Medali & Pencapaian</span>
              </span>
              <span className="text-amber-400 font-mono text-[11px]">
                {gamification.unlockedAchievements.length} / {ACHIEVEMENTS.length}
              </span>
            </div>

            <div className="space-y-2">
              {ACHIEVEMENTS.map((item) => {
                const isUnlocked = gamification.unlockedAchievements.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden ${
                      isUnlocked
                        ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-900 opacity-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                        isUnlocked
                          ? `bg-gradient-to-br ${item.badgeColor} border-white/20 shadow-md`
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{item.name}</h4>
                        {isUnlocked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        +{item.xpReward} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tersimpan otomatis di profil perangkat
          </span>
          <button
            onClick={() => setIsAchievementsModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
