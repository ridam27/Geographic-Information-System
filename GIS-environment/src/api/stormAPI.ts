import type { GlobalStorm } from '../mockData';

export async function fetchActiveStorms(): Promise<GlobalStorm[]> {
  const fetchWithTimeout = async (url: string, ms = 1500) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  try {
    let response;
    const apiBase = import.meta.env.VITE_WEATHER_API_BASE || '';

    try {
      // 1. Preferred: our own backend proxy (no CORS issue, server-to-server)
      response = await fetchWithTimeout(`${apiBase}/api/v1/gdacs/storms`, 2000);
      if (!response.ok) throw new Error("Backend proxy fetch failed");
    } catch (e) {
      console.warn("Backend GDACS proxy unavailable. Trying direct fetch...");
      try {
        response = await fetchWithTimeout('https://www.gdacs.org/xml/gdacs.geojson', 1000);
        if (!response.ok) throw new Error("Direct fetch failed");
      } catch (directErr) {
        console.warn("Direct GDACS fetch failed/blocked (CORS). Retrying with public proxy...");
        try {
          response = await fetchWithTimeout('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.gdacs.org/xml/gdacs.geojson'), 1500);
          if (!response.ok) throw new Error("CORS proxy fetch failed");
        } catch (proxyErr) {
          console.warn("All GDACS fetch methods failed, returning empty baseline:", proxyErr);
          return [];
        }
      }
    }
    const data = await response.json();
    
    const storms: GlobalStorm[] = [];
    
    if (data && data.features) {
      const tcFeatures = data.features.filter((f: any) => f.properties?.eventtype === 'TC');
      
      tcFeatures.forEach((f: any) => {
        const props = f.properties;
        if (!props) return;
        
        const lng = f.geometry?.coordinates?.[0] ?? 90.0;
        const lat = f.geometry?.coordinates?.[1] ?? 15.0;
        
        const rawName = props.eventname || 'Unnamed Cyclone';
        const name = rawName.toUpperCase().includes('CYCLONE') || rawName.toUpperCase().includes('TYPHOON') || rawName.toUpperCase().includes('HURRICANE')
          ? rawName 
          : `Cyclone ${rawName}`;
          
        const id = props.eventid || rawName.toLowerCase().replace(/\s+/g, '-');
        const severity = props.severitydata?.severity ?? 1;
        const windSpeed = Math.round(props.severitydata?.value ?? 120);
        const pressure = Math.round(props.severitydata?.pressure ?? 970);
        
        let type: 'Typhoon' | 'Hurricane' | 'Cyclone' | 'Tropical Storm' | 'Tropical Depression' = 'Cyclone';
        if (severity >= 4) {
          type = lng > 100 && lng < 180 ? 'Typhoon' : (lng < -20 && lng > -100 ? 'Hurricane' : 'Cyclone');
        } else if (severity >= 1) {
          type = 'Cyclone';
        } else {
          type = 'Tropical Storm';
        }

        const track = [
          { timeOffset: -24, label: '24h Ago',   position: { lat: lat - 1.0, lng: lng - 1.2 }, pressure: pressure + 15, maxWindSpeed: Math.round(windSpeed * 0.8), gusts: Math.round(windSpeed * 1.0), direction: 'Northwest', speed: 15, radius: 240 },
          { timeOffset: -12, label: '12h Ago',   position: { lat: lat - 0.5, lng: lng - 0.6 }, pressure: pressure + 8,  maxWindSpeed: Math.round(windSpeed * 0.9), gusts: Math.round(windSpeed * 1.15), direction: 'Northwest', speed: 16, radius: 270 },
          { timeOffset:   0, label: 'Now',       position: { lat, lng },                       pressure,                 maxWindSpeed: windSpeed,                  gusts: Math.round(windSpeed * 1.3),  direction: 'Northwest', speed: 18, radius: 300 },
          { timeOffset:   6, label: '+6 Hours',  position: { lat: lat + 0.3, lng: lng + 0.4 }, pressure: pressure - 5,  maxWindSpeed: Math.round(windSpeed * 1.05), gusts: Math.round(windSpeed * 1.35), direction: 'Northwest', speed: 19, radius: 310 },
          { timeOffset:  12, label: '+12 Hours', position: { lat: lat + 0.6, lng: lng + 0.8 }, pressure: pressure + 5,  maxWindSpeed: Math.round(windSpeed * 0.95), gusts: Math.round(windSpeed * 1.25), direction: 'Northwest', speed: 20, radius: 290 },
          { timeOffset:  24, label: '+24 Hours', position: { lat: lat + 1.2, lng: lng + 1.6 }, pressure: pressure + 15, maxWindSpeed: Math.round(windSpeed * 0.8), gusts: Math.round(windSpeed * 1.0), direction: 'Northwest', speed: 22, radius: 220 },
        ];

        storms.push({
          id,
          name,
          category: Math.min(5, Math.max(0, Math.round(severity))),
          type,
          probability: Math.round(props.severitydata?.probability ?? 95),
          forecastMovement: `${props.severitydata?.direction || 'NW'} at ${Math.round(props.severitydata?.speed || 18)} km/h`,
          track
        });
      });
    }
    
    return storms;
  } catch (error) {
    console.error("GDACS API active storms fetch error:", error);
    return [];
  }
}