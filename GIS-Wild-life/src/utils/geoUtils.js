/**
 * Fetches routing information between two coordinates using the public OSRM API.
 * 
 * @param {number} lat1 Start Latitude
 * @param {number} lon1 Start Longitude
 * @param {number} lat2 End Latitude
 * @param {number} lon2 End Longitude
 * @returns {Promise<Object>} Route data containing coordinates, distance, and duration
 */
export const fetchRoute = async (lat1, lon1, lat2, lon2) => {
  try {
    // OSRM expects coordinates in Longitude,Latitude order
    const url = `https://router.project-osrm.org/route/v1/foot/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert back to [Lat, Lon] for Leaflet
        distance: route.distance, // in meters
        duration: route.duration // in seconds
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching route from OSRM:", error);
    return null;
  }
};

/**
 * Formats duration in seconds to a human-readable string.
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
};

/**
 * Extracts and formats the capture date/time from metadata or file paths.
 */
export const getMediaCaptureTime = (media) => {
  if (!media) return null;
  if (media.captureTime) return media.captureTime;
  if (media.dateTime) return media.dateTime;
  if (media.date) return media.date;
  
  // Extract from image file names like 20260714_80053AMByGPSMapCamera.avif
  const path = media.imageUrl || media.videoUrl || '';
  const match = path.match(/(\d{4})(\d{2})(\d{2})_(\d{1,2})(\d{2})(\d{2})([AP]M)/i);
  if (match) {
    const [, y, m, d, h, min, s, ampm] = match;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d} ${monthName} ${y}, ${h}:${min}:${s} ${ampm.toUpperCase()}`;
  }

  // Extract from video file names like fieldcap_20260714_083203.mp4
  const matchVideo = path.match(/fieldcap_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i);
  if (matchVideo) {
    const [, y, m, d, h, min, s] = matchVideo;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    const hourNum = parseInt(h, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;
    return `${d} ${monthName} ${y}, ${displayHour}:${min}:${s} ${ampm}`;
  }
  return 'Zoo Field Geospatial Survey';
};

