import React, { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { Trophy, Star, Sparkles, X } from 'lucide-react';

export const AchievementToast: React.FC = () => {
  const { pendingToast, clearPendingToast } = usePlayerStore();

  useEffect(() => {
    if (!pendingToast) return;
    const timer = setTimeout(() => {
      clearPendingToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [pendingToast, clearPendingToast]);

  if (!pendingToast) return null;

  return (
    <div className="fixed top-5 inset-x-4 z-50 max-w-sm mx-auto flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/95 via-slate-950/95 to-slate-950/95 border border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-xl animate-pop-spring text-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-xl text-slate-950 shadow-md shrink-0">
          {pendingToast.type === 'levelup' ? '👑' : pendingToast.icon || '🏆'}
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase font-black tracking-widest text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>{pendingToast.title}</span>
          </div>
          <p className="text-xs font-bold text-slate-100 leading-tight">
            {pendingToast.description}
          </p>
        </div>
      </div>
      <button
        onClick={clearPendingToast}
        className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
