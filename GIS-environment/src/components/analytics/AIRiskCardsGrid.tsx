import { Brain, ShieldAlert, Thermometer, Wind, CloudRain, ShieldCheck } from 'lucide-react';
import type { AIRiskAssessmentResponse, AIRiskDetail } from '../../services/aiRiskService';

interface AIRiskCardsGridProps {
  assessment: AIRiskAssessmentResponse;
}

export const AIRiskCardsGrid: React.FC<AIRiskCardsGridProps> = ({ assessment }) => {
  const getBadgeStyle = (cat: string) => {
    switch (cat) {
      case 'EXTREME': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MODERATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const renderCard = (title: string, icon: React.ReactNode, detail: AIRiskDetail) => (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">{title}</span>
        </div>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border font-mono ${getBadgeStyle(detail.category)}`}>
          {detail.category} ({detail.score}/100)
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Confidence Rating</span>
        <span className="font-bold text-sky-400">{detail.confidence}%</span>
      </div>

      {/* Factors */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {detail.contributing_factors.map((factor, idx) => (
          <span key={idx} className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-mono">
            • {factor}
          </span>
        ))}
      </div>

      {/* Summary */}
      <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2 font-sans">
        {detail.summary}
      </p>

      {/* Advice */}
      <div className="text-[10px] text-amber-300/90 font-mono flex flex-col gap-0.5">
        {detail.recommendations.map((rec, i) => (
          <span key={i}>👉 {rec}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full text-slate-100">
      {/* Composite Executive Header */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950/80 border border-purple-500/30 rounded-2xl p-4 flex flex-col gap-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider font-mono text-purple-200">
              AI Risk Intelligence Assessment — {assessment.location_name}
            </h3>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold border font-mono ${getBadgeStyle(assessment.composite_risk_category)}`}>
            Composite Risk: {assessment.composite_risk_category} ({assessment.composite_risk_score}/100)
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {assessment.ai_executive_summary}
        </p>
      </div>

      {/* Risk Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderCard('Storm & Typhoon Hazard', <ShieldAlert className="w-4 h-4 text-red-400" />, assessment.storm_risk)}
        {renderCard('Torrential Rain Hazard', <CloudRain className="w-4 h-4 text-blue-400" />, assessment.heavy_rain_risk)}
        {renderCard('Gale Wind Hazard', <Wind className="w-4 h-4 text-sky-400" />, assessment.high_wind_risk)}
        {renderCard('Thermal & Heat Stress', <Thermometer className="w-4 h-4 text-orange-400" />, assessment.heat_stress_risk)}
        {renderCard('Air Quality Hazard', <ShieldCheck className="w-4 h-4 text-emerald-400" />, assessment.aqi_risk)}
      </div>
    </div>
  );
};
