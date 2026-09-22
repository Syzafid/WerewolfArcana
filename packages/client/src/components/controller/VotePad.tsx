import React, { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { socket } from '../../socket.js';
import { Vote as VoteIcon, Check, Send, Ban, BookOpen } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const VotePad: React.FC = () => {
  const {
    roomCode,
    playerId,
    publicPlayers,
    submittedVoteTarget,
    setSubmittedVoteTarget,
    setIsLogModalOpen,
    triggerVoteGamification,
  } = usePlayerStore();

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(submittedVoteTarget);

  const aliveCandidates = publicPlayers.filter((p) => p.alive && p.id !== playerId);

  const handleSubmit = (targetId: string | null) => {
    socket.emit('player:submit_vote', {
      roomCode,
      targetId,
    });
    setSubmittedVoteTarget(targetId);
    triggerVoteGamification();
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <span className="text-xs uppercase font-bold tracking-wider text-rose-400">Pemungutan Suara</span>
        <h3 className="font-cinzel font-black text-slate-100 text-lg">Pilih Warga Untuk Dieksekusi</h3>
        <p className="text-xs text-slate-400">
          {submittedVoteTarget !== null
            ? 'Suara Anda telah tercatat dan dihitung.'
            : 'Pilih salah satu kandidat di bawah ini, atau pilih Abstain.'}
        </p>
        <div className="pt-1">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Lihat Jurnal Aksi & Catatan Deduksi</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {/* Candidates Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {aliveCandidates.map((candidate) => {
            const isSelected = selectedTargetId === candidate.id;

            return (
              <button
                key={candidate.id}
                onClick={() => {
                  if (submittedVoteTarget !== null) return;
                  setSelectedTargetId(candidate.id);
                }}
                disabled={submittedVoteTarget !== null}
                className={`p-3 rounded-2xl border flex flex-col items-center text-center space-y-2 transition-all ${
                  isSelected
                    ? 'border-rose-500 bg-rose-950/40 glow-crimson scale-102'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 active:scale-98'
                }`}
              >
                <Avatar seed={candidate.avatarSeed} name={candidate.name} size="sm" alive={true} />
                <span className="font-bold text-xs text-slate-200 truncate w-full">{candidate.name}</span>
                {isSelected && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                    <Check className="w-3 h-3" />
                    <span>Pilihan Anda</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Abstain Option Button */}
        <button
          onClick={() => {
            if (submittedVoteTarget !== null) return;
            setSelectedTargetId('abstain');
          }}
          disabled={submittedVoteTarget !== null}
          className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
            selectedTargetId === 'abstain'
              ? 'border-slate-500 bg-slate-800 text-slate-100'
              : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Abstain (Tidak Memilih Siapa-siapa)</span>
        </button>
      </div>

      {submittedVoteTarget === null ? (
        <button
          onClick={() => {
            if (!selectedTargetId) return;
            handleSubmit(selectedTargetId === 'abstain' ? null : selectedTargetId);
          }}
          disabled={!selectedTargetId}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
            selectedTargetId
              ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Kirim Suara Eksekusi</span>
        </button>
      ) : (
        <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Suara Anda berhasil dikirimkan!</span>
        </div>
      )}
    </div>
  );
};
