import React, { useEffect, useState } from 'react';
import { useHostStore } from '../../store/hostStore.js';
import { socket } from '../../socket.js';
import { ALL_ROLES, THEMED_PRESETS, type Preset } from '@werewolf/shared';
import { BalanceBar } from '../common/BalanceBar.js';
import { Sparkles, Sliders, BookOpen, RefreshCw, Check } from 'lucide-react';

export const HostConfig: React.FC = () => {
  const { room, publicPlayers, balanceEval, setBalanceEval, activeConfigTab, setActiveConfigTab } = useHostStore();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(room?.settings.enabledRoles || []);
  const [hasGenerated, setHasGenerated] = useState(false);

  const playerCount = Math.max(5, publicPlayers.length);

  // Recalculate balance and sync settings whenever roles or player count change.
  // Debounced 300ms to avoid spamming server on rapid role toggles.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/balance/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRoles, playerCount }),
      })
        .then((res) => res.json())
        .then((data) => {
          setBalanceEval(data);
        })
        .catch((err) => console.error('Gagal kalkulasi balance:', err));

      if (room) {
        socket.emit('host:update_settings', {
          roomCode: room.code,
          settings: { ...room.settings, enabledRoles: selectedRoles },
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoles, playerCount]);

  const handleApplyPreset = (preset: Preset) => {
    const roles: string[] = [];
    for (const r of preset.suggestedRoles) {
      roles.push(r);
    }
    // Fill with villagers up to player count
    while (roles.length < playerCount) {
      roles.push('villager');
    }
    setSelectedRoles(roles);
  };

  const handleAutoGenerate = () => {
    fetch('/api/balance/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCount }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSelectedRoles(data.roles);
        setBalanceEval(data.evaluation);
        setHasGenerated(true);
      })
      .catch((err) => console.error('Gagal generate setup:', err));
  };

  const handleToggleRole = (roleId: string) => {
    if (roleId === 'villager') return; // Cannot toggle base villager off completely

    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Live Balance Bar */}
      <BalanceBar evaluation={balanceEval} playerCount={playerCount} />

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveConfigTab('presets')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
            activeConfigTab === 'presets'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Preset Bertema</span>
        </button>

        <button
          onClick={() => setActiveConfigTab('generator')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
            activeConfigTab === 'generator'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Generator Otomatis</span>
        </button>

        <button
          onClick={() => setActiveConfigTab('manual')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
            activeConfigTab === 'manual'
              ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Manual Toggle</span>
        </button>
      </div>

      {/* Tab 1: Presets */}
      {activeConfigTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMED_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-cinzel font-bold text-slate-100">{preset.name}</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                    {preset.theme}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{preset.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {preset.suggestedRoles.map((r) => {
                    const def = ALL_ROLES[r];
                    return (
                      <span
                        key={r}
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          def?.team === 'werewolf'
                            ? 'bg-blood-950/80 text-blood-400 border border-blood-800'
                            : def?.team === 'neutral'
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {def?.indonesianName || r}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => handleApplyPreset(preset)}
                className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Gunakan Preset Ini</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Generator */}
      {activeConfigTab === 'generator' && (
        <div className="space-y-5">
          {/* Header & Generate Button */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-base font-bold font-cinzel text-slate-100">Setup Generator Cerdas</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Sistem otomatis memilih kombinasi role paling seimbang untuk{' '}
                <strong className="text-amber-400">{playerCount} pemain</strong>, dengan rotasi agar tiap sesi selalu
                fresh dan tidak monoton.
              </p>
            </div>
            <button
              onClick={handleAutoGenerate}
              className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all inline-flex items-center gap-2 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate Setup Baru</span>
            </button>
          </div>

          {/* Role Breakdown — shown after a setup is loaded */}
          {hasGenerated ? (() => {
            const roleCounts: Record<string, number> = {};
            for (const r of selectedRoles) {
              roleCounts[r] = (roleCounts[r] || 0) + 1;
            }
            const uniqueRoles = Object.entries(roleCounts).map(([id, count]) => ({
              id, count, def: ALL_ROLES[id],
            }));

            const wolves  = uniqueRoles.filter((r) => r.def?.team === 'werewolf');
            const village = uniqueRoles.filter((r) => r.def?.team === 'village');
            const neutrals = uniqueRoles.filter((r) => r.def?.team === 'neutral');

            const wolfCount    = wolves.reduce((s, r) => s + r.count, 0);
            const villageCount = village.reduce((s, r) => s + r.count, 0);
            const neutralCount = neutrals.reduce((s, r) => s + r.count, 0);

            const teamConfig = [
              { label: '🐺 Tim Serigala', lc: 'text-blood-400',   bc: 'border-blood-800/60',   bg: 'bg-blood-950/30',   badge: 'bg-blood-900/80 text-blood-300 border-blood-800',   cnt: 'bg-blood-800 text-blood-100',   items: wolves,   total: wolfCount },
              { label: '🏘️ Tim Desa',     lc: 'text-emerald-400', bc: 'border-emerald-800/40', bg: 'bg-emerald-950/20', badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-800', cnt: 'bg-emerald-800 text-emerald-100', items: village,  total: villageCount },
              ...(neutrals.length > 0 ? [{ label: '⚖️ Tim Netral', lc: 'text-purple-400', bc: 'border-purple-800/40', bg: 'bg-purple-950/20', badge: 'bg-purple-900/60 text-purple-300 border-purple-800', cnt: 'bg-purple-800 text-purple-100', items: neutrals, total: neutralCount }] : []),
            ];

            return (
              <div className="space-y-4 animate-pop-spring">
                {/* Summary strip */}
                <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ringkasan:</span>
                  <span className="px-3 py-1 rounded-full bg-blood-950/60 border border-blood-800/60 text-xs font-bold text-blood-300">🐺 {wolfCount} Serigala</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-xs font-bold text-emerald-300">🏘️ {villageCount} Warga</span>
                  {neutralCount > 0 && <span className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/60 text-xs font-bold text-purple-300">⚖️ {neutralCount} Netral</span>}
                  <span className="ml-auto text-xs text-slate-500">Total: <strong className="text-slate-300">{selectedRoles.length}</strong> role</span>
                </div>

                {/* Per-team role cards */}
                {teamConfig.map((team) => (
                  <div key={team.label} className={`rounded-xl border ${team.bc} ${team.bg} overflow-hidden`}>
                    <div className={`px-4 py-2.5 border-b ${team.bc} flex items-center justify-between`}>
                      <span className={`font-cinzel font-bold text-sm ${team.lc}`}>{team.label}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${team.cnt}`}>{team.total} slot</span>
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {team.items.map(({ id, count, def }) => (
                        <div key={id} className={`p-3 rounded-lg border ${team.bc} bg-slate-900/70 space-y-1.5 relative`}>
                          {count > 1 && (
                            <span className={`absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded ${team.cnt}`}>×{count}</span>
                          )}
                          <div className="pr-6">
                            <div className="font-bold text-sm text-slate-100">{def?.indonesianName || id}</div>
                            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{def?.name || id}</div>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{def?.description || '-'}</p>
                          {def?.balanceCategory && (
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-semibold ${team.badge}`}>
                              {def.balanceCategory.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <p className="text-center text-xs text-slate-500 pb-1">
                  Tidak cocok? Klik <strong className="text-amber-400">Generate Setup Baru</strong> lagi untuk variasi berbeda, atau buka tab <strong className="text-amber-400">Manual Toggle</strong> untuk kustomisasi bebas.
                </p>
              </div>
            );
          })() : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-2 border-2 border-dashed border-slate-800 rounded-xl">
              <RefreshCw className="w-8 h-8 text-slate-700" />
              <p className="text-xs">Klik tombol di atas untuk membuat setup role otomatis</p>
            </div>
          )}
        </div>
      )}


      {/* Tab 3: Manual Toggle */}
      {activeConfigTab === 'manual' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(ALL_ROLES).map((role) => {
            const isSelected = selectedRoles.includes(role.id);
            const teamStyles = {
              werewolf: 'border-blood-800 bg-blood-950/40 text-blood-300',
              neutral: 'border-purple-800 bg-purple-950/40 text-purple-300',
              village: 'border-slate-800 bg-slate-900/40 text-slate-300',
            };

            return (
              <div
                key={role.id}
                onClick={() => handleToggleRole(role.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-950/20 shadow-sm'
                    : 'border-slate-800/80 bg-slate-900/40 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{role.indonesianName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${teamStyles[role.team]}`}>
                      {role.team}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{role.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
