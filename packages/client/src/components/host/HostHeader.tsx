import React, { useState } from 'react';
import { useHostStore } from '../../store/hostStore.js';
import { socket } from '../../socket.js';
import { TimerBadge } from '../common/TimerBadge.js';
import { ShieldCheck, FastForward, PlusCircle, AlertOctagon, Moon, Sun, Vote as VoteIcon, Users, Volume2, VolumeX } from 'lucide-react';
import { FullscreenButton } from '../common/FullscreenButton.js';
import { soundManager } from '../../utils/soundManager.js';

export const HostHeader: React.FC = () => {
  const { room, publicPlayers } = useHostStore();
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());

  if (!room) return null;

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundManager.playClick();
    }
  };

  const handleExtendTimer = () => {
    soundManager.playClick();
    socket.emit('host:extend_timer', { roomCode: room.code });
  };

  const handleSkipPhase = () => {
    soundManager.playClick();
    socket.emit('host:skip_phase', { roomCode: room.code });
  };

  const handleForceEndGame = () => {
    soundManager.playClick();
    if (confirm('Yakin ingin mengakhiri permainan sekarang? (Stalemate / Safety Valve)')) {
      socket.emit('host:force_end_game', { roomCode: room.code });
    }
  };

  const phaseIcons = {
    lobby: <Users className="w-4 h-4 text-amber-400" />,
    config: <Users className="w-4 h-4 text-purple-400" />,
    role_reveal: <Sun className="w-4 h-4 text-amber-400 animate-spin-orbital" />,
    night: <Moon className="w-4 h-4 text-indigo-300 fill-current animate-pulse" />,
    day: <Sun className="w-4 h-4 text-amber-400 animate-sun-burst" />,
    voting: <VoteIcon className="w-4 h-4 text-rose-400 animate-pulse" />,
    ended: <AlertOctagon className="w-4 h-4 text-emerald-400" />,
  };

  const phaseLabels = {
    lobby: 'LOBBY DESA',
    config: 'KONFIGURASI',
    role_reveal: 'PEMBAGIAN ROLE',
    night: `FASE MALAM (RONDE ${room.round})`,
    day: `FASE SIANG (RONDE ${room.round})`,
    voting: `VOTING EKSEKUSI (RONDE ${room.round})`,
    ended: 'PERMAINAN SELESAI',
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 glass-panel border-b border-amber-500/20 sticky top-0 z-50 shadow-2xl backdrop-blur-xl">
      {/* Metallic top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
      {/* Left: Brand, Room Code, Broadcast Safe Badge */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐺</span>
          <h1 className="font-cinzel font-bold tracking-wider text-xl text-slate-100 hidden sm:inline">
            ARCANA WEREWOLF
          </h1>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Room</span>
          <span className="font-mono text-lg font-bold text-amber-400 tracking-widest">{room.code}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Broadcast Safe</span>
        </div>
      </div>

      {/* Center: Phase Badge & Synchronized Timer */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-200">
          {phaseIcons[room.phase]}
          <span>{phaseLabels[room.phase]}</span>
        </div>

        <TimerBadge endsAt={room.phaseEndsAt} />
      </div>

      {/* Right: Moderator Controls */}
      <div className="flex items-center gap-2">
        {/* SFX Audio Toggle */}
        <button
          onClick={handleToggleSound}
          title={isMuted ? 'Nyalakan Efek Suara Game (SFX)' : 'Matikan Suara (Mute SFX)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            isMuted
              ? 'bg-slate-900/80 text-slate-500 border-slate-800 hover:text-slate-300'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-sm'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />}
          <span className="hidden sm:inline">{isMuted ? 'SFX OFF' : 'SFX ON'}</span>
        </button>

        <FullscreenButton />

        {room.phase !== 'lobby' && room.phase !== 'ended' && (
          <>
            <button
              onClick={handleExtendTimer}
              disabled={room.extendedTimerUsed}
              title={room.extendedTimerUsed ? 'Timer sudah diperpanjang 1x' : 'Tambah 30 detik (1x per fase)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                room.extendedTimerUsed
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">+30s</span>
            </button>

            <button
              onClick={handleSkipPhase}
              title="Lewati fase langsung ke berikutnya"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <FastForward className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Lewati</span>
            </button>

            <button
              onClick={handleForceEndGame}
              title="Paksa akhiri game (Safety valve anti-stalemate)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 transition-all"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden lg:inline">Akhiri</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
