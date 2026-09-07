import React from 'react';
import { Shield, Clock, Database, CheckCircle2 } from 'lucide-react';
import { IndustryService } from '../../services/industryService';

export const DataQualityPanel: React.FC = () => {
  const layers = IndustryService.getLayerDataQuality();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 text-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Shield className="w-4 h-4 text-sky-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
          Data Provenance & Layer Quality Audit
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {layers.map(layer => (
          <div key={layer.layerId} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white truncate font-mono">{layer.layerName}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Confidence {layer.confidence}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400 font-mono pt-1">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-purple-400" /> {layer.provider}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Refreshed: {layer.refreshInterval}
              </span>
              <span className="flex items-center gap-1 col-span-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Coverage: {layer.coverage}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
