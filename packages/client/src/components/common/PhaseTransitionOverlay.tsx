import React, { useEffect, useState, useRef } from 'react';
import type { GamePhase } from '@werewolf/shared';
import { Moon, Sun, Vote as VoteIcon, Sparkles, X } from 'lucide-react';

interface PhaseTransitionOverlayProps {
  phase: GamePhase | null;
  round: number;
}

export const PhaseTransitionOverlay: React.FC<PhaseTransitionOverlayProps> = ({ phase, round }) => {
  const [visible, setVisible] = useState(false);
  const [displayPhase, setDisplayPhase] = useState<GamePhase | null>(null);
  const prevPhaseRef = useRef<GamePhase | null>(null);

  useEffect(() => {
    // Only trigger cinematic transition when phase actually changes to active game phases
    if (
      phase &&
      phase !== prevPhaseRef.current &&
      (phase === 'night' || phase === 'day' || phase === 'voting' || phase === 'role_reveal')
    ) {
      setDisplayPhase(phase);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 2600);

      prevPhaseRef.current = phase;
      return () => clearTimeout(timer);
    }
    prevPhaseRef.current = phase;
  }, [phase, round]);

  if (!visible || !displayPhase) return null;

  const phaseConfig = {
    night: {
      title: 'MALAM TELAH TIBA',
      subtitle: 'Warga desa tertidur lelap. Kawanan serigala mulai bergerak dalam kegelapan...',
      color: 'text-indigo-200',
      badge: `RONDE ${round} — FASE MALAM`,
      badgeStyle: 'bg-indigo-950/80 border-indigo-700 text-indigo-300',
      icon: (
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-950 to-indigo-500 border-4 border-indigo-400/40 shadow-2xl flex items-center justify-center glow-blue animate-moon-rise mx-auto">
          <Moon className="w-14 h-14 text-indigo-100 fill-current" />
        </div>
      ),
    },
    day: {
      title: 'FAJAR MENYINGSING',
      subtitle: 'Matahari terbit di atas desa. Warga berkumpul mencari tahu apa yang terjadi semalam...',
      color: 'text-amber-300',
      badge: `RONDE ${round} — DISKUSI SIANG`,
      badgeStyle: 'bg-amber-950/80 border-amber-700 text-amber-300',
      icon: (
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border-4 border-amber-300 shadow-2xl flex items-center justify-center glow-amber animate-sun-burst mx-auto">
          <Sun className="w-14 h-14 text-slate-950 fill-current" />
        </div>
      ),
    },
    voting: {
      title: 'WAKTU EKSEKUSI',
      subtitle: 'Tiang gantungan telah siap. Warga desa harus memutuskan siapa yang harus diadili...',
      color: 'text-rose-400',
      badge: `RONDE ${round} — VOTING DESA`,
      badgeStyle: 'bg-rose-950/80 border-rose-700 text-rose-300',
      icon: (
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-950 to-red-600 border-4 border-rose-500 shadow-2xl flex items-center justify-center glow-crimson animate-stamp mx-auto">
          <VoteIcon className="w-14 h-14 text-white" />
        </div>
      ),
    },
    role_reveal: {
      title: 'TAKDIR DITENTUKAN',
      subtitle: 'Dewa malam telah membagikan peran rahasia. Periksa kartu Anda sekarang...',
      color: 'text-amber-300',
      badge: 'PERSIAPAN PERMAINAN',
      badgeStyle: 'bg-amber-950/80 border-amber-700 text-amber-300',
      icon: (
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-900 to-amber-500 border-4 border-amber-400 shadow-2xl flex items-center justify-center glow-amber animate-pop-spring mx-auto">
          <Sparkles className="w-14 h-14 text-white" />
        </div>
      ),
    },
    lobby: null,
    config: null,
    ended: null,
  };

  const current = phaseConfig[displayPhase];
  if (!current) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none cursor-pointer transition-opacity duration-300 animate-fadeIn"
    >
      <div className="max-w-md w-full text-center space-y-6 animate-pop-spring">
        {current.icon}

        <div className="space-y-2">
          <span className={`inline-block text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${current.badgeStyle}`}>
            {current.badge}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-cinzel font-black tracking-wider drop-shadow-lg ${current.color}`}>
            {current.title}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          (Klik di mana saja untuk menutup seketika)
        </div>
      </div>
    </div>
  );
};
