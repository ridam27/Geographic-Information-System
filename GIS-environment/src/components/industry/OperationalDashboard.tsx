import React from 'react';
import { Activity, ShieldAlert, AlertTriangle, CheckCircle, Flame, Wind } from 'lucide-react';
import { cities } from '../../mockData';

interface OperationalDashboardProps {
  selectedLocationId: string | null;
}

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ selectedLocationId }) => {
  const city = cities.find(c => c.id === selectedLocationId) || cities[0];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 text-slate-100">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
            Executive Operational Command — {city ? `${city.name}, ${city.country}` : 'Global Grid'}
          </h3>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
          SYSTEM HEALTH: OPTIMAL
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" /> Active Regional Risk
          </span>
          <span className="text-lg font-black text-white font-mono">{city.baseTemp > 30 ? 'HIGH' : 'MODERATE'}</span>
          <span className="text-[9px] text-slate-500 font-mono">Based on live observations</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-sky-400" /> Max Wind Velocity
          </span>
          <span className="text-lg font-black text-sky-400 font-mono">{city.baseWindSpeed} km/h</span>
          <span className="text-[9px] text-slate-500 font-mono">Surface anemometer</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> Active Advisories
          </span>
          <span className="text-lg font-black text-amber-400 font-mono">2 Active</span>
          <span className="text-[9px] text-slate-500 font-mono">Wind & AQI thresholds</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> AI Confidence Index
          </span>
          <span className="text-lg font-black text-purple-400 font-mono">95%</span>
          <span className="text-[9px] text-slate-500 font-mono">High input quality</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-slate-300">
          Executive Decision Guidance: Operational risk parameters are within acceptable tolerance. Maintain normal monitoring schedules.
        </span>
      </div>
    </div>
  );
};
