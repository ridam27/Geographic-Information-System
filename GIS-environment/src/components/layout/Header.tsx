import React from 'react';
import { Compass, RefreshCw, Bell, Settings, Activity } from 'lucide-react';
import SearchBar from '../SearchBar';

interface HeaderProps {
  onSearchSelect: (item: any) => void;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
  onOpenConsole?: () => void;
  onOpenAlerts: () => void;
  alertCount: number;
  activeLocationName?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchSelect,
  onOpenSettings,
  onOpenAlerts,
  alertCount,
  activeLocationName,
}) => {
  return (
    <header className="h-[72px] bg-slate-950/20 border-b border-slate-800/30 px-5 flex items-center justify-between z-[1000] relative backdrop-blur-md shrink-0">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center">
          <svg className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="16,2 29,9.5 29,24.5 16,32 3,24.5 3,9.5" fill="#061224" stroke="#00E5FF" strokeWidth="2" strokeLinejoin="round" />
            <rect x="9" y="10" width="14" height="2.5" rx="1" fill="#00E5FF" />
            <rect x="9" y="14.5" width="14" height="2.5" rx="1" fill="#FFB300" />
            <rect x="9" y="19" width="14" height="2.5" rx="1" fill="#FF2A6D" />
          </svg>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-black tracking-wider uppercase font-heading flex items-center gap-0 leading-tight">
              <span className="text-cyan-400">GEO</span>
              <span className="text-amber-500">LITH</span>
              <span className="text-white ml-1.5">SYSTEMS</span>
            </h1>
            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest font-mono leading-tight mt-0.5 flex items-center gap-2">
              <span>AI WEATHER & EARTH SERVICES PLATFORM</span>
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-slate-400 font-mono text-[9px] tracking-normal">AI ENGINE ONLINE</span>
            </p>
          </div>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="w-full max-w-xl px-4">
        <SearchBar onSearchSelect={onSearchSelect} activeLocationName={activeLocationName} />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 font-mono">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-bold">SYSTEM: OPTIMAL</span>
        </div>

        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 text-red-400 transition-all"
          title="Active Warnings & Alerts"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-bounce">
              {alertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all"
          title="Refresh Platform Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all"
          title="Platform Preferences"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
