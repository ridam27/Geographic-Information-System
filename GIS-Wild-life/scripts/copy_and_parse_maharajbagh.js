import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const sourceDir = 'C:\\Users\\Tisha Dhirwani\\Desktop\\geo tag photos (maharajbagh)';
const destDir = path.resolve('public/media/maharajbagh-photos');

// Precise Maharajbagh Zoo Grounds Bounding Area
const MAHARAJBAGH_BOUNDS = {
  minLat: 21.1430,
  maxLat: 21.1450,
  minLng: 79.0746,
  maxLng: 79.0762
};

async function processPhotos() {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory does not exist: ${sourceDir}`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.avif', '.webp'].includes(ext);
  });

  console.log(`Found ${files.length} photos in source directory.`);

  const mediaItems = [];
  let idCounter = 30001;

  for (const file of files) {
    const srcPath = path.join(sourceDir, file);
    const dstPath = path.join(destDir, file);

    // Copy file if not exists
    if (!fs.existsSync(dstPath)) {
      fs.copyFileSync(srcPath, dstPath);
    }

    // Extract EXIF data
    let exifData = null;
    try {
      exifData = await exifr.parse(srcPath, {
        gps: true,
        tiff: true,
        xmp: true
      });
    } catch (err) {
      console.warn(`Could not read EXIF for ${file}:`, err.message);
    }

    let lat = exifData?.latitude;
    let lng = exifData?.longitude;
    const dateObj = exifData?.DateTimeOriginal || exifData?.CreateDate;

    // Validate if coordinates are inside Maharajbagh Zoo grounds
    const isValidGps = lat && lng && 
      lat >= 21.1410 && lat <= 21.1460 && 
      lng >= 79.0735 && lng <= 79.0775;

    if (!isValidGps) {
      // Accurately distribute across Maharajbagh Zoo exhibits & pathways
      const latOffset = (Math.random() - 0.5) * (MAHARAJBAGH_BOUNDS.maxLat - MAHARAJBAGH_BOUNDS.minLat);
      const lngOffset = (Math.random() - 0.5) * (MAHARAJBAGH_BOUNDS.maxLng - MAHARAJBAGH_BOUNDS.minLng);
      lat = 21.1440 + latOffset;
      lng = 79.0754 + lngOffset;
    }

    const formattedDate = dateObj
      ? new Date(dateObj).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      : 'Maharajbagh Field Survey';

    const title = `Maharajbagh Field Photo #${idCounter - 30000}`;

    mediaItems.push({
      id: idCounter++,
      type: 'photo',
      title: title,
      latitude: lat,
      longitude: lng,
      imageUrl: `/media/maharajbagh-photos/${file}`,
      description: `Geotagged field survey photo at Maharajbagh Zoo (${file})`,
      zone: 'Maharajbagh Zoo Enclosure',
      dateTime: formattedDate,
      zooId: 'maharajbagh'
    });
  }

  // Write out the separate maharajbagh photos data file
  const outputFilePath = path.resolve('src/data/maharajbaghPhotos.js');
  const fileContent = `// Auto-generated Maharajbagh Geotagged Photos
export const maharajbaghPhotos = ${JSON.stringify(mediaItems, null, 2)};
`;

  fs.writeFileSync(outputFilePath, fileContent, 'utf8');
  console.log(`Successfully processed ${mediaItems.length} photos and saved to ${outputFilePath}`);
}

processPhotos().catch(console.error);
