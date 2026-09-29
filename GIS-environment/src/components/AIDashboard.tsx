import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { 
  Activity, 
  Wind, 
  Gauge, 
  CloudRain, 
  Zap, 
  Thermometer, 
  Droplets,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Loader2
} from 'lucide-react';
import { cities } from '../mockData';
import { useEffect, useState } from 'react';
import { fetchLiveWeather, type OpenMeteoData } from '../api/openMeteo';
import { AIRiskCardsGrid } from './analytics/AIRiskCardsGrid';
import { AIRiskService, type AIRiskAssessmentResponse } from '../services/aiRiskService';

interface AIDashboardProps {
  timeOffset: number;
  selectedLocationId: string | null;
  selectedLocationType: 'city' | 'storm' | null;
  selectedDate: string;
  compareDate: string | null;
  onCloseLocation: () => void;
}

export default function AIDashboard({ 
  selectedLocationId, 
  selectedDate,
  onCloseLocation
}: AIDashboardProps) {

  const [liveData, setLiveData] = useState<OpenMeteoData | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<AIRiskAssessmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const isHistorical = selectedDate !== todayStr;

  const activeLocationId = selectedLocationId || 'mumbai';

  useEffect(() => {
    // If it's a storm click or unhandled type, fallback to a default city
    if (!activeLocationId) return;
    const city = cities.find(c => c.id === activeLocationId) || cities[0];

    let active = true;

    const fetchAIIntelligence = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        let currentWeatherData: any;

        if (isHistorical) {
          const { getHistoricalRecord } = await import('../api/historicalData');
          currentWeatherData = await getHistoricalRecord(selectedDate);
          if (!active) return;
          setLiveData(null); // Clear live data if historical
        } else {
          const data = await fetchLiveWeather(city.coord);
          if (!active) return;
          setLiveData(data);
          
          // Use current hour from live data
          const nowHourStr = data.current.time.slice(0, 14) + '00';
          let ci = data.hourly.time.findIndex((s: string) => s.startsWith(nowHourStr));
          if (ci === -1) ci = 0;
          
          currentWeatherData = {
            temp: data.hourly.temperature2m[ci] ?? city.baseTemp,
            humidity: data.hourly.relativeHumidity2m[ci] ?? city.baseHumidity,
            pressure: data.hourly.pressureMsl[ci] ?? city.basePressure,
            windSpeed: data.hourly.windSpeed10m[ci] ?? city.baseWindSpeed,
            rainfall: data.hourly.precipitation[ci] ?? 0,
            aqi: 45 // Default
          };
        }

        // Hit the real ML Backend API or local engine fallback
        const mlResponse = await AIRiskService.evaluateRisk({
          temp: currentWeatherData.temp ?? 27,
          humidity: currentWeatherData.humidity ?? 65,
          pressure: currentWeatherData.pressure ?? 1010,
          windSpeed: currentWeatherData.windSpeed ?? 20,
          rainfall: currentWeatherData.rainfall ?? 0,
          locationName: `${city.name}, ${city.country}`,
        });
        
        if (!active) return;
        setRiskAssessment(mlResponse);

      } catch (err) {
        if (!active) return;
        console.error(err);
        setApiError("Unable to retrieve AI prediction from ML backend.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchAIIntelligence();

    let interval: any = null;
    if (!isHistorical) {
      interval = setInterval(fetchAIIntelligence, 10 * 60 * 1000);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [activeLocationId, selectedDate, isHistorical]);

  const targetCity = cities.find(c => c.id === activeLocationId) || cities[0];

  // Map ML Response to UI Metrics
  const title = targetCity.name;
  const subtitle = targetCity.country;
  
  // Real ML data
  const probability = riskAssessment?.storm_risk?.score ?? 0;
  const confidence = riskAssessment?.storm_risk?.confidence ?? 0;
  const riskLevel = riskAssessment?.composite_risk_category ?? "UNKNOWN";
  const aiSummary = riskAssessment?.ai_executive_summary ?? "Waiting for telemetry...";

  // Real weather state at current point
  let temp = 0, humidity = 0, pressure = 0, windSpeed = 0, rainfall = 0, lightningProb = 0;
  
  if (liveData) {
      const nowHourStr = liveData.current.time.slice(0, 14) + '00';
      let ci = liveData.hourly.time.findIndex((s: string) => s.startsWith(nowHourStr));
      if (ci === -1) ci = 0;
      temp = Math.round(liveData.hourly.temperature2m[ci]);
      humidity = Math.round(liveData.hourly.relativeHumidity2m[ci]);
      pressure = Math.round(liveData.hourly.pressureMsl[ci]);
      windSpeed = Math.round(liveData.hourly.windSpeed10m[ci]);
      rainfall = liveData.hourly.precipitation[ci];
      lightningProb = liveData.hourly.weatherCode[ci] >= 95 ? 80 : (rainfall > 5 ? 40 : 10);
  }

  // Trend Data using actual API forecast instead of mock tracking
  const trendData = [];
  if (liveData) {
    const nowHourStr = liveData.current.time.slice(0, 14) + '00';
    let ci = liveData.hourly.time.findIndex((s: string) => s.startsWith(nowHourStr));
    if (ci === -1) ci = 0;
    
    // Take 6 hours before and 6 hours after
    const startIdx = Math.max(0, ci - 6);
    const endIdx = Math.min(liveData.hourly.time.length, ci + 7);
    
    for (let i = startIdx; i < endIdx; i++) {
        const timeStr = liveData.hourly.time[i].split('T')[1].slice(0, 5); // "HH:MM"
        trendData.push({
            hour: i === ci ? "Now" : timeStr,
            pressure: liveData.hourly.pressureMsl[i],
            windSpeed: liveData.hourly.windSpeed10m[i],
            rainfall: liveData.hourly.precipitation[i],
        });
    }
  }

  const getRiskColor = (lvl: string) => {
    switch (lvl) {
      case 'EXTREME': return 'text-red-400 bg-red-950/40 border-red-500/30';
      case 'HIGH': return 'text-orange-400 bg-orange-950/40 border-orange-500/30';
      case 'MODERATE':
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30';
      case 'LOW': 
      case 'VERY_LOW': return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      default: return 'text-slate-400 bg-slate-900/40 border-slate-700/30';
    }
  };

  return (
    <div className="text-slate-100 flex flex-col gap-4 p-1 w-full">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              AI Command Center
            </h2>
            <span className="text-[9px] bg-sky-900/40 text-sky-400 px-1.5 py-0.5 rounded border border-sky-700/50">
              Source: GeoLith AI Weather & Earth Services Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold">{title} &middot; {subtitle}</p>
        </div>

        {selectedLocationId && (
          <button 
            onClick={onCloseLocation}
            className="text-[10px] bg-slate-800 border border-slate-700 text-sky-400 hover:text-white px-2 py-0.5 rounded transition-all"
          >
            Clear Filter
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-xs font-mono font-bold tracking-wider">Running Calibrated ML Prediction...</span>
        </div>
      ) : apiError ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 bg-red-950/20 border border-red-900/50 rounded-xl text-center">
            <AlertOctagon className="w-8 h-8 text-red-500 mb-2" />
            <span className="text-sm font-bold text-red-400 mb-1">Prediction Failed</span>
            <span className="text-xs text-red-300/70">{apiError}</span>
            <button onClick={() => window.location.reload()} className="mt-4 text-[10px] bg-red-900/40 text-red-300 border border-red-700 hover:bg-red-800 px-3 py-1 rounded">
                Retry Connection
            </button>
        </div>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Probability Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[18px] font-black text-white font-mono">{probability}%</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Storm Prob</span>
            </div>

            {/* Risk Card */}
            <div className={`border rounded-xl p-2.5 flex flex-col items-center justify-center text-center ${getRiskColor(riskLevel)}`}>
              <span className="text-[12px] font-black tracking-wider font-mono">{riskLevel}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-1">Threat Level</span>
            </div>

            {/* Confidence Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[18px] font-black text-white font-mono">{confidence}%</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">AI Confidence</span>
            </div>
          </div>

          {/* AI Disaster Risk intelligence */}
          <div className="bg-slate-950/45 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-2.5 font-mono text-[10px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex justify-between">
              <span>AI DISASTER RISK TELEMETRY</span>
              <span className="text-emerald-400 font-normal">Model: v1.4 (RandomForest Calibrated)</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="flex justify-between items-center border-b border-slate-900/80 pb-1.5">
                <span className="text-slate-500">Cyclone formation:</span>
                <span className={`font-bold ${probability > 60 ? 'text-red-400' : 'text-slate-300'}`}>{probability}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/80 pb-1.5">
                <span className="text-slate-500">Flood / Surge risk:</span>
                <span className={`font-bold ${(riskAssessment?.heavy_rain_risk.score ?? 0) > 40 ? 'text-red-400' : 'text-slate-300'}`}>
                  {riskAssessment?.heavy_rain_risk.score ?? 0}%
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/80 pb-1.5">
                <span className="text-slate-500">Heatwave prob:</span>
                <span className={`font-bold ${(riskAssessment?.heat_stress_risk.score ?? 0) > 60 ? 'text-red-400' : 'text-slate-300'}`}>
                    {riskAssessment?.heat_stress_risk.score ?? 0}%
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/80 pb-1.5">
                <span className="text-slate-500">Air Quality Hazard:</span>
                <span className="font-bold text-slate-300">{riskAssessment?.aqi_risk.category ?? 'LOW'}</span>
              </div>
            </div>
          </div>

          {/* AI Command Center Recommended Actions */}
          <div className="bg-slate-950/45 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-2.5 font-mono text-[10px]">
            <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> RECOMMENDED ACTIONS
            </span>
            <ul className="list-disc list-inside text-slate-300 flex flex-col gap-1 text-[9px] leading-relaxed">
                {riskAssessment?.storm_risk.recommendations.map((rec, i) => (
                    <li key={`storm-${i}`} className={probability > 60 ? 'text-red-400 font-semibold' : ''}>{rec}</li>
                ))}
                {riskAssessment?.heavy_rain_risk.recommendations.map((rec, i) => (
                    <li key={`rain-${i}`}>{rec}</li>
                ))}
            </ul>
          </div>

          {/* AI Risk Intelligence Engine Cards */}
          {riskAssessment && (
            <AIRiskCardsGrid assessment={riskAssessment} />
          )}

          {/* Main Charts Section */}
          {trendData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Wind Speed Trend Chart */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  Wind Trend (km/h)
                </span>
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-red-400" />
                  {windSpeed} km/h
                </span>
              </div>

              <div className="h-28 w-full font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" stroke="#475569" tickLine={false} />
                    <YAxis stroke="#475569" tickLine={false} domain={[0, 'auto']} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="windSpeed" name="Wind Speed" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorWind)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pressure Trend Chart */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  Pressure Trend (hPa)
                </span>
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-sky-400" />
                  {pressure} hPa
                </span>
              </div>

              <div className="h-28 w-full font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <XAxis dataKey="hour" stroke="#475569" tickLine={false} />
                    <YAxis stroke="#475569" tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '10px' }}
                    />
                    <Line type="monotone" dataKey="pressure" name="Barometric" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
          )}

          {/* Secondary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Rainfall */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">Rainfall</span>
                <span className="text-xs font-extrabold text-white font-mono">{rainfall.toFixed(1)} mm/h</span>
              </div>
            </div>

            {/* Humidity */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">Humidity</span>
                <span className="text-xs font-extrabold text-white font-mono">{humidity}%</span>
              </div>
            </div>

            {/* Temp */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">Temperature</span>
                <span className="text-xs font-extrabold text-white font-mono">{temp}°C</span>
              </div>
            </div>

            {/* Lightning */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">Lightning</span>
                <span className="text-xs font-extrabold text-white font-mono">{lightningProb}%</span>
              </div>
            </div>
          </div>

          {/* Warnings & Advisories */}
          <div className={`${['EXTREME', 'HIGH'].includes(riskLevel) ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-400'} border rounded-xl p-3 flex gap-2.5 items-start`}>
            <AlertOctagon className={`w-5 h-5 shrink-0 mt-0.5 ${['EXTREME', 'HIGH'].includes(riskLevel) ? 'text-red-400 animate-bounce' : 'text-slate-500'}`} />
            <div className="text-[11px] leading-relaxed font-semibold">
              <span>{aiSummary}</span>
            </div>
          </div>

        </>
      )}

    </div>
  );
}
