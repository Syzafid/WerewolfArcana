import React, { useEffect } from 'react';
import type { GamePhase } from '@werewolf/shared';
import { soundManager } from '../../utils/soundManager.js';

interface MistBackgroundProps {
  phase?: GamePhase | null;
}

// Generate static pseudo-random particle configs so they don't re-randomize on every re-render
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 13.7 + 7) % 96}%`,
  top: `${(i * 17.3 + 5) % 92}%`,
  size: (i % 3) + 2,
  duration: 3 + (i % 5) * 1.5,
  delay: (i % 7) * 0.4,
}));

export const MistBackground: React.FC<MistBackgroundProps> = ({ phase = 'lobby' }) => {
  const isNight = phase === 'night';
  const isDay = phase === 'day';
  const isVoting = phase === 'voting';
  const isEnded = phase === 'ended';

  // Trigger phase sound effect when phase changes
  useEffect(() => {
    if (phase) {
      soundManager.playPhaseTransition(phase);
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Dynamic Ambient Gradient Backing */}
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${
          isNight
            ? 'bg-gradient-to-b from-[#030612] via-[#080d22] to-[#02040a]'
            : isDay
            ? 'bg-gradient-to-b from-[#1c1308] via-[#0d1527] to-[#060913]'
            : isVoting
            ? 'bg-gradient-to-b from-[#1f0505] via-[#100c19] to-[#060913]'
            : isEnded
            ? 'bg-gradient-to-b from-[#150a26] via-[#090d21] to-[#060913]'
            : 'bg-gradient-to-b from-[#080d1e] via-[#060913] to-[#04060f]'
        }`}
      />

      {/* Mist Blob 1 (Top Left) */}
      <div
        className={`absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full blur-[130px] opacity-35 animate-mist-1 transition-colors duration-1000 ${
          isNight
            ? 'bg-indigo-600/35'
            : isDay
            ? 'bg-amber-500/25'
            : isVoting
            ? 'bg-rose-600/35'
            : 'bg-blue-600/20'
        }`}
      />

      {/* Mist Blob 2 (Bottom Right) */}
      <div
        className={`absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[140px] opacity-30 animate-mist-2 transition-colors duration-1000 ${
          isNight
            ? 'bg-purple-900/35'
            : isDay
            ? 'bg-orange-600/20'
            : isVoting
            ? 'bg-blood-900/40'
            : 'bg-indigo-900/20'
        }`}
      />

      {/* Center Ambient Glow */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20 transition-all duration-1000 ${
          isNight
            ? 'bg-cyan-500/20'
            : isDay
            ? 'bg-amber-400/25'
            : isVoting
            ? 'bg-rose-500/30'
            : 'bg-slate-500/15'
        }`}
      />

      {/* Dynamic Ambient Particles / Stardust / Embers */}
      <div className="absolute inset-0">
        {PARTICLES.map((p) => {
          let particleBg = 'bg-slate-300';
          let particleShadow = 'none';

          if (isNight) {
            particleBg = p.id % 2 === 0 ? 'bg-cyan-200' : 'bg-indigo-200';
            particleShadow = '0 0 8px rgba(165, 180, 252, 0.9)';
          } else if (isDay) {
            particleBg = p.id % 2 === 0 ? 'bg-amber-300' : 'bg-yellow-200';
            particleShadow = '0 0 8px rgba(251, 191, 36, 0.8)';
          } else if (isVoting) {
            particleBg = 'bg-rose-400';
            particleShadow = '0 0 10px rgba(244, 63, 94, 0.9)';
          }

          return (
            <div
              key={p.id}
              className="absolute rounded-full pointer-events-none animate-twinkle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                boxShadow: particleShadow,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            >
              <div className={`w-full h-full rounded-full ${particleBg}`} />
            </div>
          );
        })}
      </div>

      {/* Atmospheric Forest & Village Silhouette Horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-25 overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-full text-slate-950 fill-current"
        >
          <path d="M0,120 L0,85 L30,65 L50,90 L90,55 L120,80 L160,45 L190,75 L230,40 L270,82 L310,50 L350,78 L390,38 L430,70 L480,48 L530,76 L580,35 L620,72 L670,42 L720,80 L760,50 L810,75 L860,35 L900,72 L950,48 L1000,82 L1050,40 L1100,70 L1150,52 L1200,85 L1200,120 Z" />
        </svg>
      </div>

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,6,15,0.85)_100%)]" />
    </div>
  );
};

