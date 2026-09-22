import React from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { Ghost, ShieldAlert } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const SpectatorView: React.FC = () => {
  const { publicPlayers, eventsLog } = usePlayerStore();

  const alivePlayers = publicPlayers.filter((p) => p.alive);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-3xl">
          👻
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-cinzel font-black text-slate-300">Mode Penonton (Spectator)</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Karakter Anda telah gugur. Saksikan kelanjutan diskusi dan hasil voting secara langsung.
          </p>
        </div>
        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-amber-400/90 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Demi integritas game, dilarang membocorkan info di Discord!</span>
        </div>
      </div>

      {/* Living players */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
          Warga Yang Masih Bertahan ({alivePlayers.length})
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {alivePlayers.map((p) => (
            <div
              key={p.id}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-2"
            >
              <Avatar seed={p.avatarSeed} name={p.name} size="sm" alive={true} />
              <span className="text-xs font-bold text-slate-200 truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Public Event Log */}
      {eventsLog.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Riwayat Kejadian Publik
          </h4>
          <div className="space-y-1.5">
            {eventsLog.slice(0, 6).map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300"
              >
                {ev.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
