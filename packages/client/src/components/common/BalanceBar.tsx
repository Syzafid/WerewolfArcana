import React, { useState } from 'react';
import type { BalanceEvaluation } from '@werewolf/shared';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface BalanceBarProps {
  evaluation: BalanceEvaluation | null;
  playerCount: number;
}

export const BalanceBar: React.FC<BalanceBarProps> = ({ evaluation, playerCount }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!evaluation) return null;

  const { score, verdict, verdictLabel, reasons } = evaluation;

  const colorStyles = {
    green: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-600/40',
      bg: 'bg-emerald-950/30',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    yellow: {
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      border: 'border-amber-600/40',
      bg: 'bg-amber-950/30',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    },
    red: {
      bar: 'bg-rose-500',
      text: 'text-rose-400',
      border: 'border-rose-600/40',
      bg: 'bg-rose-950/30',
      icon: <XCircle className="w-5 h-5 text-rose-400" />,
    },
  };

  const currentStyle = colorStyles[verdict];

  return (
    <div className={`p-4 rounded-xl border ${currentStyle.border} ${currentStyle.bg} backdrop-blur-md transition-all`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {currentStyle.icon}
          <div>
            <span className={`font-bold ${currentStyle.text}`}>{verdictLabel}</span>
            <span className="text-xs text-slate-400 ml-2 font-mono">({score}/100)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Pemain: <strong className="text-slate-200">{playerCount}</strong></span>
          {reasons.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showDetails ? 'Tutup' : 'Catatan'}</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Progress meter bar */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${currentStyle.bar}`}
          style={{ width: `${Math.max(5, score)}%` }}
        />
      </div>

      {/* Reasons breakdown dropdown */}
      {showDetails && reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1.5 text-xs text-slate-300">
          {reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
