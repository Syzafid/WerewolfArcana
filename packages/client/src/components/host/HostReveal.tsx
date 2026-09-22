import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useHostStore } from '../../store/hostStore.js';
import { Trophy, RefreshCw, Sparkles, Crown, Award } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';
import { soundManager } from '../../utils/soundManager.js';

export const HostReveal: React.FC = () => {
  const { room, revealData, resetGame } = useHostStore();
  const [revealedIndex, setRevealedIndex] = useState<number>(-1);

  useEffect(() => {
    if (!revealData) return;

    // Trigger victory fanfare
    soundManager.playVictoryFanfare();

    // Faction-specific celebratory confetti
    const winnerStr = String(revealData.winner);
    let confettiColors = ['#f59e0b', '#10b981', '#3b82f6']; // Village default
    if (winnerStr === 'werewolf') {
      confettiColors = ['#dc2626', '#991b1b', '#000000'];
    } else if (winnerStr === 'lovers') {
      confettiColors = ['#ec4899', '#f43f5e', '#ffffff'];
    } else if (winnerStr === 'tanner') {
      confettiColors = ['#a855f7', '#7c3aed', '#fbbf24'];
    }

    try {
      // First burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: confettiColors,
      });

      // Second burst after 600ms
      setTimeout(() => {
        confetti({
          particleCount: 90,
          spread: 110,
          origin: { y: 0.4 },
          colors: confettiColors,
        });
      }, 600);
    } catch {
      // ignore
    }

    // Staggered reveal of player cards: reveal 1 card every 250ms with card flip SFX
    const total = revealData.players.length;
    let current = 0;
    const interval = setInterval(() => {
      if (current < total) {
        soundManager.playCardFlip();
        setRevealedIndex(current);
        current++;
      } else {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [revealData]);

  if (!revealData || !room) return null;

  const winnerMeta: Record<string, { title: string; color: string; bg: string; icon: string; subtitle: string }> = {
    werewolf: {
      title: 'KAWANAN SERIGALA MENANG!',
      subtitle: 'Kegelapan berhasil menelan seluruh desa. Warga tak berdaya menghadapi cengkeraman malam.',
      color: 'text-rose-400',
      bg: 'border-ornate-crimson glow-crimson',
      icon: '🐺',
    },
    village: {
      title: 'WARGA DESA MENANG!',
      subtitle: 'Cahaya fajar abadi kembali menyinari dusun. Semua ancaman berhasil disingkirkan!',
      color: 'text-amber-300',
      bg: 'border-ornate-gold glow-amber',
      icon: '🌾',
    },
    lovers: {
      title: 'PASANGAN SEJATI (LOVERS) MENANG!',
      subtitle: 'Cinta mereka melampaui intrik dan kematian. Pasangan kekasih menjadi yang terakhir bertahan!',
      color: 'text-pink-300',
      bg: 'border-pink-600/60 bg-pink-950/70 glow-crimson',
      icon: '💘',
    },
    tanner: {
      title: 'TANNER MENANG SENDIRIAN!',
      subtitle: 'Semua tertipu oleh rencananya! Kematian di tiang gantungan adalah tujuannya sedari awal.',
      color: 'text-purple-300',
      bg: 'border-purple-600/60 bg-purple-950/70 glow-blue',
      icon: '🃏',
    },
    stalemate: {
      title: 'PERMAINAN BERAKHIR IMBANG',
      subtitle: 'Tidak ada faksi yang mencapai keunggulan mutlak.',
      color: 'text-slate-300',
      bg: 'border-slate-700 bg-slate-900/80',
      icon: '⚖️',
    },
  };

  const currentMeta = winnerMeta[String(revealData.winner)] || winnerMeta.village;

  const handlePlayAgain = () => {
    soundManager.playClick();
    resetGame();
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-center animate-fadeIn">
      {/* Grand Victory Podium Hero Banner */}
      <div
        className={`p-8 sm:p-10 rounded-3xl ${currentMeta.bg} space-y-4 max-w-3xl mx-auto shadow-2xl animate-pop-spring relative overflow-hidden`}
      >
        <div className="text-7xl sm:text-8xl animate-bounce filter drop-shadow-2xl">{currentMeta.icon}</div>
        
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 border border-amber-500/40 text-[11px] font-black uppercase tracking-widest text-amber-300">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>JUARA PERTEMPURAN ARCANA</span>
          </div>

          <h2 className={`text-3xl sm:text-5xl font-cinzel font-black tracking-wider ${currentMeta.color} drop-shadow-lg`}>
            {currentMeta.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            {currentMeta.subtitle}
          </p>

          <div className="pt-2 text-xs font-mono font-bold text-amber-300/80">
            Selesai dalam {revealData.rounds} ronde pertarungan penuh strategi!
          </div>
        </div>
      </div>

      {/* Gala Penghargaan & MVP Match Podium */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
          <h3 className="text-2xl font-cinzel font-black text-amber-300 tracking-wider">
            GALA PENGHARGAAN & MATCH MVP
          </h3>
          <Sparkles className="w-7 h-7 text-yellow-400 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* MVP Card */}
          {(() => {
            const winningPlayers = revealData.players.filter((p) => p.team === revealData.winner);
            const survivingWinners = winningPlayers.filter((p) => p.alive);
            const mvp = survivingWinners.length > 0 ? survivingWinners[0] : winningPlayers[0] || revealData.players[0];

            if (!mvp) return null;

            return (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-slate-900 border-2 border-yellow-400/70 shadow-2xl glow-amber space-y-3 relative overflow-hidden transform hover:scale-102 transition-transform">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-yellow-400 text-slate-950 flex items-center gap-1 shadow-md">
                    <Crown className="w-3.5 h-3.5" />
                    <span>MVP UTAMA</span>
                  </span>
                  <span className="text-2xl">🌟</span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <Avatar seed={mvp.id} name={mvp.name} size="lg" alive={mvp.alive} />
                  <div className="min-w-0">
                    <h4 className="font-cinzel font-black text-lg text-slate-100 truncate">{mvp.name}</h4>
                    <div className="text-xs font-bold text-amber-300 font-cinzel">{mvp.roleIndonesianName}</div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {mvp.alive ? '❤️ Bertahan Hidup' : '💀 Gugur Sebagai Pahlawan'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed border-t border-amber-500/20 pt-2.5">
                  Menunjukkan performa paling krusial dan membawa tim menuju puncak kemenangan pertempuran!
                </p>
              </div>
            );
          })()}

          {/* Special Honor Title 1 */}
          {(() => {
            const surviving = revealData.players.filter((p) => p.alive);
            const winner = revealData.winner;
            const hero =
              winner === 'werewolf'
                ? revealData.players.find((p) => p.team === 'werewolf')
                : revealData.players.find((p) => p.team === 'village' && p.alive) || revealData.players[1];

            if (!hero) return null;

            return (
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-xl space-y-3 relative overflow-hidden transform hover:scale-102 transition-transform">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <span>⚔️ TAKTIK TERBAIK</span>
                  </span>
                  <span className="text-2xl">{winner === 'werewolf' ? '🐺' : '🛡️'}</span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <Avatar seed={hero.id} name={hero.name} size="lg" alive={hero.alive} />
                  <div className="min-w-0">
                    <h4 className="font-cinzel font-black text-lg text-slate-100 truncate">{hero.name}</h4>
                    <div className="text-xs font-bold text-amber-300 font-cinzel">{hero.roleIndonesianName}</div>
                    <span className="text-[10px] text-slate-400 font-mono">Tim {hero.team.toUpperCase()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-2.5">
                  Mengeksekusi langkah-langkah strategi yang mengubah dinamika pertempuran di meja perundingan.
                </p>
              </div>
            );
          })()}

          {/* Special Honor Title 2 */}
          {(() => {
            const candidate =
              revealData.players.find((p) => !p.alive) || revealData.players[revealData.players.length - 1];

            if (!candidate) return null;

            return (
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-xl space-y-3 relative overflow-hidden transform hover:scale-102 transition-transform">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <span>🎭 BINTANG DRAMA</span>
                  </span>
                  <span className="text-2xl">🎪</span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <Avatar seed={candidate.id} name={candidate.name} size="lg" alive={candidate.alive} />
                  <div className="min-w-0">
                    <h4 className="font-cinzel font-black text-lg text-slate-100 truncate">{candidate.name}</h4>
                    <div className="text-xs font-bold text-amber-300 font-cinzel">{candidate.roleIndonesianName}</div>
                    <span className="text-[10px] text-purple-300 font-mono">Sorotan Warga Desa</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-2.5">
                  Menjadi pusat perdebatan dan intrik paling panas selama perdebatan fase siang dan voting!
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Full Player Role Reveal Grid with Staggered Flip */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        <h3 className="text-xl font-cinzel font-bold text-slate-100 flex items-center justify-center gap-2">
          <Award className="w-6 h-6 text-amber-400" />
          <span>Pengungkapan Seluruh Identitas Pemain</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {revealData.players.map((p, index) => {
            const isRevealed = index <= revealedIndex;

            const teamStyles = {
              werewolf: 'border-blood-700/80 bg-blood-950/60 text-rose-300',
              neutral: 'border-purple-700/80 bg-purple-950/60 text-purple-300',
              village: 'border-amber-600/40 bg-slate-900/80 text-emerald-300',
            };

            return (
              <div
                key={p.id}
                className={`player-podium p-4 rounded-2xl border transition-all duration-500 flex items-center gap-4 relative overflow-hidden ${
                  isRevealed
                    ? 'border-amber-500/30 bg-gradient-to-r from-slate-900/90 to-slate-950/90 shadow-xl animate-stamp'
                    : 'border-slate-800/40 bg-slate-950/40 opacity-30 grayscale'
                }`}
              >
                <div className="relative">
                  <Avatar seed={p.id} name={p.name} size="md" alive={p.alive} />
                  <span className="absolute -bottom-1 -right-1 text-xs">{p.alive ? '❤️' : '💀'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100 truncate">{p.name}</span>
                  </div>

                  {isRevealed ? (
                    <div className="mt-1 space-y-1 animate-pop-spring">
                      <div className="text-sm font-black text-amber-300 font-cinzel">
                        {p.roleIndonesianName}
                      </div>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-black uppercase tracking-wider ${
                          teamStyles[p.team as keyof typeof teamStyles] || 'border-slate-700 text-slate-300'
                        }`}
                      >
                        Tim {p.team === 'werewolf' ? 'Serigala 🐺' : p.team === 'village' ? 'Desa 🌾' : 'Netral 🎭'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Membuka kartu...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handlePlayAgain}
          className="px-10 py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl shadow-2xl shadow-amber-500/30 transition-all inline-flex items-center gap-3 text-sm transform hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Mulai Permainan Baru</span>
        </button>
      </div>
    </div>
  );
};
