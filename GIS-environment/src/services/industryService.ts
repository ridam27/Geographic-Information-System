import type { IndustrySector, SectorImpactGuidance, LayerDataQuality } from '../types/industry';

export class IndustryService {
  /**
   * Evaluate decision support guidance for specific industry sectors
   */
  static getOperationalGuidance(sector: IndustrySector, metrics: { temp: number; windSpeed: number; rainfall: number; humidity: number }): SectorImpactGuidance {
    const isSevere = metrics.rainfall > 10 || metrics.windSpeed > 45;
    const isModerate = metrics.rainfall > 2 || metrics.windSpeed > 25;
    const riskLevel = isSevere ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW';

    switch (sector) {
      case 'agriculture':
        return {
          sector,
          riskLevel,
          title: 'Agriculture & Crop Management',
          impacts: [
            metrics.temp > 35 ? 'Elevated crop evapotranspiration & thermal stress.' : 'Temperature range is favorable for crop growth.',
            metrics.rainfall > 5 ? 'High soil moisture saturation; risk of root hypoxia.' : 'Soil moisture reserves are normal.',
            metrics.humidity > 85 ? 'Fungal spore germination risk elevated.' : 'Fungal pressure is low.',
          ],
          suggestedActions: [
            metrics.temp > 35 ? 'Increase irrigation volume during early morning hours.' : 'Maintain standard irrigation schedule.',
            metrics.rainfall > 10 ? 'Clear field drainage ditches to prevent standing water.' : 'No emergency drainage required.',
          ],
        };

      case 'mining':
        return {
          sector,
          riskLevel,
          title: 'Mining & Open-Pit Operations',
          impacts: [
            metrics.rainfall > 8 ? 'Pit wall instability & heavy mud haul road degradation.' : 'Haul roads dry and firm.',
            metrics.windSpeed > 40 ? 'High dust dispersion & crane operation suspension.' : 'Airborne dust remains manageable.',
          ],
          suggestedActions: [
            metrics.rainfall > 8 ? 'Halt heavy haulage on unpaved ramps; inspect sump pumps.' : 'Continue routine pit activities.',
            metrics.windSpeed > 40 ? 'Secure boom cranes and exposed stockpiles.' : 'Crane operations permitted.',
          ],
        };

      case 'aviation':
        return {
          sector,
          riskLevel,
          title: 'Aviation & Flight Operations',
          impacts: [
            metrics.windSpeed > 35 ? 'Significant crosswind shear on low-altitude approaches.' : 'Surface wind velocity is acceptable.',
            metrics.rainfall > 10 ? 'Reduced runway friction coefficient & low cloud ceiling.' : 'Runway visual range (RVR) is clear.',
          ],
          suggestedActions: [
            metrics.windSpeed > 35 ? 'Review fuel reserves for potential holding patterns.' : 'Normal flight dispatching.',
            metrics.rainfall > 10 ? 'Enable hydroplaning advisory for landing aircraft.' : 'Standard braking action.',
          ],
        };

      case 'marine':
        return {
          sector,
          riskLevel,
          title: 'Marine & Offshore Maritime',
          impacts: [
            metrics.windSpeed > 40 ? 'Rough sea state with gale force wave development.' : 'Sea conditions moderate.',
            metrics.rainfall > 10 ? 'Reduced visibility near harbor entrances.' : 'Navigational visibility good.',
          ],
          suggestedActions: [
            metrics.windSpeed > 40 ? 'Issue small craft advisories and anchor harbor vessels.' : 'Safe for coastal transit.',
          ],
        };

      case 'logistics':
        return {
          sector,
          riskLevel,
          title: 'Logistics & Supply Chain',
          impacts: [
            metrics.rainfall > 10 ? 'Highway flash flooding and delivery route delays.' : 'Freight routes clear.',
            metrics.windSpeed > 45 ? 'High-profile vehicle rollover risk on exposed bridges.' : 'Truck stability normal.',
          ],
          suggestedActions: [
            metrics.rainfall > 10 ? 'Reroute high-priority freight away from low-lying underpasses.' : 'Maintain scheduled logistics.',
          ],
        };

      case 'disaster':
      default:
        return {
          sector: 'disaster',
          riskLevel,
          title: 'Disaster Management & Emergency Services',
          impacts: [
            metrics.rainfall > 12 ? 'High risk of urban flash flooding and slope failure.' : 'Low immediate disaster threat.',
            metrics.windSpeed > 50 ? 'Structural damage to temporary shelters and powerlines.' : 'Infrastructure intact.',
          ],
          suggestedActions: [
            metrics.rainfall > 12 ? 'Pre-position emergency rescue teams and pumps in flood hotspots.' : 'Standby readiness mode.',
          ],
        };
    }
  }

  /**
   * Provenance & quality audit metadata for platform layers
   */
  static getLayerDataQuality(): LayerDataQuality[] {
    const nowISO = new Date().toISOString();
    return [
      {
        layerId: 'open_meteo_live',
        layerName: 'Open-Meteo Global Forecast',
        provider: 'Open-Meteo API / DWD ICON',
        lastUpdated: nowISO,
        refreshInterval: '10 mins',
        coverage: 'Global (90m grid)',
        confidence: 96,
      },
      {
        layerId: 'gibs_satellite',
        layerName: 'NASA GIBS Satellite Imagery',
        provider: 'NASA EOSDIS GIBS',
        lastUpdated: 'Today 06:00 UTC',
        refreshInterval: 'Daily',
        coverage: 'Global TrueColor',
        confidence: 99,
      },
      {
        layerId: 'esri_imagery',
        layerName: 'ESRI World Imagery',
        provider: 'ESRI / Maxar / Earthstar',
        lastUpdated: 'Static / High-Res',
        refreshInterval: 'Monthly',
        coverage: 'Global High-Resolution',
        confidence: 98,
      },
      {
        layerId: 'nasa_power_archive',
        layerName: 'NASA POWER Historical Archive',
        provider: 'NASA Langley Research Center',
        lastUpdated: 'Historical CSV',
        refreshInterval: 'Static Archive',
        coverage: 'Global Historical',
        confidence: 94,
      },
    ];
  }
}
