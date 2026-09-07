import React from 'react';
import { Compass, RefreshCw, Bell, User, Settings, Shield, Activity } from 'lucide-react';
import SearchBar from '../SearchBar';

interface HeaderProps {
  onSearchSelect: (item: any) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenConsole: () => void;
  onOpenAlerts: () => void;
  alertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchSelect,
  onOpenSettings,
  onOpenAuth,
  onOpenConsole,
  onOpenAlerts,
  alertCount,
}) => {
  return (
    <header className="h-[72px] bg-slate-950/20 border-b border-slate-800/30 px-5 flex items-center justify-between z-[1000] relative backdrop-blur-md shrink-0">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/25 animate-pulse">
          <Compass className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '12s' }} />
        </div>
        <div>
          <h1 className="text-sm font-extrabold tracking-widest text-white uppercase font-heading flex items-center gap-1.5">
            AeroTempest
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
            AI Weather & Earth Intelligence Platform
          </p>
        </div>
      </div>

      {/* Center Search Bar Container */}
      <div className="w-full max-w-xl px-4 flex items-center">
        <div className="w-full">
          <SearchBar onSearchSelect={onSearchSelect} />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 font-mono">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-bold">SYSTEM: OPTIMAL</span>
        </div>

        <button
          onClick={onOpenConsole}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5"
          title="Enterprise Admin Console"
        >
          <Shield className="w-4 h-4" />
          <span className="hidden md:inline">Console</span>
        </button>

        <button
          onClick={onOpenAuth}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5"
          title="User Identity & Session"
        >
          <User className="w-4 h-4" />
          <span className="hidden md:inline">Auth</span>
        </button>

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
