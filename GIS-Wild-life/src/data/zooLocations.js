export const ZOO_CENTER = [21.1925, 79.0055]; // Centered across the safari sectors and entrance complex

// Primary single hub marker for Zoom Level <= 10
export const GOREWADA_MAIN_HUB = {
  id: "gorewada-zoo-main",
  name: "Gorewada Zoo",
  shortName: "Gorewada Zoo",
  latitude: 21.192500,
  longitude: 79.005500,
  description: "Balasaheb Thackeray Gorewada International Zoological Park, Nagpur",
  category: "main-hub"
};

export const zooLocations = [
  // 1. Zoo Entrance (Major Landmark: appears at Zoom 11+)
  {
    id: "main-entrance",
    name: "Zoo Entrance",
    shortName: "Zoo Entrance",
    iconName: "DoorOpen",
    category: "entrance",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.194899,
    longitude: 79.010608,
    radius: 75,
    description: "Official grand entrance gate, visitor arrival terminal, and security checkpoint of Gorewada International Zoo."
  },

  // 2. Ticket Counter (Facility: appears at Zoom 14+)
  {
    id: "ticket-counter",
    name: "Ticket Counter",
    shortName: "Ticket Counter",
    iconName: "Ticket",
    category: "facility",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.194906,
    longitude: 79.010477,
    radius: 50,
    description: "Visitor ticketing plaza, fast-track digital pass counters, and safari tour reception desk."
  },

  // 3. Parking Area (Facility: appears at Zoom 14+)
  {
    id: "parking-area",
    name: "Parking Area",
    shortName: "Parking Area",
    iconName: "Car",
    category: "facility",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.194433,
    longitude: 79.011100,
    radius: 75,
    description: "Designated visitor parking terminal for tourist safari buses, private vehicles, and two-wheelers."
  },

  // 4. Cafeteria (Amenity: appears at Zoom 14+)
  {
    id: "cafeteria",
    name: "Cafeteria",
    shortName: "Cafeteria",
    iconName: "Coffee",
    category: "amenity",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.194180,
    longitude: 79.009732,
    radius: 65,
    description: "Central visitor dining court, beverage kiosks, and family refreshment lounge."
  },

  // 5. Safari Bus Boarding (Facility: appears at Zoom 14+)
  {
    id: "safari-bus-boarding",
    name: "Safari Bus Boarding",
    shortName: "Safari Bus Boarding",
    iconName: "Bus",
    category: "facility",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.193542,
    longitude: 79.009882,
    radius: 70,
    description: "Safari bus departure plaza, electric vehicle embarkation terminal, and guided tour boarding bays."
  },

  // 6. Leopard Safari (Major Safari: appears at Zoom 11+)
  {
    id: "leopard-safari",
    name: "Leopard Safari",
    shortName: "Leopard Safari",
    iconName: "Leopard",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.192500,
    longitude: 79.006500,
    radius: 120,
    description: "Dedicated safari sector for Indian Leopards, rocky ridge lookouts, and carnivore habitat."
  },

  // 7. Bear & Deer Safari (Major Safari: appears at Zoom 11+)
  {
    id: "bear-deer-safari",
    name: "Bear & Deer Safari",
    shortName: "Bear & Deer Safari",
    iconName: "Bear",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.193500,
    longitude: 79.005500,
    radius: 130,
    description: "Multi-species safari sector featuring Sloth Bear habitats and deer grazing meadows."
  },

  // 8. Deer, Nilgai & Peacock Safari (Major Safari: appears at Zoom 11+)
  {
    id: "deer-nilgai-peacock-safari",
    name: "Deer, Nilgai & Peacock Safari",
    shortName: "Deer, Nilgai & Peacock Safari",
    iconName: "Deer",
    category: "herbivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.191000,
    longitude: 79.000100,
    radius: 150,
    description: "Expansive safari trail along Gorewada Lake perimeter hosting Spotted Deer, Nilgai, and Indian Peafowl."
  },

  // 9. Forest Corridor (Nature Trail: appears at Zoom 14+)
  {
    id: "forest-corridor",
    name: "Forest Corridor",
    shortName: "Forest Corridor",
    iconName: "TreePine",
    category: "nature",
    isPrimary: true,
    minZoom: 14,
    latitude: 21.189500,
    longitude: 79.004000,
    radius: 130,
    description: "Dense teak forest nature trail, botanical canopy, and tranquil wilderness passage."
  },

  // 10. Tiger Safari (Major Safari: appears at Zoom 11+)
  {
    id: "tiger-safari",
    name: "Tiger Safari",
    shortName: "Tiger Safari",
    iconName: "Tiger",
    category: "carnivore",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.189043,
    longitude: 79.005969,
    radius: 140,
    description: "Royal Bengal Tiger Safari zone situated along the forest loop safari track."
  },

  // 11. Tiger Safari Central Gate (Major Access Gate: appears at Zoom 11+)
  {
    id: "tiger-safari-central-gate",
    name: "Tiger Safari Central Gate",
    shortName: "Tiger Central Gate",
    iconName: "DoorOpen",
    category: "entrance",
    isPrimary: true,
    minZoom: 11,
    latitude: 21.193370,
    longitude: 79.005780,
    radius: 130,
    description: "Main central entrance gate, security checkpoint, and vehicle transit portal for the Royal Bengal Tiger Safari."
  }
];
