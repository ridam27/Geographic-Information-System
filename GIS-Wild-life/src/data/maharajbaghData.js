// Maharajbagh Zoo & Botanical Garden, Nagpur Geospatial Data
import { maharajbaghPhotos } from './maharajbaghPhotos';
import { maharajbaghVideos } from './maharajbaghVideos';
import { calculateDistance } from '../utils/distance';

export const MAHARAJBAGH_CENTER = [21.144100, 79.075400];

// Primary Hub Marker for Zoom Level <= 11
export const MAHARAJBAGH_MAIN_HUB = {
  id: "maharajbagh-zoo-main",
  name: "Maharajbagh Zoo",
  shortName: "Maharajbagh Zoo",
  latitude: 21.144100,
  longitude: 79.075400,
  description: "Historic Maharajbagh Zoological Park & Botanical Conservatory, Central Nagpur",
  category: "main-hub"
};

// Detailed Enclosure and Facility Zones strictly within Maharajbagh Zoo grounds
export const maharajbaghLocations = [
  // 1. Main Entrance Gate
  {
    id: "mb-main-entrance",
    name: "Main Entrance Gate",
    shortName: "Entrance Gate",
    iconName: "DoorOpen",
    category: "entrance",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.144800,
    longitude: 79.074600,
    radius: 75,
    description: "Main heritage arrival entrance gate and visitor security point for Maharajbagh Zoo."
  },

  // 2. Ticket Plaza
  {
    id: "mb-ticket-counter",
    name: "Ticketing Plaza",
    shortName: "Ticket Counter",
    iconName: "Ticket",
    category: "facility",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.144700,
    longitude: 79.074700,
    radius: 60,
    description: "Visitor entry ticketing counters, digital pass validation, and tourist reception."
  },

  // 3. Central Promenade
  {
    id: "mb-central-promenade",
    name: "Central Promenade & Walkway",
    shortName: "Central Walkway",
    iconName: "Compass",
    category: "amenity",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.144300,
    longitude: 79.075200,
    radius: 85,
    description: "Main central paved walking corridor connecting all animal exhibits and garden trails."
  },

  // 4. Peacock & Exotic Bird Aviary
  {
    id: "mb-aviary",
    name: "Peacock & Exotic Bird Aviary",
    shortName: "Bird Aviary",
    iconName: "Compass",
    category: "nature",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.144000,
    longitude: 79.075450,
    radius: 90,
    description: "Walk-around netted aviary showcasing Indian Peafowl, parakeets, and diverse bird species."
  },

  // 5. Royal Bengal Tiger Enclosure
  {
    id: "mb-tiger-enclosure",
    name: "Royal Bengal Tiger Enclosure",
    shortName: "Tiger Enclosure",
    iconName: "Tiger",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.143450,
    longitude: 79.075650,
    radius: 110,
    description: "Natural habitat enclosure for Royal Bengal Tigers with viewing galleries and moated boundaries."
  },

  // 6. Indian Leopard Enclosure
  {
    id: "mb-leopard-enclosure",
    name: "Indian Leopard Enclosure",
    shortName: "Leopard Enclosure",
    iconName: "Leopard",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.143700,
    longitude: 79.075800,
    radius: 100,
    description: "Enriched rocky carnivore enclosure housing Indian Leopards with elevated resting platforms."
  },

  // 7. Sloth Bear Section
  {
    id: "mb-sloth-bear",
    name: "Sloth Bear Habitat",
    shortName: "Sloth Bear",
    iconName: "Bear",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.143550,
    longitude: 79.075350,
    radius: 95,
    description: "Dedicated Sloth Bear enclosure featuring natural dens, shade logs, and feeding stations."
  },

  // 8. Deer & Antelope Park
  {
    id: "mb-deer-park",
    name: "Spotted Deer & Blackbuck Meadow",
    shortName: "Deer & Antelope",
    iconName: "Deer",
    category: "herbivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.143150,
    longitude: 79.075900,
    radius: 120,
    description: "Grassland habitat accommodating herds of Spotted Deer (Chital), Sambhar, and Blackbucks."
  },

  // 9. Marsh Crocodile Pond
  {
    id: "mb-crocodile-pond",
    name: "Crocodile & Reptile Enclosure",
    shortName: "Crocodile Pond",
    iconName: "Waves",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.143300,
    longitude: 79.075400,
    radius: 90,
    description: "Marsh crocodile sun-basking pond with security railings and aquatic viewing areas."
  },

  // 10. Historic Botanical Garden
  {
    id: "mb-botanical-garden",
    name: "Historic Botanical Garden & Herbarium",
    shortName: "Botanical Garden",
    iconName: "TreePine",
    category: "nature",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.144150,
    longitude: 79.076050,
    radius: 110,
    description: "Century-old botanical collection, shaded heritage trees, and medicinal plant nursery."
  },

  // 11. Cafeteria
  {
    id: "mb-cafeteria",
    name: "Garden Cafeteria & Snack Kiosks",
    shortName: "Cafeteria",
    iconName: "Coffee",
    category: "amenity",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.144500,
    longitude: 79.075050,
    radius: 70,
    description: "Visitor dining court, drinking water station, and refreshment kiosk."
  },

  // 12. Veterinary Clinic
  {
    id: "mb-vet-hospital",
    name: "Zoo Veterinary Hospital & Administration",
    shortName: "Veterinary Clinic",
    iconName: "HeartPulse",
    category: "facility",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.144400,
    longitude: 79.074900,
    radius: 65,
    description: "On-site veterinary clinic, wildlife medical station, and zoo administration."
  }
];

// Automatically correlate each real geotagged photo with its nearest Maharajbagh enclosure
const enrichPhotosWithZone = (photos) => {
  return photos.map(photo => {
    let closestZone = "Maharajbagh Zoo Enclosure";
    let minDistance = Infinity;

    for (const loc of maharajbaghLocations) {
      const dist = calculateDistance(photo.latitude, photo.longitude, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestZone = loc.name;
      }
    }

    return {
      ...photo,
      zone: closestZone
    };
  });
};

// Maharajbagh Media Dataset containing 50 real geotagged videos and 294 geotagged photos
export const maharajbaghMedia = [
  ...maharajbaghVideos,
  ...enrichPhotosWithZone(maharajbaghPhotos)
];
