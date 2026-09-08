import exifr from 'exifr';

/**
 * Extracts GPS metadata from an image file (e.g. JPEG, AVIF)
 * @param {File} file The image file to parse
 * @returns {Promise<Object|null>} Object containing latitude and longitude, or null if missing
 */
export const extractGPSData = async (file) => {
  try {
    const data = await exifr.gps(file);
    if (data && data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
    return null;
  } catch (error) {
    console.error("Error extracting EXIF GPS data:", error);
    return null;
  }
};
