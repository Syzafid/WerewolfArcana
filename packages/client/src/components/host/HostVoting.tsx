import React from 'react';
import { useHostStore } from '../../store/hostStore.js';
import { Vote as VoteIcon, UserCheck, ShieldAlert, AlertTriangle, Flame, Sparkles } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const HostVoting: React.FC = () => {
  const { room, publicPlayers, votes } = useHostStore();

  if (!room) return null;

  const alivePlayers = publicPlayers.filter((p) => p.alive);

  // Group votes by targetId
  const voteTallies: Record<string, { targetName: string; voters: string[] }> = {};
  let abstainCount = 0;

  for (const v of votes) {
    if (!v.targetId) {
      abstainCount++;
    } else {
      if (!voteTallies[v.targetId]) {
        voteTallies[v.targetId] = { targetName: v.targetName || 'Pemain', voters: [] };
      }
      voteTallies[v.targetId].voters.push(v.voterName);
    }
  }

  // Find max votes to highlight leading candidate
  let maxVotes = 0;
  for (const data of Object.values(voteTallies)) {
    if (data.voters.length > maxVotes) {
      maxVotes = data.voters.length;
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
      {/* High-Tension Tribunal Header */}
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-rose-950/90 border-4 border-rose-600/60 glow-crimson mb-1 animate-pulse">
          <VoteIcon className="w-12 h-12 text-rose-400 fill-rose-500/20" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-700/50 text-[11px] font-black uppercase tracking-widest text-rose-300">
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            <span>PENGADILAN AKHIR RONDE {room.round}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-cinzel font-black tracking-wider text-rose-100 drop-shadow-md">
            Pemungutan Suara Eksekusi
          </h2>

          <p className="text-rose-200/80 text-xs sm:text-sm bg-rose-950/40 border border-rose-800/40 py-2 px-4 rounded-2xl max-w-lg mx-auto shadow-inner">
            Setiap warga yang masih hidup memiliki 1 hak suara publik untuk menghukum mati tersangka serigala di tiang gantungan desa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Vote Tallies & Tension Gauges */}
        <div className="lg:col-span-2 border-ornate-crimson p-6 sm:p-7 rounded-3xl space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-rose-900/50 pb-3">
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-lg flex items-center gap-2">
                <span>Perolehan Suara Langsung</span>
                <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-600/40">
                  {votes.length} / {alivePlayers.length} Suara Masuk
                </span>
              </h3>
              <p className="text-xs text-rose-300/70">Kandidat dengan suara terbanyak mutlak akan diadili</p>
            </div>
            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/60 px-3 py-1 rounded-full">
              ⛓️ Sidang Berlangsung
            </span>
          </div>

          {Object.keys(voteTallies).length === 0 && abstainCount === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 space-y-3 border-2 border-dashed border-rose-900/40 rounded-2xl bg-slate-950/40">
              <span className="text-4xl animate-bounce">⚖️</span>
              <p className="text-sm font-semibold text-slate-300">Menunggu warga memberikan suara melalui HP masing-masing...</p>
              <p className="text-xs text-slate-500">Pilih target atau gunakan tombol abstain jika ragu.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(voteTallies)
                .sort((a, b) => b[1].voters.length - a[1].voters.length)
                .map(([targetId, data]) => {
                  const targetPlayer = publicPlayers.find((p) => p.id === targetId);
                  const isLeading = data.voters.length === maxVotes && maxVotes > 0;
                  const percentage = Math.round((data.voters.length / alivePlayers.length) * 100);

                  return (
                    <div
                      key={targetId}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-500 space-y-3 relative overflow-hidden ${
                        isLeading
                          ? 'border-rose-600/80 bg-gradient-to-r from-rose-950/80 to-slate-950/80 animate-heartbeat-danger'
                          : 'border-slate-800/90 bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          {targetPlayer && (
                            <div className="relative">
                              <Avatar seed={targetPlayer.avatarSeed} name={targetPlayer.name} size="md" alive={true} />
                              {isLeading && (
                                <span className="absolute -top-1 -right-1 text-xs bg-rose-600 text-white rounded-full p-0.5 border border-white shadow">
                                  ⛓️
                                </span>
                              )}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-slate-100">{data.targetName}</span>
                              {isLeading && (
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-md animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Terdakwa Utama</span>
                                </span>
                              )}
                            </div>

                            {/* Ballots list */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {data.voters.map((voterName, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-900/90 text-slate-200 border border-rose-500/30 shadow-sm animate-pop-spring"
                                >
                                  🗳️ {voterName}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-2xl font-mono font-black ${isLeading ? 'text-rose-400 drop-shadow-md' : 'text-slate-300'}`}>
                            {data.voters.length} <span className="text-xs font-sans font-normal text-slate-400">suara</span>
                          </span>
                        </div>
                      </div>

                      {/* Battle Tension Gauge Bar */}
                      <div className="w-full bg-slate-900/90 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isLeading
                              ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 shadow-md shadow-rose-600/50'
                              : 'bg-gradient-to-r from-slate-600 to-slate-400'
                          }`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

              {abstainCount > 0 && (
                <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span>🕊️</span>
                    <span>Abstain / Tidak Memilih Siapa-siapa</span>
                  </span>
                  <span className="font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {abstainCount} Suara
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Voter Participation Court Checklist */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="font-cinzel font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Daftar Juror Warga</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {votes.length}/{alivePlayers.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {alivePlayers.map((p) => {
              const hasVoted = votes.some((v) => v.voterId === p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    hasVoted
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-slate-200'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                  }`}
                >
                  <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${
                      hasVoted
                        ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700 animate-stamp'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {hasVoted ? '✓ Sudah Memilih' : 'Sedang Memilih...'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Aturan Seri:</strong> Jika dua kandidat memperoleh jumlah suara tertinggi yang sama persis, tiang gantungan kosong dan tidak ada warga yang dieksekusi.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

