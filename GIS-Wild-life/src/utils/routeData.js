import { geotaggedMedia } from '../data/geotaggedMedia';

// Master Seamless Gorewada Zoo Safari Road Network
// Completely covers all internal safari roads, gates, loops, and connectors seamlessly without gaps.
export const MASTER_GOREWADA_ROAD_NETWORK = [
  // 1. Entrance, Ticket Plaza, Parking & Safari Bus Departure Terminal
  [
    [21.19495, 79.01063],
    [21.19490, 79.01048],
    [21.19443, 79.01110],
    [21.19418, 79.00973],
    [21.19354, 79.00988]
  ],

  // 2. Safari Bus Boarding to Central Artery & Leopard Safari Junction
  [
    [21.19354, 79.00988],
    [21.19330, 79.00940],
    [21.19315, 79.00880],
    [21.19290, 79.00780],
    [21.19250, 79.00650]
  ],

  // 3. Central Artery to Leopard Safari Ridge & Sloth Bear Junction
  [
    [21.19250, 79.00650],
    [21.19300, 79.00580],
    [21.19350, 79.00550]
  ],

  // 4. Sloth Bear Safari - Upper North Oval Ridge Loop
  [
    [21.19350, 79.00550],
    [21.19480, 79.00520],
    [21.19620, 79.00490],
    [21.19680, 79.00440],
    [21.19650, 79.00370],
    [21.19520, 79.00380],
    [21.19420, 79.00420],
    [21.19350, 79.00450],
    [21.19300, 79.00580]
  ],

  // 5. Bear & Leopard Mid-Connecting Loop
  [
    [21.19350, 79.00550],
    [21.19400, 79.00480],
    [21.19450, 79.00420],
    [21.19380, 79.00340],
    [21.19290, 79.00360],
    [21.19240, 79.00440],
    [21.19250, 79.00550],
    [21.19300, 79.00580]
  ],

  // 6. Western Connector (Bear/Leopard Junction to Deer, Nilgai & Peacock Safari)
  [
    [21.19240, 79.00440],
    [21.19290, 79.00360],
    [21.19340, 79.00280],
    [21.19280, 79.00200],
    [21.19180, 79.00120],
    [21.19100, 79.00010]
  ],

  // 7. Deer, Nilgai & Peacock Safari - North Loop & Hill Ridge Trail
  [
    [21.19100, 79.00010],
    [21.19180, 78.99950],
    [21.19260, 78.99880],
    [21.19350, 78.99800],
    [21.19380, 78.99720],
    [21.19300, 78.99620],
    [21.19180, 78.99580],
    [21.19050, 78.99650],
    [21.18950, 78.99720]
  ],

  // 8. Deer Safari - Far West & Southwest Perimeter Safari Loop
  [
    [21.18950, 78.99720],
    [21.18820, 78.99600],
    [21.18680, 78.99550],
    [21.18520, 78.99620],
    [21.18450, 78.99780],
    [21.18480, 78.99980],
    [21.18580, 79.00180],
    [21.18680, 79.00360],
    [21.18780, 79.00420]
  ],

  // 9. Deer Safari - Central Meadow Inner Loop & S-Bends
  [
    [21.18950, 78.99720],
    [21.18820, 78.99850],
    [21.18880, 79.00020],
    [21.19020, 79.00080],
    [21.19100, 79.00010]
  ],

  // 10. Deer Safari Gate Trail connecting to Forest Corridor Junction
  [
    [21.18880, 79.00020],
    [21.18780, 79.00120],
    [21.18720, 79.00220],
    [21.18680, 79.00360],
    [21.18780, 79.00420],
    [21.18950, 79.00400]
  ],

  // 11. Forest Corridor Nature Trail to Royal Bengal Tiger Safari
  [
    [21.18950, 79.00400],
    [21.18920, 79.00500],
    [21.189043, 79.005969]
  ],

  // 12. Tiger Safari - Southern Forest Loop & Water Hole Circuit
  [
    [21.189043, 79.005969],
    [21.18820, 79.00620],
    [21.18720, 79.00580],
    [21.18650, 79.00500],
    [21.18700, 79.00420],
    [21.18780, 79.00420]
  ],

  // 13. Tiger Safari - East Habitat Extension & Lake Loop
  [
    [21.189043, 79.005969],
    [21.18880, 79.00720],
    [21.18800, 79.00780],
    [21.18720, 79.00850],
    [21.18680, 79.00750],
    [21.18720, 79.00650],
    [21.18820, 79.00620]
  ],

  // 14. Central North-South Artery (Tiger Safari to Leopard Safari)
  [
    [21.189043, 79.005969],
    [21.19040, 79.00650],
    [21.19150, 79.00680],
    [21.19250, 79.00650]
  ],

  // 15. Forest Corridor East to Main Promenade Artery
  [
    [21.18950, 79.00400],
    [21.19040, 79.00520],
    [21.190755, 79.008160],
    [21.190635, 79.009165],
    [21.190835, 79.010790]
  ],

  // 16. Outer East Perimeter Track (From Bus Boarding to Southeast Terminal)
  [
    [21.19354, 79.00988],
    [21.19315, 79.01048],
    [21.19220, 79.01120],
    [21.19080, 79.01160],
    [21.18920, 79.01120],
    [21.18800, 79.01050],
    [21.18720, 79.00900],
    [21.18720, 79.00850]
  ],

  // 17. Eastern Sector Mid-Loops & Internal Tour Corridors
  [
    [21.19220, 79.01000],
    [21.19120, 79.00980],
    [21.19000, 79.00940],
    [21.18920, 79.00880],
    [21.18850, 79.00950],
    [21.18920, 79.01050],
    [21.19050, 79.01060],
    [21.19150, 79.01020]
  ],

  // 18. East-Central Secondary Connector
  [
    [21.19120, 79.00980],
    [21.19180, 79.00880],
    [21.19250, 79.00820],
    [21.19315, 79.00880]
  ],

  // 19. Southeast Scenic Turn-Around Loop
  [
    [21.18880, 79.00880],
    [21.18800, 79.00820],
    [21.18750, 79.00920],
    [21.18800, 79.01050]
  ]
];

// Helper to calculate distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const radLat1 = lat1 * (Math.PI / 180);
  const radLat2 = lat2 * (Math.PI / 180);
  const deltaLat = (lat2 - lat1) * (Math.PI / 180);
  const deltaLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Generate the complete seamless safari road network combining master geometry + high-precision GPS tracks
export function generateSafariRoutes() {
  const allRoutes = [...MASTER_GOREWADA_ROAD_NETWORK];

  // Also include all explicit high-precision recorded video GPS tracks
  geotaggedMedia.forEach(item => {
    if (item.track && Array.isArray(item.track) && item.track.length > 1) {
      allRoutes.push(item.track);
    }
  });

  return allRoutes;
}

export const GOREWADA_SAFARI_ROUTES = generateSafariRoutes();
