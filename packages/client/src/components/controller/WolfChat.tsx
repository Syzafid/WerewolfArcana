import React, { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore.js';
import { socket } from '../../socket.js';
import { Send, ShieldAlert } from 'lucide-react';

export const WolfChat: React.FC = () => {
  const { roomCode, wolfChatMessages, playerName } = usePlayerStore();
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socket.emit('player:send_wolf_chat', {
      roomCode,
      text: inputText.trim(),
    });

    setInputText('');
  };

  return (
    <div className="flex flex-col h-72 glass-panel rounded-2xl border border-blood-800/60 overflow-hidden">
      {/* Wolf Chat Header */}
      <div className="px-4 py-2.5 bg-blood-950/80 border-b border-blood-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🐺</span>
          <span className="font-cinzel font-bold text-xs text-blood-300">Kanal Rahasia Serigala</span>
        </div>
        <span className="text-[10px] text-slate-400">Host Tidak Bisa Melihat</span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
        {wolfChatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-1">
            <p>Belum ada bisikan kawanan.</p>
            <p className="text-[10px] text-slate-600">Diskusikan target malam ini secara rahasia di sini.</p>
          </div>
        ) : (
          wolfChatMessages.map((msg, i) => {
            const isMe = msg.senderName === playerName;
            return (
              <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[10px] text-blood-400 font-bold mb-0.5">{msg.senderName}</span>}
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[80%] leading-relaxed ${
                    isMe
                      ? 'bg-blood-900 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className="p-2 bg-slate-950/80 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Bisikkan pesan..."
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blood-500"
        />
        <button
          type="submit"
          className="p-2 bg-blood-600 hover:bg-blood-500 text-white rounded-xl transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
