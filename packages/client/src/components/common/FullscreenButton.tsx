import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenButtonProps {
  className?: string;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({ className = '' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state with actual browser fullscreen status (e.g. user presses F11 or Esc)
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Some browsers may block fullscreen without user gesture — silently ignore
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title={isFullscreen ? 'Keluar Layar Penuh (Esc)' : 'Mode Layar Penuh'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
        bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-emerald-500
        active:scale-95 ${className}`}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Keluar FS</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Fullscreen</span>
        </>
      )}
    </button>
  );
};
