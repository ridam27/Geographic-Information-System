import { cities } from '../mockData';

export interface ResolvedLocationResult {
  id: string;
  name: string;          // e.g. "London"
  displayName: string;   // e.g. "London, Greater London, England, United Kingdom"
  country: string;       // e.g. "United Kingdom"
  state: string;         // e.g. "England"
  city?: string;
  latitude: number;
  longitude: number;
  zoom: number;
  type: 'city' | 'coordinate' | 'country' | 'administrative';
  source?: string;
  suggestions?: ResolvedLocationResult[];
}

export class LocationService {
  /**
   * Extract potential location phrase from a natural language query string.
   * Returns null if no explicit location is mentioned in the prompt.
   */
  static extractLocationFromQuery(userQuery: string): string | null {
    if (!userQuery || !userQuery.trim()) return null;
    const q = userQuery.trim();

    // 1. Check for coordinate input (e.g. "51.5074, -0.1278" or "near 22.5, 88.3")
    const coordMatch = q.match(/[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?)\s*[, ]\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/);
    if (coordMatch) {
      return coordMatch[0];
    }

    const noiseWords = new Set([
      'what', 'is', 'the', 'weather', 'temp', 'temperature', 'rain', 'raining', 'snow',
      'wind', 'windy', 'storm', 'storms', 'risk', 'forecast', 'today', 'tomorrow', 'yesterday',
      'how', 'are', 'there', 'any', 'active', 'fires', 'fire', 'wildfire', 'wildfires',
      'earthquake', 'earthquakes', 'quake', 'quakes', 'volcano', 'volcanoes', 'happening',
      'about', 'like', 'tell', 'me', 'please', 'show', 'check', 'current', 'condition',
      'conditions', 'now', 'nearby', 'around', 'here', 'high', 'low', 'much', 'will', 'it',
      'in', 'at', 'for', 'near', 'of', 'to', 'degree', 'celsius', 'fahrenheit', 'city', 'country'
    ]);

    // 2. Preposition pattern matches: "in <Location>", "for <Location>", "near <Location>", "at <Location>", "about <Location>"
    const prepositionPatterns = [
      /\b(?:in|at|for|near|around|of|to|about)\s+([A-Za-z\s.\-']+?)(?=\s+(?:today|tomorrow|yesterday|now|right now|this week|next week|\?|!|\.|$))/i,
      /\b(?:in|at|for|near|around|of|to|about)\s+([A-Za-z\s.\-']+)/i,
      /\b(?:tell me about|what about|how is|weather of|temp of|temperature of|risk in|risk for|storm in)\s+([A-Za-z\s.\-']+)/i
    ];

    for (const pattern of prepositionPatterns) {
      const match = q.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim().replace(/[?!.,]+$/, '');
        extracted = extracted.replace(/\s+(today|tomorrow|yesterday|now|right now|weather|temp|temperature|storm|risk|forecast)$/i, '').trim();
        
        const words = extracted.toLowerCase().split(/\s+/);
        const nonNoise = words.filter(w => !noiseWords.has(w));
        if (nonNoise.length > 0 && extracted.length >= 2) {
          return extracted;
        }
      }
    }

    // 3. Fallback: Strip noise words from the prompt and return remaining location candidate
    const words = q.split(/\s+/);
    const nonNoiseWords = words.filter(w => {
      const cleanWord = w.toLowerCase().replace(/[^a-z0-9\-]/g, '');
      return cleanWord.length > 0 && !noiseWords.has(cleanWord);
    });

    if (nonNoiseWords.length > 0) {
      const candidate = nonNoiseWords.join(' ').replace(/[?!.,]+$/, '').trim();
      if (candidate.length >= 2) {
        return candidate;
      }
    }

    // 4. Fallback: Check local preset cities catalog
    const lowerQ = q.toLowerCase();
    for (const city of cities) {
      const cName = city.name.toLowerCase();
      const countryName = city.country.toLowerCase();
      if (lowerQ.includes(cName)) return city.name;
      if (countryName.length > 3 && lowerQ.includes(countryName)) return city.country;
    }

    return null;
  }

  /**
   * Geocode a location string into a ResolvedLocationResult using Open-Meteo Geocoding API,
   * Nominatim fallback, or local coordinate parser.
   */
  static async resolveLocation(locationQuery: string): Promise<ResolvedLocationResult | null> {
    if (!locationQuery || !locationQuery.trim()) return null;
    const cleanQuery = locationQuery.trim();

    // 1. Check if string is explicit lat/lng coordinates
    const coordRegex = /^[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?)\s*[, ]\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (coordRegex.test(cleanQuery)) {
      const parts = cleanQuery.split(/[\s,]+/).map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const lat = parts[0];
        const lng = parts[1];
        return {
          id: `coord_${lat.toFixed(4)}_${lng.toFixed(4)}`,
          name: `Grid (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
          displayName: `Coordinates ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
          country: 'Global Grid',
          state: 'Selected Coordinates',
          latitude: lat,
          longitude: lng,
          zoom: 8.5,
          type: 'coordinate',
          source: 'Coordinate Parser'
        };
      }
    }

    // 2. Query Open-Meteo Geocoding API
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=5&language=en&format=json`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const results = data.results;

        if (Array.isArray(results) && results.length > 0) {
          const mappedList: ResolvedLocationResult[] = results.map((item: any) => {
            const country = item.country || '';
            const state = item.admin1 || item.admin2 || '';
            const displayName = `${item.name}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
            
            let zoom = 10.0; // Default city zoom
            if (item.feature_code === 'PCLI' || item.feature_code === 'ADM1') {
              zoom = 6.0; // Country or major province
            } else if (item.population && item.population > 2000000) {
              zoom = 9.0;
            }

            return {
              id: `om-${item.id}`,
              name: item.name,
              displayName,
              country,
              state,
              city: item.name,
              latitude: item.latitude,
              longitude: item.longitude,
              zoom,
              type: 'city',
              source: 'Open-Meteo Geocoding API'
            };
          });

          const primary = mappedList[0];
          if (mappedList.length > 1) {
            primary.suggestions = mappedList.slice(1);
          }
          return primary;
        }
      }
    } catch (err) {
      console.warn('Open-Meteo Geocoding failed, trying fallback provider:', err);
    }

    // 3. Fallback: Nominatim / OpenStreetMap Geocoding API
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'GeolithPortal-GIS-App/1.0' }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const addr = item.address || {};
          const localName = addr.city || addr.town || addr.village || addr.suburb || item.display_name.split(',')[0];
          const state = addr.state || addr.county || '';
          const country = addr.country || '';

          return {
            id: `osm-${item.place_id}`,
            name: localName,
            displayName: item.display_name,
            country,
            state,
            city: localName,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            zoom: 10.0,
            type: 'city',
            source: 'Nominatim Geocoding'
          };
        }
      }
    } catch (err) {
      console.warn('Nominatim Geocoding fallback failed:', err);
    }

    // 4. Fallback: Photon Komoot Global OSM Geocoder
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=3`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const features = data.features;
        if (Array.isArray(features) && features.length > 0) {
          const item = features[0];
          const props = item.properties || {};
          const coords = item.geometry?.coordinates || [0, 0];
          const localName = props.name || cleanQuery;
          const country = props.country || '';
          const state = props.state || props.county || '';
          const displayName = `${localName}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;

          return {
            id: `photon-${props.osm_id || Date.now()}`,
            name: localName,
            displayName,
            country,
            state,
            city: localName,
            latitude: coords[1],
            longitude: coords[0],
            zoom: 10.0,
            type: 'city',
            source: 'Photon Komoot Geocoder'
          };
        }
      }
    } catch (err) {
      console.warn('Photon Geocoding fallback failed:', err);
    }

    // 5. Final Fallback: Check local preset cities catalog
    const lower = cleanQuery.toLowerCase();
    const localMatch = cities.find(c => 
      c.name.toLowerCase() === lower || 
      c.id.toLowerCase() === lower ||
      c.name.toLowerCase().includes(lower)
    );

    if (localMatch) {
      return {
        id: localMatch.id,
        name: localMatch.name,
        displayName: `${localMatch.name}, ${localMatch.state ? localMatch.state + ', ' : ''}${localMatch.country}`,
        country: localMatch.country,
        state: localMatch.state,
        city: localMatch.name,
        latitude: localMatch.coord.lat,
        longitude: localMatch.coord.lng,
        zoom: 8.5,
        type: 'city',
        source: 'Preset Catalog'
      };
    }

    return null;
  }

  /**
   * Search multiple locations for autocomplete lists (e.g. SearchBar).
   */
  static async searchLocations(query: string): Promise<ResolvedLocationResult[]> {
    if (!query || !query.trim() || query.length < 2) return [];
    const q = query.trim().toLowerCase();

    // 1. Check coordinates
    const coordRegex = /^[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?)\s*[, ]\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (coordRegex.test(query.trim())) {
      const parts = query.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [{
          id: `coord_${parts[0].toFixed(3)}_${parts[1].toFixed(3)}`,
          name: `Coordinate (${parts[0].toFixed(3)}°, ${parts[1].toFixed(3)}°)`,
          displayName: `Coordinate: ${parts[0].toFixed(4)}°N, ${parts[1].toFixed(4)}°E`,
          country: 'Global Grid',
          state: 'User Pin',
          latitude: parts[0],
          longitude: parts[1],
          zoom: 8.5,
          type: 'coordinate',
          source: 'Coordinate Input'
        }];
      }
    }

    // 2. Fetch Open-Meteo Geocoding
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map((item: any) => {
            const country = item.country || '';
            const state = item.admin1 || item.admin2 || '';
            return {
              id: `om-${item.id}`,
              name: item.name,
              displayName: `${item.name}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`,
              country,
              state,
              city: item.name,
              latitude: item.latitude,
              longitude: item.longitude,
              zoom: item.population && item.population > 1000000 ? 9.0 : 10.5,
              type: 'city',
              source: 'Open-Meteo'
            };
          });
        }
      }
    } catch {
      // Fall through to local
    }

    // 3. Fallback to local catalog matches
    return cities
      .filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 6)
      .map(c => ({
        id: c.id,
        name: c.name,
        displayName: `${c.name}, ${c.state ? c.state + ', ' : ''}${c.country}`,
        country: c.country,
        state: c.state,
        city: c.name,
        latitude: c.coord.lat,
        longitude: c.coord.lng,
        zoom: 8.5,
        type: 'city',
        source: 'Local Catalog'
      }));
  }
}
