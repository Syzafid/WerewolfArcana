import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import { soundManager } from '../../utils/soundManager.js';

interface TimerBadgeProps {
  endsAt: number | null;
  className?: string;
  onExpire?: () => void;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({ endsAt, className = '', onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const prevTickRef = useRef<number>(-1);

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft(0);
      return;
    }

    const calculateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Play urgent mechanical tick during final 10 seconds
      if (remaining <= 10 && remaining > 0 && remaining !== prevTickRef.current) {
        prevTickRef.current = remaining;
        soundManager.playUrgentTick();
      }

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 500);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (!endsAt) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft <= 10;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-semibold border transition-all ${
        isUrgent
          ? 'bg-blood-950/90 border-blood-500 text-blood-400 glow-danger animate-heartbeat-danger scale-105'
          : 'bg-slate-900/90 border-amber-500/30 text-amber-300 shadow-inner'
      } ${className}`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-blood-400 animate-pulse' : 'text-amber-400'}`} />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
