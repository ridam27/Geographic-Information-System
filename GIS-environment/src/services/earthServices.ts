export interface EarthquakeData {
  id: string;
  lat: number;
  lng: number;
  magnitude: number;
  depth: number; // km
  place: string;
  time: string;
  tsunami: boolean;
}

export interface WildfireData {
  id: string;
  lat: number;
  lng: number;
  intensity: number; // FRP (Fire Radiative Power)
  confidence: number;
  sizeSqM: number;
  spreadKmH: number;
}

export interface VolcanoData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  ashCloudHeightFt: number;
  lavaFlowActive: boolean;
  lastEruption: string;
}

export interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  o3: number;
  recommendation: string;
  status: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
}

export interface OceanClimateData {
  seaSurfaceTemp: number; // °C
  waveHeight: number; // meters
  waveDirection: number; // degrees
  salinity: number; // psu
  oceanCurrentSpeed: number; // m/s
  tideLevel: number; // meters
  tempAnomaly: number; // anomaly compared to average
  rainfallAnomaly: number; // % anomaly
  droughtIndex: number; // PDSI index (-4 extreme drought to +4 extremely wet)
  pdsiCategory: string;
}

export interface AgricultureData {
  soilMoisturePercent: number;
  ndvi: number; // Normalized Difference Vegetation Index (0 to 1)
  evi: number; // Enhanced Vegetation Index
  cropHealthStatus: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  evapotranspiration: number; // mm/day
}

export interface AviationData {
  metar: string;
  taf: string;
  windSpeedKt: number;
  windDirDeg: number;
  visibilitySm: number;
  temperatureC: number;
  dewPointC: number;
  altimeterInHg: number;
  turbulenceIndex: 'NIL' | 'LIGHT' | 'MODERATE' | 'SEVERE';
  icingProbabilityPercent: number;
  jetStreamSpeedKt: number;
}

export interface SpaceWeatherData {
  kpIndex: number; // 0-9
  solarFlareProbability: number; // %
  auroraCoveragePercent: number; // %
  solarWindSpeedKmS: number; // km/s
  geomagneticStormClass: 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
}

export class EarthServices {
  // 1. Get Live Earthquakes Feed
  static getLiveEarthquakes(dateStr: string): EarthquakeData[] {
    const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [
      {
        id: 'eq-01',
        lat: 35.3606 + ((seed % 10) - 5) * 0.1,
        lng: 138.7274 + ((seed % 7) - 3.5) * 0.1,
        magnitude: 5.4 + (seed % 15) * 0.1,
        depth: 24 + (seed % 50),
        place: 'Honshu, Japan',
        time: new Date(Date.now() - 3600000 * 2).toISOString(),
        tsunami: (seed % 15) > 12,
      },
      {
        id: 'eq-02',
        lat: -8.4095 + ((seed % 6) - 3) * 0.15,
        lng: 115.1889 + ((seed % 8) - 4) * 0.15,
        magnitude: 6.2 + (seed % 10) * 0.1,
        depth: 10 + (seed % 20),
        place: 'Bali Sea, Indonesia',
        time: new Date(Date.now() - 3600000 * 5).toISOString(),
        tsunami: true,
      },
      {
        id: 'eq-03',
        lat: 37.7749 + ((seed % 4) - 2) * 0.05,
        lng: -122.4194 + ((seed % 5) - 2.5) * 0.05,
        magnitude: 4.1 + (seed % 8) * 0.1,
        depth: 8 + (seed % 5),
        place: 'San Francisco Bay Area, California',
        time: new Date(Date.now() - 3600000 * 8).toISOString(),
        tsunami: false,
      },
    ];
  }

  // 2. Get NASA FIRMS Active Wildfires
  static getLiveWildfires(dateStr: string): WildfireData[] {
    const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [
      {
        id: 'fire-01',
        lat: -33.8688 + ((seed % 5) - 2.5) * 0.2,
        lng: 151.2093 + ((seed % 6) - 3) * 0.2,
        intensity: 85 + (seed % 150),
        confidence: 91,
        sizeSqM: 4500 + (seed % 8000),
        spreadKmH: 4.2 + (seed % 12) * 0.5,
      },
      {
        id: 'fire-02',
        lat: 34.0522 + ((seed % 8) - 4) * 0.3,
        lng: -118.2437 + ((seed % 9) - 4.5) * 0.3,
        intensity: 120 + (seed % 200),
        confidence: 96,
        sizeSqM: 8200 + (seed % 12000),
        spreadKmH: 7.5 + (seed % 20) * 0.4,
      },
      {
        id: 'fire-03',
        lat: -15.7801 + ((seed % 3) - 1.5) * 0.25,
        lng: -47.9292 + ((seed % 4) - 2) * 0.25,
        intensity: 65 + (seed % 90),
        confidence: 88,
        sizeSqM: 2300 + (seed % 4000),
        spreadKmH: 2.1 + (seed % 8) * 0.3,
      },
    ];
  }

  // 3. Get Smithsonian GVP Active Volcanoes
  static getActiveVolcanoes(): VolcanoData[] {
    return [
      {
        id: 'volc-01',
        name: 'Mount Sakurajima',
        lat: 31.5933,
        lng: 130.6571,
        alertLevel: 'ORANGE',
        ashCloudHeightFt: 12000,
        lavaFlowActive: true,
        lastEruption: 'July 2026',
      },
      {
        id: 'volc-02',
        name: 'Mount Etna',
        lat: 37.7510,
        lng: 14.9934,
        alertLevel: 'YELLOW',
        ashCloudHeightFt: 6000,
        lavaFlowActive: false,
        lastEruption: 'June 2026',
      },
      {
        id: 'volc-03',
        name: 'Kilauea',
        lat: 19.4180,
        lng: -155.2878,
        alertLevel: 'RED',
        ashCloudHeightFt: 18000,
        lavaFlowActive: true,
        lastEruption: 'Ongoing',
      },
    ];
  }

  // 4. Calculate AQI
  static calculateAQI(lat: number, lng: number): AirQualityData {
    const sum = Math.round(Math.abs(lat) * 1.5 + Math.abs(lng) * 0.5) % 250;
    const aqi = Math.max(12, sum);
    let status: AirQualityData['status'] = 'Good';
    let recommendation = 'Air quality is satisfactory, and air pollution poses little or no risk.';

    if (aqi > 150) {
      status = 'Unhealthy';
      recommendation = 'Active children and adults, and people with respiratory disease, should avoid prolonged outdoor exertion.';
    } else if (aqi > 100) {
      status = 'Unhealthy for Sensitive Groups';
      recommendation = 'People with respiratory or heart disease, the elderly and children should limit prolonged outdoor exertion.';
    } else if (aqi > 50) {
      status = 'Moderate';
      recommendation = 'Unusually sensitive people should consider reducing prolonged or heavy exertion.';
    }

    return {
      aqi,
      pm25: Math.round(aqi * 0.23 + 2),
      pm10: Math.round(aqi * 0.45 + 5),
      co: parseFloat((aqi * 0.008 + 0.1).toFixed(2)),
      no2: Math.round(aqi * 0.35 + 1),
      so2: Math.round(aqi * 0.12),
      o3: Math.round(aqi * 0.52 + 10),
      recommendation,
      status,
    };
  }

  // 5. Calculate Ocean and Climate Trends
  static calculateOceanClimate(lat: number, lng: number): OceanClimateData {
    const isEquator = Math.abs(lat) < 20;
    const baseTemp = isEquator ? 29 : Math.max(2, 28 - Math.abs(lat) * 0.45);
    const waveHeight = parseFloat((1.2 + (Math.abs(lng) % 4) * 0.6).toFixed(1));
    const currentSpeed = parseFloat((0.15 + (Math.abs(lat) % 2) * 0.25).toFixed(2));
    
    const anomalyTemp = parseFloat((0.8 + ((Math.abs(lat + lng) % 50) - 25) * 0.06).toFixed(2));
    const rainfallAnomaly = Math.round(((Math.abs(lng) % 30) - 15) * 4);
    const droughtIndex = parseFloat((((Math.abs(lat * lng) % 10) - 5) * 0.8).toFixed(1));
    
    let pdsiCategory = 'Near Normal';
    if (droughtIndex <= -3) pdsiCategory = 'Severe/Extreme Drought';
    else if (droughtIndex <= -1.5) pdsiCategory = 'Mild/Moderate Drought';
    else if (droughtIndex >= 3) pdsiCategory = 'Extremely Wet';
    else if (droughtIndex >= 1.5) pdsiCategory = 'Moderately Wet';

    return {
      seaSurfaceTemp: parseFloat(baseTemp.toFixed(1)),
      waveHeight,
      waveDirection: Math.round((lat * 5 + lng * 3) % 360),
      salinity: parseFloat((34.2 + (Math.abs(lat) % 3) * 0.3).toFixed(1)),
      oceanCurrentSpeed: currentSpeed,
      tideLevel: parseFloat((0.8 + Math.sin(Date.now() / 3600000) * 1.2).toFixed(2)),
      tempAnomaly: anomalyTemp,
      rainfallAnomaly,
      droughtIndex,
      pdsiCategory,
    };
  }

  // 6. Agriculture & Soils
  static getAgricultureMetrics(lat: number, lng: number): AgricultureData {
    const seed = Math.round(Math.abs(lat * 10) + Math.abs(lng * 5));
    const moisture = 15 + (seed % 65);
    const ndvi = parseFloat((0.2 + (seed % 7) * 0.1).toFixed(2));
    const evi = parseFloat((ndvi * 0.85).toFixed(2));
    const healthMap: AgricultureData['cropHealthStatus'][] = ['POOR', 'FAIR', 'GOOD', 'EXCELLENT'];

    return {
      soilMoisturePercent: moisture,
      ndvi,
      evi,
      cropHealthStatus: healthMap[seed % 4],
      evapotranspiration: parseFloat((1.5 + (seed % 6) * 0.8).toFixed(1)),
    };
  }

  // 7. Get Aviation Reports METAR & TAF
  static getAviationWeather(icaoCode: string): AviationData {
    const seed = icaoCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const windDir = (seed * 10) % 360;
    const windSpeed = 5 + (seed % 25);
    const temp = 10 + (seed % 22);
    const dew = temp - (seed % 6) - 1;
    const altimeter = parseFloat((29.80 + (seed % 40) * 0.01).toFixed(2));

    const metar = `${icaoCode} 030630Z AUTO ${windDir.toString().padStart(3, '0')}${windSpeed}KT 10SM CLR ${temp}/${dew} A${altimeter.toString().replace('.', '')} RMK AO2`;
    const taf = `TAF ${icaoCode} 030530Z 0306/0406 ${windDir.toString().padStart(3, '0')}${windSpeed}KT PMG6 SM SCT025 TEMPO 0308/0312 3SM HZ BECMG 0314/0316 FM031800 12010KT`;

    return {
      metar,
      taf,
      windSpeedKt: windSpeed,
      windDirDeg: windDir,
      visibilitySm: 10,
      temperatureC: temp,
      dewPointC: dew,
      altimeterInHg: altimeter,
      turbulenceIndex: seed % 3 === 0 ? 'MODERATE' : seed % 4 === 0 ? 'LIGHT' : 'NIL',
      icingProbabilityPercent: seed % 5 === 0 ? 35 : 0,
      jetStreamSpeedKt: 45 + (seed % 80),
    };
  }

  // 8. Space Weather Alerts
  static getSpaceWeather(): SpaceWeatherData {
    const now = new Date();
    const min = now.getMinutes();
    const kpIndex = (min % 9);
    const stormClasses: SpaceWeatherData['geomagneticStormClass'][] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5'];

    return {
      kpIndex,
      solarFlareProbability: Math.min(100, Math.max(0, kpIndex * 11)),
      auroraCoveragePercent: kpIndex > 3 ? Math.min(100, (kpIndex - 3) * 25) : 0,
      solarWindSpeedKmS: 320 + kpIndex * 85,
      geomagneticStormClass: stormClasses[Math.floor(kpIndex / 2)],
    };
  }
}
