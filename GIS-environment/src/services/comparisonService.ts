import { fetchLiveWeather } from '../api/openMeteo';

export interface CompareLocation {
  id: string;
  name: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
}

export interface ComparisonMetric {
  locationId: string;
  locationName: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  rainfall: number;
  aqi: number;
}

export class ComparisonService {
  /**
   * Fetch live weather telemetry for a given location
   */
  static async fetchWeatherForLocation(loc: CompareLocation): Promise<ComparisonMetric> {
    try {
      const data = await fetchLiveWeather({ lat: loc.lat, lng: loc.lng });
      return {
        locationId: loc.id,
        locationName: `${loc.name}${loc.country ? ', ' + loc.country : ''}`,
        temp: Math.round(data.current.temperature2m),
        feelsLike: Math.round(data.current.apparentTemperature),
        humidity: Math.round(data.current.relativeHumidity2m),
        pressure: Math.round(data.current.pressureMsl),
        windSpeed: Math.round(data.current.windSpeed10m),
        rainfall: parseFloat((data.current.precipitation || 0).toFixed(1)),
        aqi: data.extended?.airQuality.aqi ?? 45,
      };
    } catch (err) {
      console.error(`Failed to fetch weather for ${loc.name}:`, err);
      // Fallback baseline in case API is offline
      return {
        locationId: loc.id,
        locationName: `${loc.name}${loc.country ? ', ' + loc.country : ''}`,
        temp: 25,
        feelsLike: 26,
        humidity: 60,
        pressure: 1012,
        windSpeed: 12,
        rainfall: 0.0,
        aqi: 45,
      };
    }
  }
}
