import React, { useState } from 'react';
import { socket } from '../../socket.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { soundManager } from '../../utils/soundManager.js';
import { Sparkles, MessageCircleHeart, ChevronUp, ChevronDown } from 'lucide-react';

const EMOTES = [
  { emoji: '🐺', label: 'Lolongan' },
  { emoji: '🔥', label: 'Panas' },
  { emoji: '😱', label: 'Syok' },
  { emoji: '🤫', label: 'Rahasia' },
  { emoji: '🧐', label: 'Sus' },
  { emoji: '👏', label: 'GG' },
  { emoji: '💀', label: 'RIP' },
];

export const EmoteBar: React.FC = () => {
  const { roomCode, playerName, triggerEmoteGamification } = usePlayerStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<boolean>(false);

  const handleSendEmote = (emoji: string) => {
    if (cooldown || !roomCode) return;

    soundManager.playEmotePop();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }

    socket.emit('player:send_emote', {
      roomCode,
      emoji,
      senderName: playerName || 'Pemain',
    });

    // Gamification progress
    triggerEmoteGamification();

    // 400ms cooldown to avoid extreme spam
    setCooldown(true);
    setTimeout(() => setCooldown(false), 400);
  };

  if (!roomCode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {/* Emotes drawer */}
      {isOpen && (
        <div className="mb-2 p-2 bg-slate-950/95 border border-amber-500/40 rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-1.5 animate-pop-spring">
          {EMOTES.map((item) => (
            <button
              key={item.emoji}
              onClick={() => handleSendEmote(item.emoji)}
              disabled={cooldown}
              title={item.label}
              className={`w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 active:scale-90 border border-slate-800 hover:border-amber-500/50 flex items-center justify-center text-xl transition-all cursor-pointer ${
                cooldown ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
              }`}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main trigger button */}
      <button
        onClick={() => {
          soundManager.playClick();
          setIsOpen(!isOpen);
        }}
        className={`px-3.5 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-xl transition-all transform active:scale-95 cursor-pointer border ${
          isOpen
            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
            : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/30'
        }`}
      >
        <span className="text-sm">✨</span>
        <span className="tracking-wide">Reaksi</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
