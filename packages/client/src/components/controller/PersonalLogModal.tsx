import React, { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import {
  BookOpen,
  X,
  Shield,
  Moon,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Edit3,
  UserCheck,
  UserX,
  Eye,
} from 'lucide-react';
import { Avatar } from '../common/Avatar.js';

export const PersonalLogModal: React.FC = () => {
  const {
    isLogModalOpen,
    setIsLogModalOpen,
    personalLogs,
    personalNotes,
    setPersonalNote,
    publicPlayers,
    role,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'notes'>('timeline');

  if (!isLogModalOpen) return null;

  const quickTags = [
    { label: '🐺 Sus/Wolf', color: 'bg-rose-950/80 text-rose-300 border-rose-700/50' },
    { label: '🛡️ Warga Valid', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50' },
    { label: '🔍 Target Terawang', color: 'bg-amber-950/80 text-amber-300 border-amber-700/50' },
    { label: '❓ Netral/Ragu', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-950 border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Grimoire top ornament bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />

        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-black text-slate-100 text-base flex items-center gap-1.5">
                Jurnal Investigasi & Aksi
              </h2>
              <p className="text-[11px] text-slate-400">Catatan rahasia untuk deduksi peran</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogModalOpen(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Banner */}
        <div className="px-4 py-2 bg-amber-950/30 border-b border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300/90">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Catatan Pribadi:</strong> Hanya Anda yang dapat melihat jurnal ini di HP Anda.
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Riwayat Aksi ({personalLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Catatan Pemain</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {activeTab === 'timeline' ? (
            /* TAB 1: TIMELINE OF NIGHT ACTIONS & RESULTS */
            personalLogs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Search className="w-7 h-7 animate-pulse" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h4 className="font-cinzel font-bold text-slate-300 text-sm">Belum Ada Catatan Aksi</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Setiap aksi malam yang Anda lakukan sebagai {role?.indonesianName || 'peran Anda'} dan
                    hasilnya akan otomatis tercatat di sini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {personalLogs.map((log) => {
                  const isWolfResult = log.resultType === 'wolf';
                  const isVillageResult = log.resultType === 'village';
                  const isShieldResult = log.resultType === 'shield';
                  const isDangerResult = log.resultType === 'danger';

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-sm"
                    >
                      {/* Card Header: Round badge + Role */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {log.actionTitle || `Malam ${log.round}`}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {log.roleName}
                          </span>
                        </div>
                        {log.timestamp && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Action Details */}
                      <div className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="text-slate-400 font-medium">Aksi:</span>
                        <span className="font-semibold text-slate-200">{log.actionDescription}</span>
                      </div>

                      {/* Target Name Tag if exists */}
                      {log.targetName && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>Target Terpilih:</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-bold border border-slate-700/60">
                            🎯 {log.targetName}
                          </span>
                        </div>
                      )}

                      {/* Result Box */}
                      {log.resultMessage ? (
                        <div
                          className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                            isWolfResult
                              ? 'bg-rose-950/60 border-rose-600/70 text-rose-200'
                              : isVillageResult
                              ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200'
                              : isShieldResult
                              ? 'bg-cyan-950/60 border-cyan-600/70 text-cyan-200'
                              : isDangerResult
                              ? 'bg-red-950/60 border-red-600/70 text-red-200'
                              : 'bg-indigo-950/60 border-indigo-600/70 text-indigo-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
                            {isWolfResult && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                            {isVillageResult && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            {isShieldResult && <Shield className="w-3.5 h-3.5 text-cyan-400" />}
                            {isDangerResult && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                            {!isWolfResult && !isVillageResult && !isShieldResult && !isDangerResult && (
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                            <span>Hasil Aksi:</span>
                          </div>
                          <p className="font-medium">{log.resultMessage}</p>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 italic">
                          Menunggu hasil resolusi malam...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 2: DEDUCTION SCRATCHPAD PER PLAYER */
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                Tuliskan analisis, klaim peran, atau kecurigaan Anda terhadap setiap pemain untuk mempermudah deduksi saat fase diskusi dan voting.
              </div>

              {publicPlayers.map((player) => {
                const note = personalNotes[player.id] || '';

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border transition-all space-y-2 ${
                      !player.alive
                        ? 'bg-slate-950/60 border-slate-900 opacity-65'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar seed={player.avatarSeed || player.name} name={player.name} size="sm" alive={player.alive} />
                        <div>
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            {player.name}
                            {!player.alive && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800">
                                Gugur
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Tag Pills */}
                    <div className="flex flex-wrap gap-1">
                      {quickTags.map((tag) => (
                        <button
                          key={tag.label}
                          onClick={() => {
                            const newNote = note ? `${note} | ${tag.label}` : tag.label;
                            setPersonalNote(player.id, newNote);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium cursor-pointer transition-all hover:scale-105 active:scale-95 ${tag.color}`}
                        >
                          {tag.label}
                        </button>
                      ))}
                      {note && (
                        <button
                          onClick={() => setPersonalNote(player.id, '')}
                          className="text-[10px] px-1.5 py-0.5 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Hapus catatan"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    {/* Note Input */}
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setPersonalNote(player.id, e.target.value)}
                      placeholder="Ketik catatan analisis pribadi..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500/60 text-xs text-slate-200 placeholder-slate-600 outline-none transition-all"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tersimpan otomatis di memori browser Anda
          </span>
          <button
            onClick={() => setIsLogModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
