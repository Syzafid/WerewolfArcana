import React, { useEffect, useState } from 'react';
import { useHostStore } from '../../store/hostStore.js';
import { socket } from '../../socket.js';
import { HostHeader } from './HostHeader.js';
import { HostLobby } from './HostLobby.js';
import { HostNight } from './HostNight.js';
import { HostDay } from './HostDay.js';
import { HostVoting } from './HostVoting.js';
import { HostReveal } from './HostReveal.js';
import { MistBackground } from '../common/MistBackground.js';
import { PhaseTransitionOverlay } from '../common/PhaseTransitionOverlay.js';
import { FloatingEmoteOverlay } from '../common/FloatingEmoteOverlay.js';
import { Sparkles, AlertCircle } from 'lucide-react';

export const HostScreen: React.FC = () => {
  const {
    room,
    setRoom,
    setPublicPlayers,
    addEvent,
    setVotes,
    setRevealData,
  } = useHostStore();

  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Socket event listeners — dependency array is intentionally empty ([]) to register
  // listeners only ONCE on mount. All handlers use useHostStore.getState() to read the
  // latest Zustand state, avoiding stale-closure bugs (e.g. timer extend overwriting
  // a newer phase with an older room snapshot).
  useEffect(() => {
    socket.on('room:created', ({ room, publicPlayers }) => {
      setRoom(room);
      setPublicPlayers(publicPlayers);
    });

    socket.on('room:player_list_updated', ({ publicPlayers }) => {
      setPublicPlayers(publicPlayers);
    });

    socket.on('room:phase_changed', ({ phase, endsAt, round }) => {
      const currentRoom = useHostStore.getState().room;
      if (currentRoom) {
        setRoom({ ...currentRoom, phase, phaseEndsAt: endsAt, round, extendedTimerUsed: false });
      }
    });

    socket.on('room:timer_extended', ({ endsAt }) => {
      const currentRoom = useHostStore.getState().room;
      if (currentRoom) {
        setRoom({ ...currentRoom, phaseEndsAt: endsAt, extendedTimerUsed: true });
      }
    });

    socket.on('room:game_event', ({ event }) => {
      addEvent(event);
    });

    socket.on('room:vote_update', ({ votes }) => {
      setVotes(votes);
    });

    socket.on('room:game_ended', ({ reveal }) => {
      setRevealData(reveal);
    });

    return () => {
      socket.off('room:created');
      socket.off('room:player_list_updated');
      socket.off('room:phase_changed');
      socket.off('room:timer_extended');
      socket.off('room:game_event');
      socket.off('room:vote_update');
      socket.off('room:game_ended');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = () => {
    setIsCreating(true);
    setErrorMsg('');

    let groupId = localStorage.getItem('ww_host_group_id');
    if (!groupId) {
      groupId = 'grp_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ww_host_group_id', groupId);
    }

    socket.emit('host:create_room', { groupId }, (res) => {
      setIsCreating(false);
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal membuat room.');
      }
    });
  };

  if (!room) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-hidden">
        <MistBackground phase="lobby" />

        <div className="relative z-10 space-y-3 max-w-md mx-auto">
          <span className="text-7xl animate-bounce inline-block filter drop-shadow-xl">🐺</span>
          <h1 className="text-4xl sm:text-6xl font-cinzel font-black tracking-wider text-slate-100 drop-shadow-lg">
            ARCANA WEREWOLF HOST
          </h1>
          <p className="text-slate-400 text-sm">
            Layar kontrol moderator game Werewolf ala Jackbox. Share layar browser ini ke Discord voice channel.
          </p>
        </div>

        {errorMsg && (
          <div className="relative z-10 flex items-center gap-2 p-3 bg-rose-950/80 border border-rose-700 text-rose-300 rounded-xl text-xs shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="relative z-10 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-lg rounded-2xl shadow-2xl transition-all inline-flex items-center gap-3 transform hover:scale-105 active:scale-95 glow-amber"
        >
          <Sparkles className="w-6 h-6 fill-current" />
          <span>{isCreating ? 'Membuat Room...' : 'Buat Room Baru'}</span>
        </button>

        <p className="relative z-10 text-xs text-slate-500">
          *Host bertindak sebagai moderator dan tidak ikut dihitung sebagai pemain aktif.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-night-950 text-slate-100 overflow-x-hidden">
      {/* Background Atmosphere Mist */}
      <MistBackground phase={room.phase} />

      {/* Cinematic Phase Transition Overlay */}
      <PhaseTransitionOverlay phase={room.phase} round={room.round} />

      {/* Floating Live Reactions Across Screen */}
      <FloatingEmoteOverlay isHost={true} />

      {/* Main UI */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <HostHeader />

        <main className="flex-1 pb-12">
          {room.phase === 'lobby' && <HostLobby />}
          {room.phase === 'role_reveal' && (
            <div className="max-w-md mx-auto p-12 text-center space-y-4 animate-pop-spring">
              <span className="text-6xl animate-pulse inline-block">🔮</span>
              <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-amber-300">
                Membagikan Role Rahasia...
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Masing-masing pemain sedang memeriksa peran mereka di smartphone. Malam pertama akan segera dimulai!
              </p>
            </div>
          )}
          {room.phase === 'night' && <HostNight />}
          {room.phase === 'day' && <HostDay />}
          {room.phase === 'voting' && <HostVoting />}
          {room.phase === 'ended' && <HostReveal />}
        </main>
      </div>
    </div>
  );
};
