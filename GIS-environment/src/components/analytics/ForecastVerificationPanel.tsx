import React from 'react';
import { Target, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { VerificationService } from '../../services/verificationService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';

interface ForecastVerificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForecastVerificationPanel: React.FC<ForecastVerificationPanelProps> = ({ isOpen, onClose }) => {
  const metrics = VerificationService.getVerificationMetrics();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Forecast Accuracy & Model Calibration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-3 text-center font-mono">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-black text-emerald-400">{metrics.accuracyScore}%</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Accuracy Score</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-black text-white">±{metrics.temperatureMae}°C</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Temp MAE</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-black text-white">±{metrics.windSpeedMae} kts</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Wind MAE</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-black text-purple-400">{metrics.brierScore}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Brier Score</span>
            </div>
          </div>

          {/* Accuracy Chart */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Historical Accuracy Trend (7-Day Calibration)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">+3.3% Improvement</span>
            </div>

            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.historicalAccuracyTrend}>
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis domain={[85, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#accGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-[11px] text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Confidence calibration is evaluated continuously against ground-truth weather station observations.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
