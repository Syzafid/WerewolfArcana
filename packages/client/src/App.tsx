import React, { useEffect, useState } from 'react';
import { HostScreen } from './components/host/HostScreen.js';
import { ControllerScreen } from './components/controller/ControllerScreen.js';
import { Monitor, Smartphone } from 'lucide-react';

export const App: React.FC = () => {
  const [view, setView] = useState<'controller' | 'host'>(() => {
    return window.location.pathname.startsWith('/host') ? 'host' : 'controller';
  });

  useEffect(() => {
    const handlePopState = () => {
      setView(window.location.pathname.startsWith('/host') ? 'host' : 'controller');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchView = (target: 'controller' | 'host') => {
    setView(target);
    const newPath = target === 'host' ? '/host' : '/';
    window.history.pushState({}, '', newPath);
  };

  return (
    <div className="relative min-h-screen">
      {/* Floating switcher for easy multi-tab dev testing */}
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-full shadow-2xl backdrop-blur-md opacity-70 hover:opacity-100 transition-opacity">
        <button
          onClick={() => switchView('host')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            view === 'host' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
          title="Buka Layar Host (Screen share Discord)"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Host TV</span>
        </button>

        <button
          onClick={() => switchView('controller')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            view === 'controller' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
          title="Buka Controller HP Pemain"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Controller HP</span>
        </button>
      </div>

      {view === 'host' ? <HostScreen /> : <ControllerScreen />}
    </div>
  );
};
