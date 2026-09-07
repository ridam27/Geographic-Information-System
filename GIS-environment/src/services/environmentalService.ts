import type { EnvironmentalTelemetry, TrackedAsset } from '../types/earth';

export class EnvironmentalService {
  /**
   * Fetch live environmental telemetry (Wildfires, Drought, NDVI, Snow Cover)
   */
  static getTelemetry(): EnvironmentalTelemetry {
    return {
      wildfireHotspots: [
        { id: 'wf_01', name: 'Bay Region Forest Thermal Spot', lat: 19.8, lng: 73.2, frpMw: 145.2, confidence: 92, detectedAt: '15 mins ago' },
        { id: 'wf_02', name: 'Coastal Dry Vegetation Spot', lat: 21.1, lng: 72.8, frpMw: 88.0, confidence: 85, detectedAt: '1 hour ago' },
      ],
      droughtIndex: -1.4,
      droughtCategory: 'MODERATE',
      ndviIndex: 0.68,
      vegetationHealth: 'GOOD',
      snowCoverCm: 0,
      surfaceWaterSaturationPercent: 64,
    };
  }

  /**
   * Retrieve registered organization assets and facility monitoring
   */
  static getTrackedAssets(): TrackedAsset[] {
    return [
      { id: 'ast_01', name: 'Mumbai Primary Data Center', type: 'DATACENTER', lat: 19.076, lng: 72.877, city: 'Mumbai', riskStatus: 'OPTIMAL', activeAlertsCount: 0 },
      { id: 'ast_02', name: 'Gujarat Solar Energy Park', type: 'SOLAR_PARK', lat: 23.215, lng: 72.636, city: 'Ahmedabad', riskStatus: 'ADVISORY', activeAlertsCount: 1 },
      { id: 'ast_03', name: 'Bay Harbor Maritime Terminal', type: 'HARBOR', lat: 13.082, lng: 80.27, city: 'Chennai', riskStatus: 'CRITICAL', activeAlertsCount: 2 },
    ];
  }
}
