import React from 'react';

interface AvatarProps {
  seed: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alive?: boolean;
}

// Strictly neutral animal mascots that have zero correlation with any game roles
const NEUTRAL_AVATARS = [
  '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙',
  '🦄', '🦉', '🐧', '🦝', '🦔', '🦦', '🦥', '🦩',
  '🦫', '🦭', '🐿️', '🐬', '🦘', '🦚', '🐢', '🦆'
];

export const Avatar: React.FC<AvatarProps> = ({ seed, name, size = 'md', alive = true }) => {
  // Deterministic emoji based on seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const emoji = NEUTRAL_AVATARS[Math.abs(hash) % NEUTRAL_AVATARS.length];

  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-5xl',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl border transition-all select-none ${
        sizeClasses[size]
      } ${
        alive
          ? 'bg-slate-800/80 border-slate-600 shadow-md'
          : 'bg-slate-900/60 border-slate-800 grayscale opacity-40'
      }`}
      title={name}
    >
      <span>{alive ? emoji : '💀'}</span>
      {!alive && (
        <span className="absolute -bottom-1 -right-1 bg-blood-900 border border-blood-600 text-[10px] px-1 rounded text-white font-bold">
          RIP
        </span>
      )}
    </div>
  );
};
