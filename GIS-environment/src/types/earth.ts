export interface WildfireHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  frpMw: number; // Fire Radiative Power
  confidence: number;
  detectedAt: string;
}

export interface EnvironmentalTelemetry {
  wildfireHotspots: WildfireHotspot[];
  droughtIndex: number; // SPEI -2.5 to +2.5
  droughtCategory: 'EXTREME' | 'SEVERE' | 'MODERATE' | 'NORMAL';
  ndviIndex: number; // 0.0 to 1.0
  vegetationHealth: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
  snowCoverCm: number;
  surfaceWaterSaturationPercent: number;
}

export interface TrackedAsset {
  id: string;
  name: string;
  type: 'FACILITY' | 'SOLAR_PARK' | 'MINE_SITE' | 'HARBOR' | 'DATACENTER';
  lat: number;
  lng: number;
  city: string;
  riskStatus: 'OPTIMAL' | 'ADVISORY' | 'CRITICAL';
  activeAlertsCount: number;
}
