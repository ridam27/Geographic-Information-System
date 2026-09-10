import { ZOO_CENTER as GOREWADA_CENTER, zooLocations as gorewadaLocations, GOREWADA_MAIN_HUB } from './zooLocations';
import { geotaggedMedia as gorewadaMedia } from './geotaggedMedia';
import { MAHARAJBAGH_CENTER, maharajbaghLocations, MAHARAJBAGH_MAIN_HUB, maharajbaghMedia } from './maharajbaghData';
import { calculateDistance } from '../utils/distance';

export const INDIA_CENTER = [20.5937, 78.9629];
export const INDIA_DEFAULT_ZOOM = 5;

// Combined Overview Map: Centered across Nagpur showing both Gorewada & Maharajbagh
export const NAGPUR_REGION_CENTER = [21.1683, 79.0404];
export const NAGPUR_REGION_ZOOM = 11;

export const ZOOS = {
  gorewada: {
    id: 'gorewada',
    name: 'Balasaheb Thackeray Gorewada International Zoo',
    shortName: 'Gorewada Zoo',
    city: 'Nagpur, Maharashtra',
    center: GOREWADA_CENTER, // [21.1925, 79.0055]
    hub: GOREWADA_MAIN_HUB,
    locations: gorewadaLocations,
    media: gorewadaMedia,
    themeColor: '#10b981',
    description: 'International Safari Park, Wildlife Rescue Center & Nature Reserve'
  },
  maharajbagh: {
    id: 'maharajbagh',
    name: 'Maharajbagh Zoo & Botanical Garden',
    shortName: 'Maharajbagh Zoo',
    city: 'Nagpur, Maharashtra',
    center: MAHARAJBAGH_CENTER, // [21.1441, 79.0754]
    hub: MAHARAJBAGH_MAIN_HUB,
    locations: maharajbaghLocations,
    media: maharajbaghMedia,
    themeColor: '#38bdf8',
    description: 'Historic Central Zoological Garden & Botanical Conservatory'
  }
};

export const getAllZooHubs = () => [
  ZOOS.gorewada.hub,
  ZOOS.maharajbagh.hub
];

export const getZooById = (id) => ZOOS[id] || null;

/**
 * Detects which zoo the user is currently approaching based on coordinates and zoom level.
 */
export const detectActiveZoo = (lat, lng, zoom) => {
  if (zoom < 12 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const distToGorewada = calculateDistance(lat, lng, GOREWADA_CENTER[0], GOREWADA_CENTER[1]);
  const distToMaharajbagh = calculateDistance(lat, lng, MAHARAJBAGH_CENTER[0], MAHARAJBAGH_CENTER[1]);

  if (distToGorewada <= 10000 || distToMaharajbagh <= 10000) {
    return distToMaharajbagh < distToGorewada ? 'maharajbagh' : 'gorewada';
  }

  return null;
};
