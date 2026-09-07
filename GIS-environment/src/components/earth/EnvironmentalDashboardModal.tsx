import { Flame, Sun, Trees, Droplets, X } from 'lucide-react';
import { EnvironmentalService } from '../../services/environmentalService';

interface EnvironmentalDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnvironmentalDashboardModal: React.FC<EnvironmentalDashboardModalProps> = ({ isOpen, onClose }) => {
  const telemetry = EnvironmentalService.getTelemetry();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Trees className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Global Environmental Monitoring Suite (v3.0)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Grid */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Wildfires */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Wildfire Hotspots
              </span>
              <span className="text-lg font-black text-orange-400 font-mono">
                {telemetry.wildfireHotspots.length} Active Spots
              </span>
              <span className="text-[9px] text-slate-500 font-mono">NASA FIRMS MODIS</span>
            </div>

            {/* Drought */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Drought Severity
              </span>
              <span className="text-lg font-black text-amber-400 font-mono">{telemetry.droughtCategory}</span>
              <span className="text-[9px] text-slate-500 font-mono">SPEI: {telemetry.droughtIndex}</span>
            </div>

            {/* Vegetation NDVI */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                <Trees className="w-3.5 h-3.5 text-emerald-400" /> Vegetation Index (NDVI)
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono">{telemetry.ndviIndex}</span>
              <span className="text-[9px] text-slate-500 font-mono">{telemetry.vegetationHealth} greenness</span>
            </div>

            {/* Water Saturation */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Water Saturation
              </span>
              <span className="text-lg font-black text-cyan-400 font-mono">{telemetry.surfaceWaterSaturationPercent}%</span>
              <span className="text-[9px] text-slate-500 font-mono">Reservoir Capacity</span>
            </div>
          </div>

          {/* Wildfire Detail Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <span className="font-bold text-white font-mono flex items-center gap-1.5 text-xs">
              <Flame className="w-4 h-4 text-orange-400" /> Detected Active Thermal Hotspots
            </span>
            <div className="flex flex-col gap-2 pt-1">
              {telemetry.wildfireHotspots.map(spot => (
                <div key={spot.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-xs">{spot.name}</span>
                    <span className="text-slate-400 text-[10px]">Coords: {spot.lat}°N, {spot.lng}°E</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-orange-400 font-bold text-xs">{spot.frpMw} MW</span>
                    <span className="text-slate-400 text-[10px]">{spot.detectedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
