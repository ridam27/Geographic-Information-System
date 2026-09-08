/**
 * Utility functions for calculating dynamic GPS track progression,
 * interpolating live coordinates based on video timestamp,
 * and splitting the GPS path into Watched (Green) and Remaining (Red) segments.
 */

/**
 * Calculates current GPS position and splits track into watched & remaining paths.
 * 
 * @param {Array<Array<number>>} track Array of [latitude, longitude] GPS points
 * @param {number} currentTime Current playback time in seconds
 * @param {number} duration Total duration of video in seconds
 * @returns {Object} { currentPoint, currentLat, currentLng, watchedPath, remainingPath, progressRatio }
 */
export function getTrackProgress(track, currentTime, duration) {
  if (!track || !Array.isArray(track) || track.length === 0) {
    return {
      currentPoint: null,
      currentLat: null,
      currentLng: null,
      watchedPath: [],
      remainingPath: [],
      progressRatio: 0
    };
  }

  // If track has only 1 point
  if (track.length === 1) {
    return {
      currentPoint: track[0],
      currentLat: track[0][0],
      currentLng: track[0][1],
      watchedPath: [track[0]],
      remainingPath: [track[0]],
      progressRatio: currentTime > 0 ? 1 : 0
    };
  }

  const validDuration = duration && duration > 0 ? duration : 1;
  const progressRatio = Math.max(0, Math.min(1, currentTime / validDuration));

  // Calculate position along the multi-point polyline
  const totalSegments = track.length - 1;
  const exactIndex = progressRatio * totalSegments;
  const index0 = Math.floor(exactIndex);
  const index1 = Math.min(index0 + 1, totalSegments);
  const fraction = exactIndex - index0;

  const [lat0, lng0] = track[index0];
  const [lat1, lng1] = track[index1];

  // Linear interpolation between the two neighboring GPS points
  const currentLat = lat0 + (lat1 - lat0) * fraction;
  const currentLng = lng0 + (lng1 - lng0) * fraction;
  const currentPoint = [currentLat, currentLng];

  // 1. Watched Path (GREEN): from start up to index0 + interpolated point
  const watchedPath = [...track.slice(0, index0 + 1)];
  if (fraction > 0.001 || index0 === 0) {
    watchedPath.push(currentPoint);
  }

  // 2. Remaining Path (RED): from interpolated point through to the end of the track
  const remainingPath = [currentPoint, ...track.slice(index1)];

  return {
    currentPoint,
    currentLat,
    currentLng,
    watchedPath,
    remainingPath,
    progressRatio
  };
}

/**
 * Formats seconds into mm:ss format.
 */
export function formatVideoTime(seconds) {
  if (isNaN(seconds) || seconds == null || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Finds the closest point and progress ratio (0 to 1) along a GPS track
 * for any given pin or click coordinates [targetLat, targetLng].
 * 
 * @param {Array<Array<number>>} track Array of [latitude, longitude] points
 * @param {number} targetLat Latitude of clicked/pinned point
 * @param {number} targetLng Longitude of clicked/pinned point
 * @returns {Object} { progressRatio, closestPoint: [lat, lng], distanceMeters }
 */
export function findClosestProgressOnTrack(track, targetLat, targetLng) {
  if (!track || !Array.isArray(track) || track.length === 0) {
    return { progressRatio: 0, closestPoint: null, distanceMeters: 0 };
  }

  if (track.length === 1) {
    return { progressRatio: 0, closestPoint: track[0], distanceMeters: 0 };
  }

  let minDistanceSq = Infinity;
  let bestSegmentIndex = 0;
  let bestFraction = 0;
  let bestProjPoint = track[0];

  const totalSegments = track.length - 1;

  for (let i = 0; i < totalSegments; i++) {
    const [lat0, lng0] = track[i];
    const [lat1, lng1] = track[i + 1];

    const dLat = lat1 - lat0;
    const dLng = lng1 - lng0;
    const segLenSq = dLat * dLat + dLng * dLng;

    let t = 0;
    if (segLenSq > 0) {
      // Vector projection
      t = ((targetLat - lat0) * dLat + (targetLng - lng0) * dLng) / segLenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projLat = lat0 + t * dLat;
    const projLng = lng0 + t * dLng;

    const distSq = (targetLat - projLat) * (targetLat - projLat) + (targetLng - projLng) * (targetLng - projLng);

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestSegmentIndex = i;
      bestFraction = t;
      bestProjPoint = [projLat, projLng];
    }
  }

  const progressRatio = Math.max(0, Math.min(1, (bestSegmentIndex + bestFraction) / totalSegments));

  // Rough approximation: 1 degree latitude ~ 111,000 meters
  const approxDistanceMeters = Math.sqrt(minDistanceSq) * 111000;

  return {
    progressRatio,
    closestPoint: bestProjPoint,
    distanceMeters: approxDistanceMeters
  };
}

