import React from 'react';
import { Globe2, Layers, Cpu, Clock, CheckCircle2, Server, Database, Activity } from 'lucide-react';

interface StatusBarProps {
  activeBasemap: string;
  activeLayersCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeBasemap,
  activeLayersCount,
}) => {
  return (
    <footer className="h-7 bg-slate-950/20 backdrop-blur-md border-t border-slate-800/30 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 z-[100] select-none shrink-0">
      {/* Left Telemetry */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-sky-400 font-bold">
          <Globe2 className="w-3.5 h-3.5" /> 19.0760° N, 72.8777° E (Zoom: 10)
        </span>
        <span className="hidden md:inline border-l border-slate-800 pl-3">
          Provider: <strong className="text-slate-200">Open-Meteo & NASA GIBS</strong>
        </span>
        <span className="hidden lg:flex items-center gap-1 border-l border-slate-800 pl-3">
          <Activity className="w-3.5 h-3.5 text-cyan-400" /> FPS: <strong className="text-slate-200">60</strong>
        </span>
      </div>

      {/* Right Telemetry */}
      <div className="flex items-center gap-4">
        <span className="hidden xl:flex items-center gap-1 text-slate-400 border-l border-slate-800 pl-3">
          <Layers className="w-3.5 h-3.5 text-purple-400" /> Basemap: <strong className="text-white uppercase">{activeBasemap}</strong> ({activeLayersCount} Overlays)
        </span>

        <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-bold border-l border-slate-800 pl-3">
          <CheckCircle2 className="w-3.5 h-3.5" /> Latency: 18ms
        </span>

        <span className="hidden lg:flex items-center gap-1 border-l border-slate-800 pl-3">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" /> AI: <strong className="text-emerald-400">ONLINE</strong>
        </span>

        <span className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-3">
          <Server className="w-3.5 h-3.5 text-sky-400" /> Server: <strong className="text-emerald-400">ONLINE</strong>
        </span>

        <span className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-3">
          <Database className="w-3.5 h-3.5 text-purple-400" /> DB: <strong className="text-emerald-400">CONNECTED</strong>
        </span>

        <span className="flex items-center gap-1 border-l border-slate-800 pl-3 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> UTC: {new Date().toISOString().slice(11, 19)}
        </span>
      </div>
    </footer>
  );
};
export default StatusBar;
