const subjects = [
  'Royal Bengal Tiger', 'Indian Leopard', 'Sloth Bear', 'Sambar Deer', 
  'Nilgai', 'Indian Peafowl', 'Wild Boar', 'Rhesus Macaque', 
  'Barking Deer', 'Spotted Deer', 'Mongoose', 'Monitor Lizard'
];

const actions = [
  'resting in the shade', 'moving through dense vegetation', 
  'approaching the water source', 'interacting with the environment', 
  'patrolling the territory', 'spotted during routine monitoring', 
  'captured on motion-activated field camera', 'foraging for food', 
  'observing the surroundings', 'navigating the rocky terrain',
  'crossing the designated animal corridor', 'resting near the waterbody'
];

const zones = [
  'Northern Sector', 'Southern Boundary', 'Lake-side Trail', 
  'Deep Forest Zone', 'Eastern Enclosure', 'Western Ridge',
  'Central Feeding Zone', 'Safari Route Alpha', 'Buffer Zone'
];

const times = [
  'early morning', 'late morning', 'afternoon', 
  'late afternoon', 'dusk', 'night', 'dawn'
];

/**
 * Generates an accurate, context-aware wildlife and facility description based on the exact geographical zone.
 */
export const generateDescription = (media) => {
  const zone = media.zone || 'Gorewada Zoo Area';
  const title = media.title || (media.type === 'video' ? 'Field Video' : 'Field Photo');
  const lat = media.latitude ? media.latitude.toFixed(4) : '';
  const lon = media.longitude ? media.longitude.toFixed(4) : '';

  if (media.description && !media.description.startsWith('Geotagged')) {
    return media.description;
  }

  if (zone.includes('Entrance & Parking')) {
    return `${title}: Official documentation of the Gorewada Zoo entrance gate and vehicle parking grounds. Captured at GPS coordinates [${lat}, ${lon}].`;
  }

  if (zone.includes('Boarding Plaza')) {
    return `${title}: Safari vehicle boarding area and visitor reception plaza. Recorded along the main transit corridor at GPS coordinates [${lat}, ${lon}].`;
  }

  if (zone.includes('Inside Visitor Walkway')) {
    return `${title}: Internal visitor walkway and pedestrian nature promenade within Gorewada Zoo. Verified location at GPS [${lat}, ${lon}].`;
  }

  if (zone.includes('Tiger & Carnivore')) {
    return `${title}: Dedicated safari track within the Tiger and Carnivore Safari Zone. Wildlife monitoring route at GPS [${lat}, ${lon}].`;
  }

  if (zone.includes('Central Safari') || zone.includes('Herbivore')) {
    return `${title}: Safari vehicle route traversing the wildlife safari corridor and natural habitat. GPS coordinates verified at [${lat}, ${lon}].`;
  }

  if (zone.includes('Lake')) {
    return `${title}: Wetland and waterfront observation along the Gorewada Lake perimeter and reservoir boundary. GPS coordinates [${lat}, ${lon}].`;
  }

  return `${title}: Geotagged ${media.type === 'video' ? 'video' : 'photo'} captured within the ${zone} at GPS coordinates [${lat}, ${lon}].`;
};
