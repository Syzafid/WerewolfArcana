import React from 'react';
import { useHostStore } from '../../store/hostStore.js';
import { Sun, MessageSquare, Skull, Scroll, Sparkles } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const HostDay: React.FC = () => {
  const { room, publicPlayers, events } = useHostStore();

  if (!room) return null;

  const latestEvents = events.slice(0, 6);
  const alivePlayers = publicPlayers.filter((p) => p.alive);
  const deadPlayers = publicPlayers.filter((p) => !p.alive);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
      {/* Day Celestial Banner */}
      <div className="text-center space-y-4 py-4 relative">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-200 shadow-2xl border-4 border-amber-300 glow-amber mb-1 animate-sun-burst">
          <Sun className="w-12 h-12 text-slate-950 fill-amber-300" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-600/50 text-[11px] font-black uppercase tracking-widest text-amber-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>FAJAR MENYINGSING — RONDE {room.round}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-wider text-amber-100 drop-shadow-md">
            Sidang Musyawarah Siang
          </h2>

          <p className="text-amber-200/80 text-xs sm:text-sm flex items-center justify-center gap-2 bg-amber-950/40 border border-amber-800/40 py-2 px-4 rounded-2xl max-w-lg mx-auto shadow-inner">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Gunakan Discord Voice Chat untuk berdebat, susun alibi, dan temukan kawanan serigala!</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Royal Village Gazette Parchment */}
        <div className="parchment-panel p-6 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden border border-amber-600/40">
          {/* Wax seal decoration */}
          <div className="flex items-center justify-between border-b border-amber-700/40 pb-3">
            <div className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-cinzel font-bold text-amber-100 text-base leading-none">Warta Dusun Arcana</h3>
                <span className="text-[10px] font-mono text-amber-400/70">Edisi Fajar Ronde #{room.round}</span>
              </div>
            </div>
            <span className="w-8 h-8 rounded-full bg-blood-700 border-2 border-amber-400/80 flex items-center justify-center text-xs shadow-md" title="Stempel Segel Kerajaan">
              ⚜️
            </span>
          </div>

          {/* Event bulletins */}
          <div className="space-y-3 pt-1">
            {latestEvents.length === 0 ? (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-amber-900/30 text-center space-y-1">
                <span className="text-2xl">🕊️</span>
                <p className="text-xs text-amber-200/70 italic">
                  Fajar hari menyingsing dalam ketenangan. Tak ada jeritan terdengar dari balik dinding rumah warga...
                </p>
              </div>
            ) : (
              latestEvents.map((ev) => {
                const isCasualty = ev.type === 'player_died' || ev.message.includes('mati') || ev.message.includes('tewas') || ev.message.includes('gugur');
                return (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed shadow-md transition-all animate-pop-spring ${
                      isCasualty
                        ? 'border-blood-700/60 bg-blood-950/60 text-rose-200 glow-crimson'
                        : 'border-amber-700/30 bg-slate-950/70 text-amber-100'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0">{isCasualty ? '🩸' : '📜'}</span>
                      <p className="flex-1 font-medium">{ev.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Town Council Debate Podium */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-lg flex items-center gap-2">
                <span>Delegasi Balai Warga</span>
                <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {alivePlayers.length} Berhak Bicara & Memilih
                </span>
              </h3>
              <p className="text-xs text-slate-400">Siapkan suara Anda untuk pemungutan suara eksekusi setelah diskusi selesai</p>
            </div>
            <span className="text-xs font-mono text-amber-400/80 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 hidden sm:inline">
              🎙️ Diskusi Terbuka
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {publicPlayers.map((player) => (
              <div
                key={player.id}
                className={`player-podium p-3.5 rounded-2xl border flex flex-col items-center text-center space-y-2 transition-all ${
                  player.alive
                    ? 'border-amber-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-md hover:border-amber-400/60'
                    : 'border-slate-900 bg-slate-950/40 opacity-30 grayscale'
                }`}
              >
                <div className="relative">
                  <Avatar seed={player.avatarSeed} name={player.name} size="md" alive={player.alive} />
                  {player.alive && (
                    <span className="absolute -bottom-1 -right-1 text-xs bg-amber-500 text-slate-950 p-0.5 rounded-full border border-slate-900 shadow">
                      💬
                    </span>
                  )}
                </div>

                <span className="font-bold text-xs text-slate-100 truncate w-full px-1">{player.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    player.alive
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800 line-through'
                  }`}
                >
                  {player.alive ? 'Bersaksi' : 'Gugur'}
                </span>
              </div>
            ))}
          </div>

          {/* Fallen Villagers Crypt Memorial */}
          {deadPlayers.length > 0 && (
            <div className="pt-4 border-t border-slate-800/60 mt-3">
              <h4 className="text-[11px] uppercase tracking-wider font-black text-slate-500 mb-2 flex items-center gap-1.5">
                <span>🪦 Nisan Kenangan Warga Gugur ({deadPlayers.length})</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {deadPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-900 bg-slate-950/80 text-xs text-slate-500 line-through opacity-70"
                  >
                    <span>🪦</span>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

