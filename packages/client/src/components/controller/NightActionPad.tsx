import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { socket } from '../../socket.js';
import { Moon, Check, Send, Sparkles, Zap } from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const NightActionPad: React.FC = () => {
  const {
    room,
    roomCode,
    role,
    nightPrompt,
    submittedNightTarget,
    setSubmittedNightTarget,
    addOrUpdatePersonalLog,
    triggerNightActionGamification,
  } = usePlayerStore();

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(submittedNightTarget);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Vibration feedback when prompt arrives
  useEffect(() => {
    if (nightPrompt?.canAct && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 60, 100]);
      } catch {
        // ignore
      }
    }
  }, [nightPrompt]);

  if (!nightPrompt || !role) {
    return (
      <div className="p-8 text-center space-y-4">
        <Moon className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
        <h3 className="font-cinzel font-bold text-slate-200">Malam Hari Telah Tiba</h3>
        <p className="text-xs text-slate-400">Menunggu giliran aksi...</p>
      </div>
    );
  }

  if (!nightPrompt.canAct) {
    return (
      <div className="p-8 text-center space-y-4 glass-panel rounded-3xl border border-slate-800">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-3xl">
          💤
        </div>
        <div className="space-y-1">
          <h3 className="font-cinzel font-bold text-slate-200 text-lg">Anda Tertidur Lelap</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Sebagai {role.indonesianName}, Anda tidak memiliki kemampuan aksi malam hari. Istirahatlah dan tunggu pagi tiba.
          </p>
        </div>
      </div>
    );
  }

  const handleSelect = (targetId: string) => {
    if (submittedNightTarget) return;
    setSelectedTargetId(targetId);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  const handleSubmit = () => {
    if (!selectedTargetId) return;
    if (nightPrompt.roleOptions && nightPrompt.roleOptions.length > 0 && !selectedRoleId) return;

    socket.emit('player:submit_night_action', {
      roomCode,
      targetPlayerId: selectedTargetId,
      secondaryTargetId: selectedRoleId,
    });

    const targetPlayer = nightPrompt.targets.find((t) => t.id === selectedTargetId);
    const targetName = targetPlayer?.name || 'Target';
    const guessedRoleName = nightPrompt.roleOptions?.find((r) => r.id === selectedRoleId)?.name;
    const actionDesc = guessedRoleName
      ? `${currentTitle}: ${targetName} ditebak sebagai ${guessedRoleName}`
      : `${currentTitle}: ${targetName}`;

    addOrUpdatePersonalLog({
      round: room?.round || 1,
      roleId: role.id,
      roleName: role.indonesianName,
      actionTitle: `Malam ${room?.round || 1}`,
      actionDescription: actionDesc,
      targetId: selectedTargetId,
      targetName,
    });

    setSubmittedNightTarget(selectedTargetId);
    triggerNightActionGamification();
  };

  const actionTitles: Record<string, string> = {
    werewolf: 'Pilih Korban Mangsa Serigala',
    seer: 'Pilih 1 Orang Untuk Diterawang',
    guardian: 'Pilih 1 Orang Untuk Dilindungi',
    bodyguard: 'Pilih 1 Orang Untuk Dijaga',
    vigilante: 'Pilih Target Tembakan Rahasia',
    serial_killer: 'Pilih Target Pembunuhan',
    survivor: 'Strategi Rompi Antipeluru',
    sorcerer: 'Kutukan Petir Sorcerer',
  };

  const currentTitle = actionTitles[role.id] || `Gunakan Kemampuan ${role.indonesianName}`;
  const isSubmitDisabled =
    !selectedTargetId || (Boolean(nightPrompt.roleOptions && nightPrompt.roleOptions.length > 0) && !selectedRoleId);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center justify-center gap-1">
          {role.id === 'sorcerer' ? <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Aksi Malam Hari</span>
        </span>
        <h3 className="font-cinzel font-black text-slate-100 text-lg">{currentTitle}</h3>
        <p className="text-xs text-slate-400">
          {submittedNightTarget
            ? 'Aksi malam Anda telah tersimpan dan terkunci.'
            : role.id === 'survivor'
            ? 'Pilih apakah ingin mengenakan rompi malam ini atau bertaruh menyimpannya.'
            : role.id === 'sorcerer'
            ? 'Pilih target pemain dan tebak peran aslinya. Jika tepat, target tewas tersambar petir!'
            : 'Pilih 1 target pemain di bawah ini lalu konfirmasi.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {nightPrompt.targets.map((target) => {
          const isSelected = selectedTargetId === target.id;

          return (
            <button
              key={target.id}
              onClick={() => handleSelect(target.id)}
              disabled={Boolean(submittedNightTarget)}
              className={`p-3.5 rounded-2xl border flex flex-col items-center text-center space-y-2 relative transition-all duration-300 ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/50 glow-amber scale-105 shadow-xl'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 active:scale-95'
              }`}
            >
              {/* Orbital Rune ring when selected */}
              {isSelected && (
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-amber-400/50 animate-orbital pointer-events-none" />
              )}

              <Avatar seed={target.avatarSeed} name={target.name} size="md" alive={true} />
              <span className="font-bold text-xs text-slate-100 truncate w-full">{target.name}</span>

              {isSelected && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 animate-pop-spring">
                  <Check className="w-3.5 h-3.5" />
                  <span>Target Terpilih</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Role guessing section for Sorcerer */}
      {nightPrompt.roleOptions && nightPrompt.roleOptions.length > 0 && !submittedNightTarget && (
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Tebak Peran Rahasia Target:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
            {nightPrompt.roleOptions.map((opt) => {
              const isRoleSelected = selectedRoleId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedRoleId(opt.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    isRoleSelected
                      ? 'border-amber-400 bg-amber-950/70 text-amber-200 shadow-md scale-[1.02]'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!submittedNightTarget ? (
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`w-full py-4 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
            !isSubmitDisabled
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer animate-pulse'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Konfirmasi & Kunci Target</span>
        </button>
      ) : (
        <div className="p-4 bg-emerald-950/70 border-2 border-emerald-500/70 text-emerald-300 rounded-2xl text-center text-xs font-bold flex items-center justify-center gap-2 animate-stamp shadow-xl">
          <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
          <span>Target Terkunci! Menunggu fajar menyingsing...</span>
        </div>
      )}
    </div>
  );
};
