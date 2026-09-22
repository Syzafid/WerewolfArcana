import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { socket } from '../../socket.js';
import { JoinScreen } from './JoinScreen.js';
import { RoleCardModal } from './RoleCardModal.js';
import { NightActionPad } from './NightActionPad.js';
import { WolfChat } from './WolfChat.js';
import { VotePad } from './VotePad.js';
import { SpectatorView } from './SpectatorView.js';
import { TimerBadge } from '../common/TimerBadge.js';
import { MistBackground } from '../common/MistBackground.js';
import { PhaseTransitionOverlay } from '../common/PhaseTransitionOverlay.js';
import { Shield, MessageSquare, LogOut, Info, BookOpen, Trophy } from 'lucide-react';
import { FullscreenButton } from '../common/FullscreenButton.js';
import { soundManager } from '../../utils/soundManager.js';
import { PersonalLogModal } from './PersonalLogModal.js';
import { AchievementsModal } from './AchievementsModal.js';
import { AchievementToast } from '../common/AchievementToast.js';
import { FloatingEmoteOverlay } from '../common/FloatingEmoteOverlay.js';
import { EmoteBar } from './EmoteBar.js';

export const ControllerScreen: React.FC = () => {
  const {
    playerId,
    sessionToken,
    playerName,
    roomCode,
    room,
    publicPlayers,
    role,
    nightResult,
    isLogModalOpen,
    hasUnreadLog,
    gamification,
    setIsLogModalOpen,
    setIsAchievementsModalOpen,
    setRoom,
    setPublicPlayers,
    setRole,
    setNightPrompt,
    setNightResult,
    addWolfChatMessage,
    addEvent,
    setIsRoleModalOpen,
    clearSession,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'main' | 'wolf_chat'>('main');

  // Attempt auto-reconnect if session exists
  useEffect(() => {
    if (playerId && sessionToken && roomCode && !room) {
      socket.emit('player:reconnect', { roomCode, playerId, sessionToken }, (res) => {
        if (!res.success) {
          clearSession();
        }
      });
    }
  }, [playerId, sessionToken, roomCode, room]);

  // Setup Socket listeners
  useEffect(() => {
    socket.on('player:assigned_role', ({ role, teammates, partner }) => {
      setRole(role, teammates, partner);
      setIsRoleModalOpen(true);
    });

    socket.on('player:night_prompt', (prompt) => {
      setNightPrompt(prompt);
    });

    socket.on('player:night_result', (result) => {
      setNightResult(result);
    });

    socket.on('player:reconnected_state', (data) => {
      setRoom(data.room);
      setPublicPlayers(data.publicPlayers);
      if (data.role) {
        setRole(data.role, data.teammates, data.partner);
      }
    });

    socket.on('room:player_list_updated', ({ publicPlayers }) => {
      setPublicPlayers(publicPlayers);
    });

    socket.on('room:phase_changed', ({ phase, endsAt, round }) => {
      const currentRoom = usePlayerStore.getState().room;
      // Merge with existing room, or create a partial room object if room is still null.
      // This handles the case where a player receives phase_changed before their room
      // state has been initialized (e.g. during role_reveal right after game start).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRoom({ ...(currentRoom ?? {}) as any, phase, phaseEndsAt: endsAt, round, extendedTimerUsed: false });
      if (phase === 'night') {
        setActiveTab('main');
        // Reset night action submission for the new night round
        usePlayerStore.getState().setSubmittedNightTarget(null);
      }
      if (phase === 'voting') {
        // Reset vote submission for new voting round (including Stuttering Judge 2nd round)
        usePlayerStore.getState().setSubmittedVoteTarget(null);
      }
    });

    socket.on('room:timer_extended', ({ endsAt }) => {
      const currentRoom = usePlayerStore.getState().room;
      if (currentRoom) {
        setRoom({ ...currentRoom, phaseEndsAt: endsAt, extendedTimerUsed: true });
      }
    });

    socket.on('room:game_event', ({ event }) => {
      addEvent(event);
    });

    socket.on('wolves:chat_message', (msg) => {
      addWolfChatMessage(msg);
    });

    socket.on('room:game_ended', ({ reveal }) => {
      const winnerStr = Array.isArray(reveal.winner) ? 'lovers' : String(reveal.winner);
      usePlayerStore.getState().triggerGameEndedGamification(winnerStr);
    });

    return () => {
      socket.off('player:assigned_role');
      socket.off('player:night_prompt');
      socket.off('player:night_result');
      socket.off('player:reconnected_state');
      socket.off('room:player_list_updated');
      socket.off('room:phase_changed');
      socket.off('room:timer_extended');
      socket.off('room:game_event');
      socket.off('wolves:chat_message');
      socket.off('room:game_ended');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!playerId || !sessionToken) {
    return <JoinScreen />;
  }

  const me = publicPlayers.find((p) => p.id === playerId);
  const isAlive = me ? me.alive : true;
  const isWolf = role?.team === 'werewolf';

  return (
    <div className="relative min-h-screen flex flex-col bg-night-950 text-slate-100 max-w-md mx-auto pb-8 overflow-x-hidden">
      {/* Dynamic Mist Background */}
      <MistBackground phase={room?.phase} />

      {/* Cinematic Phase Transition Overlay */}
      <PhaseTransitionOverlay phase={room?.phase || null} round={room?.round || 1} />

      {/* Role Card Modal */}
      <RoleCardModal />

      {/* Personal Action & Deduction Journal Modal */}
      <PersonalLogModal />

      {/* Profile & Achievements Modal */}
      <AchievementsModal />

      {/* Achievement / Level Up Toast Notification */}
      <AchievementToast />

      {/* Real-time Floating Live Emotes */}
      <FloatingEmoteOverlay />

      {/* Quick Reaction Emote Bar */}
      <EmoteBar />

      {/* Main Controller Content */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Controller Top Bar */}
        <header className="p-4 glass-panel border-b border-slate-800/80 sticky top-0 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                setIsRoleModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition-all transform active:scale-95 shadow-md cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{role ? role.indonesianName : 'Peran Saya'}</span>
            </button>

            {/* Level & XP Profile Badge */}
            <button
              onClick={() => {
                soundManager.playClick();
                setIsAchievementsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition-all transform active:scale-95 shadow-md cursor-pointer"
              title="Buka Profil & Pencapaian Medali"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-mono">Lv.{gamification.level}</span>
            </button>

            {/* Private Detective Journal Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                setIsLogModalOpen(true);
              }}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300 transition-all transform active:scale-95 shadow-md cursor-pointer"
              title="Buka Jurnal Investigasi & Catatan Deduksi Pribadi"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Jurnal Aksi</span>
              <span className="sm:hidden">Jurnal</span>
              {hasUnreadLog && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-950 animate-pulse" />
              )}
            </button>

            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                isAlive
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                  : 'bg-rose-950/80 text-rose-400 border-rose-800/50'
              }`}
            >
              {isAlive ? '❤️ Hidup' : '💀 Gugur'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {room && <TimerBadge endsAt={room.phaseEndsAt} />}
            <FullscreenButton className="!px-2" />
            <button
              onClick={() => {
                soundManager.playClick();
                clearSession();
              }}
              title="Keluar"
              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Night Result Alert (Private Night Action Outcome) */}
        {nightResult && (
          <div className="mx-4 mt-3 p-3.5 bg-indigo-950/90 border border-indigo-700 rounded-2xl text-xs text-indigo-200 flex items-start justify-between gap-2 shadow-xl animate-pop-spring">
            <div className="space-y-0.5">
              <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">
                Hasil Aksi Malam Pribadi:
              </span>
              <p className="leading-relaxed">{nightResult.message}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsLogModalOpen(true);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-sm transition-transform active:scale-95"
              >
                Jurnal
              </button>
              <button
                onClick={() => setNightResult(null)}
                className="text-indigo-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Wolf Chat Switcher Tab */}
        {isWolf && isAlive && (
          <div className="flex p-2 gap-2 border-b border-slate-800/60 mx-4 mt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('main');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'main'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-900/80 text-slate-400'
              }`}
            >
              Aksi Utama
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('wolf_chat');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'wolf_chat'
                  ? 'bg-blood-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Serigala 🐺</span>
            </button>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 p-4">
          {activeTab === 'wolf_chat' && isWolf && isAlive ? (
            <WolfChat />
          ) : !isAlive ? (
            <SpectatorView />
          ) : !room || room.phase === 'lobby' ? (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6 space-y-4 glass-panel rounded-3xl border border-slate-800 shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-4xl animate-bounce">
                🎮
              </div>
              <div className="space-y-1">
                <h3 className="font-cinzel font-bold text-slate-100 text-xl">Anda Sudah Terhubung!</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Halo, <strong className="text-slate-200">{playerName}</strong>. Harap perhatikan layar Host di Discord. Permainan akan segera dimulai!
                </p>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-amber-400 font-mono tracking-wider">
                Room: {roomCode}
              </div>
            </div>
          ) : room.phase === 'role_reveal' ? (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6 space-y-4 glass-panel rounded-3xl border border-amber-600/40 glow-amber animate-pop-spring">
              <span className="text-6xl animate-pulse">🔮</span>
              <div className="space-y-2">
                <h3 className="font-cinzel font-bold text-amber-300 text-xl">Peran Anda:</h3>
                <div className="text-2xl sm:text-3xl font-black text-slate-100">{role?.indonesianName}</div>
                <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">{role?.description}</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
              >
                Buka Kartu 3D
              </button>
            </div>
          ) : room.phase === 'night' ? (
            <NightActionPad />
          ) : room.phase === 'day' ? (
            <div className="p-6 text-center space-y-6 glass-panel rounded-3xl border border-slate-800 shadow-xl">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto text-4xl animate-sun-burst">
                ☀️
              </div>
              <div className="space-y-2">
                <h3 className="font-cinzel font-black text-amber-200 text-2xl">Fase Diskusi Siang</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Bicaralah melalui Discord voice chat. Saling bertanya, berikan alibi, atau pertahankan diri Anda dari tuduhan warga!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setIsLogModalOpen(true);
                  }}
                  className="px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 inline-flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Buka Jurnal & Riwayat Aksi Pribadi</span>
                </button>
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="px-5 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 inline-flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Cek Kartu Peran</span>
                </button>
              </div>
            </div>
          ) : room.phase === 'voting' ? (
            <VotePad />
          ) : room.phase === 'ended' ? (
            <div className="p-8 text-center space-y-4 glass-panel rounded-3xl border border-slate-800 shadow-2xl animate-pop-spring">
              <span className="text-6xl animate-bounce inline-block">🏆</span>
              <h3 className="font-cinzel font-black text-slate-100 text-2xl">Permainan Selesai!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lihat layar utama di Discord untuk menyaksikan selebrasi tim pemenang dan pengungkapan seluruh peran asli para pemain!
              </p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};
