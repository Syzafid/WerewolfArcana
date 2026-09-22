import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useHostStore } from '../../store/hostStore.js';
import { socket } from '../../socket.js';
import { Avatar } from '../common/Avatar.js';
import { HostConfig } from './HostConfig.js';
import { Play, QrCode, Users, Settings2, UserX, AlertCircle, Copy, Check, Sparkles, Swords } from 'lucide-react';
import { soundManager } from '../../utils/soundManager.js';

export const HostLobby: React.FC = () => {
  const { room, publicPlayers, balanceEval } = useHostStore();
  const [activeTab, setActiveTab] = useState<'lobby' | 'config'>('lobby');
  const [copied, setCopied] = useState(false);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!room) return null;

  const joinUrl = `${window.location.origin}/?code=${room.code}`;
  const playerCount = publicPlayers.length;
  const minPlayers = 5;
  const canStart = playerCount >= minPlayers;
  const emptySlotsCount = Math.max(0, minPlayers - playerCount);

  // Generate QR Code
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 175,
        margin: 1,
        color: {
          dark: '#f8fafc',
          light: '#0b1120',
        },
      });
    }
  }, [joinUrl, activeTab]);

  const handleCopy = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = (playerId: string) => {
    soundManager.playClick();
    socket.emit('host:kick_player', { roomCode: room.code, playerId });
  };

  const handleTabChange = (tab: 'lobby' | 'config') => {
    soundManager.playClick();
    setActiveTab(tab);
  };

  const handleStartGameClick = () => {
    soundManager.playClick();
    if (!canStart) return;

    if (balanceEval && balanceEval.verdict === 'red') {
      setShowLowBalanceModal(true);
    } else {
      executeStartGame();
    }
  };

  const executeStartGame = () => {
    setShowLowBalanceModal(false);
    socket.emit('host:start_game', { roomCode: room.code }, (res) => {
      if (!res.success) {
        alert(res.error || 'Gagal memulai permainan.');
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Sub-navigation & Game Start Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleTabChange('lobby')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'lobby'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400 font-black'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Meja Warga ({playerCount})</span>
          </button>

          <button
            onClick={() => handleTabChange('config')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400 font-black'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Konfigurasi Role & Balance</span>
          </button>
        </div>

        {/* Start Game Action */}
        <div className="flex items-center gap-3">
          {!canStart && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-700/60 px-3.5 py-2 rounded-xl shadow-inner">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Perlu minimal 5 warga ({playerCount}/5)</span>
            </div>
          )}

          <button
            onClick={handleStartGameClick}
            disabled={!canStart}
            className={`flex items-center gap-2.5 px-7 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl ${
              canStart
                ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 cursor-pointer shadow-emerald-500/30 scale-105 border border-emerald-300 animate-pulse'
                : 'bg-slate-900/60 text-slate-500 cursor-not-allowed border border-slate-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Mulai Permainan</span>
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <HostConfig />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Join Instructions & Runic Tablet */}
          <div className="border-ornate-gold p-6 rounded-3xl space-y-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            {/* Ambient gold glow watermark */}
            <div className="absolute -top-12 -right-12 text-7xl opacity-10 pointer-events-none select-none">
              📜
            </div>

            <div className="space-y-1.5 w-full">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/50 border border-amber-600/40 px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>KODE PEMANGGILAN RUANG</span>
              </div>
              
              <div className="text-5xl sm:text-6xl font-mono font-black text-amber-300 tracking-widest bg-slate-950/90 py-4 px-6 rounded-2xl border-2 border-amber-500/50 glow-amber shadow-2xl animate-runic-pulse mt-2 select-all">
                {room.code}
              </div>
            </div>

            {/* QR Code in antique frame */}
            <div className="p-3 bg-slate-950 border-2 border-amber-600/30 rounded-2xl shadow-2xl relative">
              <canvas ref={canvasRef} className="rounded-xl" />
            </div>

            <div className="w-full space-y-2">
              <p className="text-xs text-amber-200/80 font-medium">
                Pindai QR dengan kamera HP atau buka tautan:
              </p>
              <div className="flex items-center gap-2 bg-slate-950/90 border border-amber-500/20 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
                <span className="truncate flex-1 text-left text-amber-300/90">{joinUrl}</span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:text-amber-300 transition-colors bg-slate-800/80 rounded-lg hover:bg-slate-700"
                  title="Salin tautan bergabung"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Players Tavern Table Grid */}
          <div className="lg:col-span-2 glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-lg font-cinzel font-bold text-slate-100 flex items-center gap-2">
                  <span>Meja Musyawarah Warga</span>
                  <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    {playerCount} Warga Terdaftar
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Semua pemain akan menerima peran rahasia di perangkat masing-masing</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full hidden sm:inline">
                🛡️ Moderator Bebas Peran
              </span>
            </div>

            {playerCount === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <QrCode className="w-14 h-14 text-amber-500/40 animate-bounce" />
                <p className="text-sm font-semibold text-slate-300">Menunggu warga pertama bergabung...</p>
                <p className="text-xs text-slate-500 max-w-xs text-center">Gunakan kode ruang atau QR code di samping untuk masuk lewat browser smartphone.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {publicPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className="player-podium p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 flex flex-col items-center text-center space-y-2 relative group hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all shadow-md animate-pop-spring"
                  >
                    {/* Player Seat Number Badge */}
                    <span className="absolute top-2 left-2 text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      #{idx + 1}
                    </span>

                    <div className="pt-2">
                      <Avatar seed={player.avatarSeed} name={player.name} size="md" alive={player.alive} />
                    </div>

                    <span className="font-bold text-sm text-slate-100 truncate w-full px-1">{player.name}</span>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <span
                        className={`w-2 h-2 rounded-full ${player.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
                      />
                      <span>{player.connected ? 'Siap Bermain' : 'Offline'}</span>
                    </div>

                    <button
                      onClick={() => handleKick(player.id)}
                      className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Keluarkan pemain"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Empty Slot Placeholders if under minimum */}
                {Array.from({ length: emptySlotsCount }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-800/80 bg-slate-950/30 flex flex-col items-center justify-center text-center space-y-2 text-slate-600 min-h-[140px]"
                  >
                    <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-sm font-mono text-slate-600">
                      #{playerCount + i + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Slot Kosong</span>
                    <span className="text-[10px] text-slate-600">Menunggu Warga</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Low Balance Score */}
      {showLowBalanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-rose-600/50 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-cinzel font-bold">Peringatan: Komposisi Tidak Seimbang</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Skor balance saat ini bernilai <strong className="text-rose-400">{balanceEval?.score}/100</strong>.
              Permainan mungkin terasa terlalu sulit bagi salah satu tim.
            </p>
            {balanceEval?.reasons && (
              <div className="p-3 bg-rose-950/40 rounded-lg text-xs text-rose-300 space-y-1">
                {balanceEval.reasons.map((r, i) => (
                  <div key={i}>• {r}</div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLowBalanceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                Kembali Sesuaikan
              </button>
              <button
                onClick={executeStartGame}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
              >
                Tetap Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
