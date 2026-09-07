import { Building2, MapPin, X } from 'lucide-react';
import { EnvironmentalService } from '../../services/environmentalService';

interface AssetMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetMonitoringModal: React.FC<AssetMonitoringModalProps> = ({ isOpen, onClose }) => {
  const assets = EnvironmentalService.getTrackedAssets();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Enterprise Asset & Facility Proximity Monitoring (v3.0)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Asset Cards */}
        <div className="p-5 flex flex-col gap-3 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
          {assets.map(asset => (
            <div key={asset.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-extrabold text-white text-sm">{asset.name}</span>
                  <span className="text-slate-400 text-[10px] font-mono flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-400" /> {asset.city} ({asset.lat}°N, {asset.lng}°E)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end text-[10px] font-mono">
                  <span className="text-slate-400">Proximity Radius Alert</span>
                  <span className="font-bold text-sky-300">25km Buffer</span>
                </div>

                <span className={`text-[10px] px-3 py-1 rounded-full font-bold border font-mono ${
                  asset.riskStatus === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  asset.riskStatus === 'ADVISORY' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {asset.riskStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
