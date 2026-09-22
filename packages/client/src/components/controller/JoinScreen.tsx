import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { socket } from '../../socket.js';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';

export const JoinScreen: React.FC = () => {
  const { setAuth, roomCode: storedCode, playerName: storedName } = usePlayerStore();

  const [code, setCode] = useState(storedCode);
  const [name, setName] = useState(storedName);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fill code from URL query ?code=XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg('Kode room dan nama pemain wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    socket.emit(
      'player:join_room',
      { roomCode: code.trim().toUpperCase(), playerName: name.trim() },
      (res) => {
        setIsLoading(false);
        if (res.success && res.playerId && res.sessionToken) {
          setAuth(res.playerId, res.sessionToken, code.trim().toUpperCase(), name.trim());
        } else {
          setErrorMsg(res.error || 'Gagal bergabung ke room.');
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-night-950 text-slate-100">
      <div className="w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <span className="text-5xl inline-block animate-pulse">🐺</span>
          <h1 className="text-2xl font-cinzel font-black tracking-wider text-amber-400">
            ARCANA WEREWOLF
          </h1>
          <p className="text-xs text-slate-400">
            Masuk ke permainan menggunakan smartphone Anda sebagai controller.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-700 text-rose-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Kode Room (4 Karakter)
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: WOLF"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-center font-mono text-xl font-bold tracking-widest text-amber-400 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Nama Anda
            </label>
            <input
              type="text"
              maxLength={15}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama / alias"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Menghubungkan...' : 'Gabung Permainan'}</span>
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-500">
          Perangkat Anda akan tetap terhubung otomatis meskipun browser di-refresh.
        </div>
      </div>
    </div>
  );
};
