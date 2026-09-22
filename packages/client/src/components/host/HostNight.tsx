import React from 'react';
import { useHostStore } from '../../store/hostStore.js';
import { Moon, EyeOff, Sparkles } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const HostNight: React.FC = () => {
  const { room, publicPlayers } = useHostStore();

  if (!room) return null;

  const alivePlayers = publicPlayers.filter((p) => p.alive);
  const deadPlayers = publicPlayers.filter((p) => !p.alive);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 text-center animate-fadeIn">
      {/* Night Celestial Atmosphere */}
      <div className="space-y-5 py-6 relative">
        {/* Giant Glowing Celestial Moon */}
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-200 shadow-2xl flex items-center justify-center mx-auto border-4 border-indigo-400/40 glow-blue animate-pulse relative overflow-hidden">
            {/* Crater shadows */}
            <div className="absolute top-4 left-6 w-5 h-5 rounded-full bg-indigo-950/40 blur-[1px]" />
            <div className="absolute bottom-6 right-8 w-8 h-8 rounded-full bg-indigo-950/30 blur-[1px]" />
            <div className="absolute top-12 right-6 w-4 h-4 rounded-full bg-indigo-950/35 blur-[1px]" />
            <Moon className="w-16 h-16 text-indigo-100 fill-indigo-200/40 filter drop-shadow-lg" />
          </div>
          <span className="absolute -top-1 -right-2 text-2xl animate-bounce">✨</span>
          <span className="absolute bottom-1 -left-2 text-xl animate-twinkle text-indigo-300">⭐</span>
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/50 text-[11px] font-black uppercase tracking-widest text-indigo-300">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>KABUT MALAM RONDE {room.round}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-wider text-indigo-100 drop-shadow-md">
            Malam Telah Tiba di Desa
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Warga desa tertidur lelap. Peran-peran malam rahasia (Serigala, Seer, Witch, Guardian, dll.) saat ini sedang melancarkan aksi melalui smartphone mereka.
          </p>
        </div>

        {/* Arcane Eye Animation & Broadcast Safe Badge */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs text-indigo-200 shadow-md">
            <span className="animate-spin-orbital inline-block text-indigo-400">🔮</span>
            <span className="font-semibold">Mata Malam Mengawasi Gerak-Gerik...</span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-xs text-emerald-300 shadow-md">
            <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Layar 100% Bebas Bocoran (Aman Stream)</span>
          </div>
        </div>
      </div>

      {/* Sleeping Villagers Status Podiums */}
      <div className="space-y-5 border-ornate-blue p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
          <h3 className="text-xs sm:text-sm uppercase tracking-widest font-black text-indigo-300 flex items-center gap-2">
            <span>Warga Tertidur Lelap</span>
            <span className="font-mono text-indigo-400">({alivePlayers.length} Bertahan Hidup)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Lindungi identitas Anda</span>
        </div>

        {/* Grid of sleeping villagers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {alivePlayers.map((player) => (
            <div
              key={player.id}
              className="player-podium p-3.5 rounded-2xl border border-indigo-500/20 bg-slate-950/70 flex flex-col items-center text-center space-y-2 relative shadow-lg overflow-hidden group hover:border-indigo-400/50"
            >
              {/* Floating Zzz animations */}
              <div className="absolute top-1.5 right-2 font-bold font-mono text-indigo-300 select-none pointer-events-none">
                <span className="text-[11px] inline-block animate-zzz-1">z</span>
                <span className="text-[13px] inline-block animate-zzz-2 font-black">z</span>
                <span className="text-[9px] inline-block animate-zzz-3">z</span>
              </div>

              <div className="pt-2 relative">
                <Avatar seed={player.avatarSeed} name={player.name} size="md" alive={true} />
                {/* Mystic sleep ring */}
                <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-pulse pointer-events-none" />
              </div>

              <span className="text-xs font-bold text-slate-200 truncate w-full px-1">{player.name}</span>
              <span className="text-[10px] font-semibold text-indigo-300/80 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded-md">
                Tertidur 🌙
              </span>
            </div>
          ))}
        </div>

        {/* Dead / Fallen Villagers Memorial Strip */}
        {deadPlayers.length > 0 && (
          <div className="pt-4 border-t border-indigo-900/40 mt-4 text-left">
            <h4 className="text-[11px] uppercase tracking-wider font-black text-slate-500 mb-2.5 flex items-center gap-1.5">
              <span>⚰️ Warga yang Telah Gugur ({deadPlayers.length})</span>
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {deadPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-900 bg-slate-950/80 text-xs text-slate-500 line-through grayscale opacity-60"
                >
                  <span>💀</span>
                  <span className="font-semibold">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
