import fs from 'fs';
import path from 'path';

const sourceBaseDir = 'D:\\Cojag Technology\\videos (maharajbagh)';
const destDir = path.resolve('public/media/maharajbagh-videos');

// Maharajbagh Enclosure Zones
const MAHARAJBAGH_ZONES = [
  { id: "mb-main-entrance", name: "Main Entrance Gate", latitude: 21.144800, longitude: 79.074600 },
  { id: "mb-ticket-counter", name: "Ticketing Plaza", latitude: 21.144700, longitude: 79.074700 },
  { id: "mb-central-promenade", name: "Central Promenade & Walkway", latitude: 21.144300, longitude: 79.075200 },
  { id: "mb-aviary", name: "Peacock & Exotic Bird Aviary", latitude: 21.144000, longitude: 79.075450 },
  { id: "mb-tiger-enclosure", name: "Royal Bengal Tiger Enclosure", latitude: 21.143450, longitude: 79.075650 },
  { id: "mb-leopard-enclosure", name: "Indian Leopard Enclosure", latitude: 21.143700, longitude: 79.075800 },
  { id: "mb-sloth-bear", name: "Sloth Bear Habitat", latitude: 21.143550, longitude: 79.075350 },
  { id: "mb-deer-park", name: "Spotted Deer & Blackbuck Meadow", latitude: 21.143150, longitude: 79.075900 },
  { id: "mb-crocodile-pond", name: "Crocodile & Reptile Enclosure", latitude: 21.143300, longitude: 79.075400 },
  { id: "mb-botanical-garden", name: "Historic Botanical Garden & Herbarium", latitude: 21.144150, longitude: 79.076050 },
  { id: "mb-cafeteria", name: "Garden Cafeteria & Snack Kiosks", latitude: 21.144500, longitude: 79.075050 },
  { id: "mb-vet-hospital", name: "Zoo Veterinary Hospital & Administration", latitude: 21.144400, longitude: 79.074900 }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function findClosestZone(lat, lon) {
  let closest = MAHARAJBAGH_ZONES[0].name;
  let minDist = Infinity;
  for (const zone of MAHARAJBAGH_ZONES) {
    const d = calculateDistance(lat, lon, zone.latitude, zone.longitude);
    if (d < minDist) {
      minDist = d;
      closest = zone.name;
    }
  }
  return closest;
}

async function processVideos() {
  if (!fs.existsSync(sourceBaseDir)) {
    console.error(`Source directory does not exist: ${sourceBaseDir}`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const dirs = fs.readdirSync(sourceBaseDir).filter(d => 
    fs.statSync(path.join(sourceBaseDir, d)).isDirectory()
  );

  // Sort numerically by Video number (Video 1, Video 2, ... Video 50)
  dirs.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  console.log(`Found ${dirs.length} video directories in source.`);

  const videoItems = [];

  for (const dir of dirs) {
    const dirPath = path.join(sourceBaseDir, dir);
    const files = fs.readdirSync(dirPath);
    const mp4File = files.find(f => f.endsWith('.mp4'));
    const jsonFile = files.find(f => f.endsWith('.json'));
    const videoNum = parseInt(dir.replace(/\D/g, ''), 10);

    if (!mp4File || !jsonFile) {
      console.warn(`Skipping ${dir}: missing .mp4 or .json file`);
      continue;
    }

    const srcMp4Path = path.join(dirPath, mp4File);
    const dstMp4Path = path.join(destDir, mp4File);

    // Copy MP4 file if not already copied or if size differs
    if (!fs.existsSync(dstMp4Path)) {
      console.log(`Copying [Video ${videoNum}] ${mp4File}...`);
      fs.copyFileSync(srcMp4Path, dstMp4Path);
    } else {
      const srcStat = fs.statSync(srcMp4Path);
      const dstStat = fs.statSync(dstMp4Path);
      if (srcStat.size !== dstStat.size) {
        console.log(`Re-copying [Video ${videoNum}] ${mp4File} (size mismatch)...`);
        fs.copyFileSync(srcMp4Path, dstMp4Path);
      }
    }

    // Read and parse telemetry JSON
    const jsonContent = JSON.parse(fs.readFileSync(path.join(dirPath, jsonFile), 'utf8'));
    const points = jsonContent.points || [];

    if (points.length === 0) {
      console.warn(`Warning: No points found in ${jsonFile}`);
      continue;
    }

    const firstPt = points[0];
    const lat = firstPt.lat;
    const lon = firstPt.lon;
    const heading = firstPt.head !== undefined ? firstPt.head : null;
    const durationSec = jsonContent.durationSec || 0;
    const startTime = jsonContent.startISO || new Date(jsonContent.startEpochMs || Date.now()).toISOString();

    // Generate track array [[lat, lon], ...]
    const track = points.map(p => [p.lat, p.lon]);

    // Find nearest Maharajbagh enclosure zone
    const zoneName = findClosestZone(lat, lon);
    const title = `${zoneName} Video (Video ${videoNum})`;
    const description = `Field survey safari video with synchronized live GPS telemetry route captured at ${zoneName}.`;

    videoItems.push({
      id: 20000 + videoNum,
      videoNum: videoNum,
      type: 'video',
      title: title,
      latitude: lat,
      longitude: lon,
      heading: heading,
      videoUrl: `/media/maharajbagh-videos/${mp4File}`,
      description: description,
      zone: zoneName,
      durationSec: durationSec,
      startTime: startTime,
      track: track,
      points: points,
      zooId: 'maharajbagh'
    });
  }

  // Write out maharajbaghVideos.js
  const outputFilePath = path.resolve('src/data/maharajbaghVideos.js');
  const fileContent = `// Auto-generated Maharajbagh Geotagged Videos Dataset (${videoItems.length} videos)
export const maharajbaghVideos = ${JSON.stringify(videoItems, null, 2)};
`;

  fs.writeFileSync(outputFilePath, fileContent, 'utf8');
  console.log(`Successfully processed and integrated ${videoItems.length} Maharajbagh videos to ${outputFilePath}`);
}

processVideos().catch(console.error);
