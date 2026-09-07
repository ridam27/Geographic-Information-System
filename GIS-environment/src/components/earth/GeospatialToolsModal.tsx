import React, { useState } from 'react';
import { Compass, Circle, Square, ArrowLeftRight, X } from 'lucide-react';

interface GeospatialToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeospatialToolsModal: React.FC<GeospatialToolsModalProps> = ({ isOpen, onClose }) => {
  const [bufferRadius, setBufferRadius] = useState<number>(25);
  const [activeTool, setActiveTool] = useState<'buffer' | 'polygon' | 'compare'>('buffer');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Geospatial Analysis Workspace & Buffer Tools (v3.0)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tool Tabs */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2">
          <button
            onClick={() => setActiveTool('buffer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTool === 'buffer'
                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Circle className="w-4 h-4" /> Buffer Radius Analysis
          </button>

          <button
            onClick={() => setActiveTool('polygon')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTool === 'polygon'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-4 h-4" /> Polygon Area Inspection
          </button>

          <button
            onClick={() => setActiveTool('compare')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTool === 'compare'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" /> Temporal Imagery Compare
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs">
          {activeTool === 'buffer' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                  Select Proximity Buffer Radius: {bufferRadius} km
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={bufferRadius}
                  onChange={e => setBufferRadius(Number(e.target.value))}
                  className="w-full text-sky-400"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-1 font-mono text-xs">
                <span className="text-white font-bold">Computed Buffer Coverage:</span>
                <span className="text-sky-400 font-extrabold text-sm">
                  {Math.round(Math.PI * Math.pow(bufferRadius, 2))} km²
                </span>
                <span className="text-slate-400 text-[10px] pt-1">
                  Hazard zone impact circle initialized centered at active target coordinates.
                </span>
              </div>
            </div>
          )}

          {activeTool === 'polygon' && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 flex flex-col gap-2 font-mono">
              <span className="font-bold text-white text-xs">Polygon Surface Inspection</span>
              <span>Draw custom bounding boxes on the Leaflet GIS canvas to calculate surface area and population impact metrics.</span>
            </div>
          )}

          {activeTool === 'compare' && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 flex flex-col gap-2 font-mono">
              <span className="font-bold text-white text-xs">Temporal Satellite Image Comparison</span>
              <span>Select two imagery timestamps (e.g. Landsat-8 vs Sentinel-2) to compare environmental change over time.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
