import React, { useState } from 'react';
import { Briefcase, Wheat, HardHat, Plane, Anchor, Truck, Siren, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { IndustryService } from '../../services/industryService';
import type { IndustrySector } from '../../types/industry';
import { DataQualityPanel } from './DataQualityPanel';
import { OperationalDashboard } from './OperationalDashboard';
import { cities } from '../../mockData';

interface IndustryWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationId: string | null;
}

export const IndustryWorkspaceModal: React.FC<IndustryWorkspaceModalProps> = ({
  isOpen,
  onClose,
  selectedLocationId,
}) => {
  const [activeSector, setActiveSector] = useState<IndustrySector>('agriculture');

  if (!isOpen) return null;

  const city = cities.find(c => c.id === selectedLocationId) || cities[0];

  const guidance = IndustryService.getOperationalGuidance(activeSector, {
    temp: city.baseTemp,
    windSpeed: city.baseWindSpeed,
    rainfall: 3.5,
    humidity: city.baseHumidity,
  });

  const sectors: { id: IndustrySector; label: string; icon: React.ReactNode }[] = [
    { id: 'agriculture', label: 'Agriculture', icon: <Wheat className="w-4 h-4 text-emerald-400" /> },
    { id: 'mining', label: 'Mining', icon: <HardHat className="w-4 h-4 text-amber-400" /> },
    { id: 'aviation', label: 'Aviation', icon: <Plane className="w-4 h-4 text-sky-400" /> },
    { id: 'marine', label: 'Marine', icon: <Anchor className="w-4 h-4 text-cyan-400" /> },
    { id: 'logistics', label: 'Logistics', icon: <Truck className="w-4 h-4 text-purple-400" /> },
    { id: 'disaster', label: 'Disaster Mgmt', icon: <Siren className="w-4 h-4 text-red-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Enterprise Industry Workspaces & Decision Support
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sector Tabs */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {sectors.map(s => {
            const active = activeSector === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSector(s.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  active
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Workspace Body */}
        <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Executive Operational Dashboard */}
          <OperationalDashboard selectedLocationId={selectedLocationId} />

          {/* Sector Decision Support Guidance */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-sm text-white font-mono flex items-center gap-2">
                {guidance.title} Decision Support
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border font-mono ${
                guidance.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                guidance.riskLevel === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {guidance.riskLevel} OPERATIONAL RISK
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              {/* Impacts */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5 text-[10px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Detected Sector Impacts
                </span>
                <ul className="flex flex-col gap-1.5 text-slate-300">
                  {guidance.impacts.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-amber-400">•</span> {imp}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5 text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Operational Guidance & Actions
                </span>
                <ul className="flex flex-col gap-1.5 text-slate-300">
                  {guidance.suggestedActions.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-emerald-400">👉</span> {act}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Data Provenance & Quality Panel */}
          <DataQualityPanel />
        </div>
      </div>
    </div>
  );
};
