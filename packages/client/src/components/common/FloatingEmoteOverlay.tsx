import React, { useEffect, useState } from 'react';
import { socket } from '../../socket.js';
import { soundManager } from '../../utils/soundManager.js';

interface FloatingEmote {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
  durationMs: number;
}

export const FloatingEmoteOverlay: React.FC<{ isHost?: boolean }> = ({ isHost = false }) => {
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);

  useEffect(() => {
    const handleEmote = (data: { id: string; emoji: string; senderName: string }) => {
      // Audio pop feedback
      soundManager.playEmotePop();

      // Random horizontal position between 10% and 85%
      const leftPercent = 10 + Math.random() * 75;
      const durationMs = isHost ? 4000 : 3200;

      const newEmote: FloatingEmote = {
        id: data.id || `${Date.now()}_${Math.random()}`,
        emoji: data.emoji,
        senderName: data.senderName || 'Pemain',
        leftPercent,
        durationMs,
      };

      setEmotes((prev) => [...prev.slice(-15), newEmote]);

      // Remove after animation completes
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
      }, durationMs);
    };

    socket.on('room:emote', handleEmote);

    return () => {
      socket.off('room:emote', handleEmote);
    };
  }, [isHost]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {emotes.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-6 flex flex-col items-center animate-drift-up select-none"
          style={{
            left: `${item.leftPercent}%`,
            animationDuration: `${item.durationMs}ms`,
          }}
        >
          <div
            className={`flex items-center justify-center filter drop-shadow-xl transform hover:scale-125 transition-transform ${
              isHost ? 'text-5xl sm:text-6xl animate-bounce' : 'text-3xl sm:text-4xl animate-pulse'
            }`}
          >
            {item.emoji}
          </div>
          <span
            className={`mt-1 font-black px-2 py-0.5 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-300 shadow-lg tracking-wide ${
              isHost ? 'text-xs' : 'text-[10px]'
            }`}
          >
            {item.senderName}
          </span>
        </div>
      ))}
    </div>
  );
};
