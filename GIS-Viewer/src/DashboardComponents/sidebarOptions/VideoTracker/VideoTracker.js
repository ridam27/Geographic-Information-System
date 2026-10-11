// ControlPanelWithKMZ.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import JSZip from "jszip";
import proj4 from "proj4";

// ============================================================================
// 1. CONFIGURATION & ASSETS
// ============================================================================

const TRAVEL_COLOR = "#f59e0b"; // Amber
const FULL_TRACK_COLOR = "#3b82f6"; // Blue
const TRAVEL_WEIGHT = 6;
const FULL_TRACK_WEIGHT = 4;
const DEFAULT_FPS = 30;

// Fix Leaflet Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom Pulse Icon (CSS Animated)
const currentLocationIcon = new L.DivIcon({
  className: "current-location-icon",
  html: `
    <div style="position: relative; width: 100%; height: 100%; cursor: grab; will-change: transform;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 2;"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: pulse 2s infinite;"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// ============================================================================
// 2. STYLES (Responsive & Optimized)
// ============================================================================

// Styles handled dynamically via VideoTracker.css for Light/Dark modes

// ============================================================================
// 3. UTILITIES (Optimized)
// ============================================================================

function findNearestPoint(lat, lng, points) {
    if (!points || points.length === 0) return null;
    let minDist = Infinity;
    let nearest = null;
    for (let i = 0, len = points.length; i < len; i++) {
        const p = points[i];
        const dist = (lat - p.lat)**2 + (lng - p.lng)**2; // Squared distance is faster
        if (dist < minDist) {
            minDist = dist;
            nearest = p;
        }
    }
    return nearest;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dedupePoints(points, minMeters = 2) {
  if (!points || points.length === 0) return [];
  const kept = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const last = kept[kept.length - 1];
    if (haversineMeters(last.lat, last.lng, p.lat, p.lng) >= minMeters) kept.push(p);
  }
  return kept;
}

function smoothPoints(points, window = 3) {
  if (!points || points.length <= 1 || window <= 1) return points.slice();
  const out = [];
  const n = points.length, half = Math.floor(window / 2);
  for (let i = 0; i < n; i++) {
    let sumLat = 0, sumLng = 0, sumAlt = 0, cnt = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sumLat += points[j].lat; sumLng += points[j].lng;
      if (Number.isFinite(points[j].alt)) sumAlt += points[j].alt;
      cnt++;
    }
    const alt = sumAlt > 0 ? sumAlt / cnt : undefined;
    out.push({ time: points[i].time, lat: sumLat / cnt, lng: sumLng / cnt, alt });
  }
  return out;
}

function parseCSVText(text, fps) {
  const lines = text.replace(/\r/g, "").trim().split(/\n/).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const hasHeader = first.some((c) => ["frame", "time", "latitude", "lat", "longitude", "lon"].includes(c));
  const rows = [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(",").map((p) => p.trim());
    const r = hasHeader ? {} : {};
    if (hasHeader) { for (let j = 0; j < first.length && j < parts.length; j++) r[first[j]] = parts[j]; } 
    else { if (parts.length >= 2) { r.lat = parts[0]; r.lon = parts[1]; } }

    let time = r.time !== undefined ? Number(r.time) : (r.frame !== undefined ? Number(r.frame) / fps : i / fps);
    let lat = Number(r.latitude ?? r.lat ?? r.LAT);
    let lng = Number(r.longitude ?? r.lon ?? r.LNG ?? r.LON);
    let alt = Number(r.altitude ?? r.alt ?? r.ALT);

    if (Number.isFinite(time) && Number.isFinite(lat) && Number.isFinite(lng)) {
      rows.push({ time, lat, lng, alt: Number.isFinite(alt) ? alt : undefined });
    }
  }
  return rows.sort((a, b) => a.time - b.time);
}

function interpPosition(t, arr) {
  const n = arr.length;
  if (n === 0) return null;
  if (t <= arr[0].time) return { lat: arr[0].lat, lng: arr[0].lng, idx: 0 };
  if (t >= arr[n - 1].time) return { lat: arr[n - 1].lat, lng: arr[n - 1].lng, idx: n - 1 };

  // Binary search
  let lo = 0, hi = n - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].time <= t && t < arr[mid + 1].time) {
        const a = arr[mid], b = arr[mid + 1];
        const dt = b.time - a.time;
        const frac = dt <= 0 ? 0 : (t - a.time) / dt;
        return { lat: a.lat + (b.lat - a.lat) * frac, lng: a.lng + (b.lng - a.lng) * frac, idx: mid };
    }
    if (arr[mid].time > t) hi = mid - 1; else lo = mid + 1;
  }
  return null;
}

function buildPolylineUpTo(t, arr) {
  if (!arr || arr.length === 0) return [];
  const pos = interpPosition(t, arr);
  if (!pos) return [];
  // Optimized slice mapping
  const latlngs = arr.slice(0, pos.idx + 1).map(p => [p.lat, p.lng]);
  latlngs.push([pos.lat, pos.lng]);
  return latlngs;
}

function createCsvFromWaypoints(waypoints, opts = {}) {
  if (!waypoints || waypoints.length === 0) return null;
  const fps = Number(opts.fps) || DEFAULT_FPS;
  let pts = waypoints.map((p) => ({ ...p }));
  if (opts.smoothWindow > 1) pts = smoothPoints(pts, opts.smoothWindow);
  if (opts.dedupeMeters > 0) pts = dedupePoints(pts, opts.dedupeMeters);
  
  const header = ["frame", "time", "latitude", "longitude", "altitude"];
  const csvLines = [header.join(",")];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const frame = Math.round(p.time * fps);
    const alt = Number.isFinite(p.alt) ? p.alt.toFixed(2) : "";
    csvLines.push(`${frame},${p.time.toFixed(3)},${p.lat.toFixed(6)},${p.lng.toFixed(6)},${alt}`);
  }
  return { csvText: csvLines.join("\n"), filename: opts.filename || "exported_track.csv" };
}

// ============================================================================
// 4. KMZ/KML LOGIC
// ============================================================================

const setupProjections = () => {
  for (let zone = 1; zone <= 60; zone++) {
    proj4.defs(`UTM${zone}N`, `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`);
    proj4.defs(`UTM${zone}S`, `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`);
  }
};
setupProjections();

const detectCoordinateSystem = (xmlDoc) => {
  const coordsEl = xmlDoc.querySelector("coordinates");
  if (!coordsEl) return "EPSG:4326";
  const parts = coordsEl.textContent.trim().split(/\s+/)[0].split(",").map(Number);
  if (parts.length >= 2 && (Math.abs(parts[0]) > 100000 || Math.abs(parts[1]) > 100000)) {
      const utmZone = Math.floor((parts[0] + 180) / 6) + 1;
      return parts[1] > 0 ? `UTM${utmZone}N` : `UTM${utmZone}S`;
  }
  return "EPSG:4326";
};

const loadImageFromZip = async (zip, imagePath = "", baseDir = "") => {
  if (!imagePath) return null;
  const paths = [imagePath, `${baseDir}/${imagePath}`, `files/${imagePath}`, `images/${imagePath}`, imagePath.split("/").pop()];
  for (const p of paths) {
    const file = zip.file(p.replace(/^[/\\]+/, ""));
    if (file) return URL.createObjectURL(await file.async("blob"));
  }
  return null;
};

const loadKmlFiles = async (zip, filePath = "doc.kml", baseDir = "", loaded = new Set()) => {
  const normalized = filePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  if (loaded.has(normalized)) return [];
  loaded.add(normalized);
  
  const file = zip.file(normalized);
  if (!file) return []; 

  const text = await file.async("text");
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const currentDir = normalized.split("/").slice(0, -1).join("/");
  
  const links = [...xml.getElementsByTagName("NetworkLink")];
  const linkedKmls = await Promise.all(links.map(async link => {
      const href = link.querySelector("href")?.textContent;
      return href ? loadKmlFiles(zip, href, currentDir, loaded) : [];
  }));

  return [{ kmlText: text, basePath: currentDir, coordSystem: detectCoordinateSystem(xml) }, ...linkedKmls.flat()];
};

// ---------- KmlMap Component (Memoized) ----------
const KmlMap = React.memo(({ kmlContent, zip, baseDir, isActive }) => {
  const map = useMap();
  const overlaysRef = useRef([]);

  const processOverlay = useCallback(async (ground, docBase, coordSystem) => {
      let href = ground.querySelector("Icon > href")?.textContent || ground.querySelector("href")?.textContent;
      if (!href) return null;
      const imageUrl = zip ? await loadImageFromZip(zip, href, docBase) : href;
      if (!imageUrl) return null;

      const latLonBox = ground.querySelector("LatLonBox");
      const latLonQuad = ground.querySelector("LatLonQuad");
      let bounds = null;

      if (latLonBox) {
          const n = parseFloat(latLonBox.querySelector("north")?.textContent);
          const s = parseFloat(latLonBox.querySelector("south")?.textContent);
          const e = parseFloat(latLonBox.querySelector("east")?.textContent);
          const w = parseFloat(latLonBox.querySelector("west")?.textContent);
          if (!isNaN(n)) bounds = L.latLngBounds([[s, w], [n, e]]);
      } else if (latLonQuad) {
          const coords = latLonQuad.querySelector("coordinates")?.textContent.trim().split(/\s+/).map(c => {
              const [lon, lat] = c.split(",").map(Number);
              return [lat, lon];
          });
          if (coords?.length >= 4) bounds = L.latLngBounds(coords);
      }
      return { bounds, imageUrl };
  }, [zip]);

  useEffect(() => {
      const loadOverlays = async () => {
          overlaysRef.current.forEach(o => { map.removeLayer(o.leafletOverlay); URL.revokeObjectURL(o.imageUrl); });
          overlaysRef.current = [];
          if (!isActive || !kmlContent) return;

          let kmlFiles = zip ? await loadKmlFiles(zip, "doc.kml") : [{ kmlText: kmlContent, basePath: baseDir || "", coordSystem: "EPSG:4326" }];
          const promises = kmlFiles.flatMap(({ kmlText, basePath, coordSystem }) => {
              const xml = new DOMParser().parseFromString(kmlText, "application/xml");
              return [...xml.getElementsByTagName("GroundOverlay")].map(g => processOverlay(g, basePath, coordSystem));
          });

          const results = (await Promise.all(promises)).filter(Boolean);
          overlaysRef.current = results.map(ov => ({ ...ov, leafletOverlay: L.imageOverlay(ov.imageUrl, ov.bounds).addTo(map) }));
          if (results.length > 0) map.fitBounds(L.latLngBounds(results.map(o => o.bounds)));
      };
      loadOverlays();
      return () => { overlaysRef.current.forEach(o => { map.removeLayer(o.leafletOverlay); URL.revokeObjectURL(o.imageUrl); }); };
  }, [kmlContent, zip, isActive, map, baseDir, processOverlay]);

  return null;
});

// ---------- TrackLayer Component (Optimized) ----------
const TrackLayer = React.memo(({ trackPoints, currentPosition, autoFollow, onSeek }) => {
  const map = useMap();
  const fullTrackCoords = useMemo(() => trackPoints.map((p) => [p.lat, p.lng]), [trackPoints]);
  
  // Optimize traveled path calculation
  const traveledTrackCoords = useMemo(() => {
    if (!trackPoints.length) return [];
    const currentTime = currentPosition[2] ?? 0;
    return buildPolylineUpTo(currentTime, trackPoints);
  }, [trackPoints, currentPosition]);

  // Smooth auto-pan
  useEffect(() => {
    if (autoFollow && trackPoints.length) {
      map.panTo([currentPosition[0], currentPosition[1]], { animate: true, duration: 0.25, easeLinearity: 0.5 });
    }
  }, [currentPosition, autoFollow, map, trackPoints]);

  const fitBounds = useCallback(() => {
    if (fullTrackCoords.length) map.fitBounds(L.latLngBounds(fullTrackCoords), { padding: [20, 20] });
  }, [map, fullTrackCoords]);

  const centerOnFirst = useCallback(() => {
    if (fullTrackCoords.length) map.setView(fullTrackCoords[0], 18);
  }, [map, fullTrackCoords]);

  // Polyline Click
  const handlePolylineClick = useCallback((e) => {
      if(onSeek) onSeek(e.latlng.lat, e.latlng.lng);
  }, [onSeek]);

  return (
    <>
      {/* Wide Invisible Hit Area for clicking */}
      <Polyline positions={fullTrackCoords} pathOptions={{ color: 'transparent', weight: 20 }} eventHandlers={{ click: handlePolylineClick }} />
      <Polyline positions={fullTrackCoords} pathOptions={{ color: FULL_TRACK_COLOR, weight: FULL_TRACK_WEIGHT, opacity: 0.5 }} eventHandlers={{ click: handlePolylineClick }} />
      <Polyline positions={traveledTrackCoords} pathOptions={{ color: TRAVEL_COLOR, weight: TRAVEL_WEIGHT, opacity: 0.9 }} eventHandlers={{ click: handlePolylineClick }} />
      <MapControls fitBounds={fitBounds} centerOnFirst={centerOnFirst} />
    </>
  );
});

const MapControls = ({ fitBounds, centerOnFirst }) => {
    useEffect(() => { window.fitBounds = fitBounds; window.centerOnFirst = centerOnFirst; }, [fitBounds, centerOnFirst]);
    return null;
}

// ---------- Hook: Map Sync (RAF Loop Optimized) ----------
const useMapSync = (videoRef, trackPoints, timeOffset, autoFollow, fps, isDraggingRef) => {
  const [currentMapPos, setCurrentMapPos] = useState(null);
  const rafId = useRef(null);

  const updateFromVideo = useCallback(() => {
    if (isDraggingRef.current) return; // Stop updates if user is dragging marker
    const videoEl = videoRef.current;
    if (!videoEl || !trackPoints.length) { setCurrentMapPos(null); return; }
    
    const vt = videoEl.currentTime; // Direct property access
    const tAdj = vt + timeOffset;
    const pos = interpPosition(tAdj, trackPoints);
    
    if (pos) setCurrentMapPos([pos.lat, pos.lng, tAdj]); 
    else setCurrentMapPos(null);
  }, [videoRef, trackPoints, timeOffset, isDraggingRef]);

  const loopRAF = useCallback(() => {
    updateFromVideo();
    rafId.current = requestAnimationFrame(loopRAF);
  }, [updateFromVideo]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    const startRAF = () => { if(rafId.current === null) rafId.current = requestAnimationFrame(loopRAF); };
    const stopRAF = () => { if(rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null; } };
    
    videoEl.addEventListener('play', startRAF);
    videoEl.addEventListener('pause', stopRAF);
    
    // Manual update for seeking/timeupdate when paused
    videoEl.addEventListener('seeked', updateFromVideo);
    
    return () => { 
        stopRAF(); 
        videoEl.removeEventListener('play', startRAF); 
        videoEl.removeEventListener('pause', stopRAF); 
        videoEl.removeEventListener('seeked', updateFromVideo);
    };
  }, [videoRef, loopRAF, updateFromVideo]); // Note: Removed `updateFromVideo` from deps of RAF logic to prevent stutter

  // Initial Sync
  useEffect(() => { 
      const videoEl = videoRef.current; 
      if (videoEl && videoEl.paused) updateFromVideo(); 
  }, [trackPoints, timeOffset, videoRef, updateFromVideo]);

  return currentMapPos;
};

// ---------- MapView Wrapper ----------
const MapView = ({ trackPoints, currentMapPos, markers, kmzLayer, autoFollow, timeOffset, fps, videoRef, isDraggingRef }) => {
  const defaultCenter = [21.1458, 79.0882];
  const finalCenter = currentMapPos ? [currentMapPos[0], currentMapPos[1]] : defaultCenter;

  // Seek Handler
  const handleSeek = useCallback((lat, lng) => {
      if(!trackPoints.length) return;
      const nearest = findNearestPoint(lat, lng, trackPoints);
      if(nearest && videoRef.current) {
          videoRef.current.currentTime = Math.max(0, nearest.time - timeOffset);
      }
  }, [trackPoints, timeOffset, videoRef]);

  const handleDrag = useCallback((e) => {
      isDraggingRef.current = true;
      handleSeek(e.latlng.lat, e.latlng.lng);
  }, [handleSeek, isDraggingRef]);

  const handleDragEnd = useCallback((e) => {
      handleSeek(e.target.getLatLng().lat, e.target.getLatLng().lng);
      // Small delay to ensure video seeks before we resume auto-updates
      setTimeout(() => { isDraggingRef.current = false; }, 100);
  }, [handleSeek, isDraggingRef]);

  return (
    <MapContainer 
        center={finalCenter} 
        zoom={18} 
        style={{ height: "100%", width: "100%" }} 
        maxZoom={25} // Allowed to scroll deep
        zoomControl={false}
        preferCanvas={true} // Performance Boost
    >
      {/* Satellite Layer with Digital Zoom Fix (maxNativeZoom=18) */}
      <TileLayer 
        url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']} 
        attribution="Google Maps Satellite" 
        maxNativeZoom={18} // Stops fetching tiles after 18
        maxZoom={25}       // Allows digital zooming up to 25
      />
      
      <MapSyncRunner videoRef={videoRef} trackPoints={trackPoints} timeOffset={timeOffset} autoFollow={autoFollow} fps={fps} currentMapPos={currentMapPos} isDraggingRef={isDraggingRef} onSeek={handleSeek} />
      
      {currentMapPos && (
        <Marker 
            position={finalCenter} 
            icon={currentLocationIcon}
            draggable={true} // Enable Dragging
            eventHandlers={{
                dragstart: () => { isDraggingRef.current = true; },
                drag: handleDrag,
                dragend: handleDragEnd
            }}
        >
          <Popup>Time: {currentMapPos[2].toFixed(2)}s <br /> Lat: {currentMapPos[0].toFixed(6)} <br /> Lng: {currentMapPos[1].toFixed(6)}</Popup>
        </Marker>
      )}
      {markers.map((m, i) => <Marker key={i} position={m.position}><Popup>{m.label}</Popup></Marker>)}
      {kmzLayer?.kmlContent && <KmlMap kmlContent={kmzLayer.kmlContent} zip={kmzLayer.zip} baseDir={kmzLayer.baseDir} isActive={kmzLayer.isActive} />}
    </MapContainer>
  );
};

const MapSyncRunner = ({ videoRef, trackPoints, timeOffset, autoFollow, fps, currentMapPos, isDraggingRef, onSeek }) => {
    useMapSync(videoRef, trackPoints, timeOffset, autoFollow, fps, isDraggingRef);
    return <TrackLayer trackPoints={trackPoints} currentPosition={currentMapPos ?? [0,0,0]} autoFollow={autoFollow} onSeek={onSeek} />;
}

// ---------- MAIN COMPONENT ----------

const ControlPanelWithKMZ = ({ darkMode }) => {
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [timeOffset, setTimeOffset] = useState(0);
  const [autoFollow, setAutoFollow] = useState(true);
  const [deduplicate, setDeduplicate] = useState(2);
  const [smoothWindow, setSmoothWindow] = useState(3);
  const [processedFolder, setProcessedFolder] = useState("");
  const [exportFile, setExportFile] = useState("exported_track.csv");

  const [videoFile, setVideoFile] = useState(null);
  const [srtFile, setSrtFile] = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [currentMapPos, setCurrentMapPos] = useState([21.1458, 79.0882, 0]);
  const [markers] = useState([]);
  const [kmzLayer, setKmzLayer] = useState({ kmlContent: null, zip: null, baseDir: "", isActive: false, fileName: null });

  const videoRef = useRef(null);
  const isDraggingRef = useRef(false);
  const fileRefs = useRef({});
  const rafId = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof darkMode === "boolean") return darkMode;
    return document.body.classList.contains("dark-mode");
  });

  useEffect(() => {
    if (typeof darkMode === "boolean") {
      setIsDarkMode(darkMode);
      return;
    }
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains("dark-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [darkMode]);

  // UI Sync Logic (Text Stats only - Map handles its own movement via props)
  const updateUIText = useCallback((time, points) => {
    if (isDraggingRef.current) return;
    const tAdj = time + Number(timeOffset);
    const pos = interpPosition(tAdj, points);
    if (pos) setCurrentMapPos([pos.lat, pos.lng, tAdj]);
    else setCurrentMapPos((prev) => (prev ? [prev[0], prev[1], tAdj] : [0, 0, tAdj]));
  }, [timeOffset]);

  const loopRAF = useCallback(() => {
    if (videoRef.current) updateUIText(videoRef.current.currentTime || 0, trackPoints);
    rafId.current = requestAnimationFrame(loopRAF);
  }, [updateUIText, trackPoints]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const startRAF = () => { if (rafId.current === null) rafId.current = requestAnimationFrame(loopRAF); };
    const stopRAF = () => { if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null; } };
    videoEl.addEventListener("play", startRAF);
    videoEl.addEventListener("pause", stopRAF);
    return () => {
      stopRAF();
      videoEl.removeEventListener("play", startRAF);
      videoEl.removeEventListener("pause", stopRAF);
    };
  }, [loopRAF]);

  const themeColors = useMemo(() => isDarkMode ? {
    bg: "#161622",
    panelBg: "#1e1e2d",
    cardBg: "#252538",
    inputBg: "#161622",
    border: "#2a2a3e",
    borderLight: "#363650",
    textMain: "#f3f4f6",
    textSub: "#9ca3af",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    secondaryBtn: "#334155",
    success: "#10b981",
    danger: "#ef4444",
  } : {
    bg: "#f1f5f9",
    panelBg: "#ffffff",
    cardBg: "#f8fafc",
    inputBg: "#ffffff",
    border: "#e2e8f0",
    borderLight: "#cbd5e1",
    textMain: "#1e293b",
    textSub: "#64748b",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    secondaryBtn: "#64748b",
    success: "#10b981",
    danger: "#ef4444",
  }, [isDarkMode]);

  const styles = useMemo(() => ({
    container: {
      height: "calc(100vh - 64px)",
      width: "100%",
      display: "flex",
      backgroundColor: themeColors.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden",
      color: themeColors.textMain,
    },
    leftPanel: {
      width: "70%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      borderRight: `1px solid ${themeColors.border}`,
      transition: "width 0.3s ease",
    },
    mapWrapper: {
      flex: 1,
      position: "relative",
      zIndex: 0,
      minHeight: 0,
    },
    commandDeck: {
      height: "240px",
      backgroundColor: themeColors.panelBg,
      borderTop: `1px solid ${themeColors.border}`,
      padding: "16px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gap: "16px",
      boxShadow: isDarkMode ? "0 -4px 20px rgba(0,0,0,0.3)" : "0 -4px 20px rgba(0,0,0,0.03)",
      zIndex: 10,
      overflowY: "auto",
    },
    rightPanel: {
      width: "30%",
      height: "100%",
      backgroundColor: themeColors.panelBg,
      display: "flex",
      flexDirection: "column",
      padding: "20px",
      gap: "16px",
      boxShadow: isDarkMode ? "-4px 0 20px rgba(0,0,0,0.3)" : "-4px 0 20px rgba(0,0,0,0.03)",
      overflowY: "auto",
      transition: "width 0.3s ease",
    },
    card: {
      backgroundColor: themeColors.cardBg,
      borderRadius: "10px",
      padding: "12px",
      border: `1px solid ${themeColors.border}`,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 4px rgba(0,0,0,0.02)",
    },
    cardHeader: {
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: themeColors.textSub,
      marginBottom: "4px",
      borderBottom: `1px solid ${themeColors.border}`,
      paddingBottom: "6px",
    },
    inputGroup: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" },
    input: {
      width: "100%",
      padding: "6px 10px",
      borderRadius: "6px",
      border: `1px solid ${themeColors.border}`,
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      backgroundColor: themeColors.inputBg,
      color: themeColors.textMain,
    },
    btn: {
      width: "100%",
      padding: "8px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      color: "white",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
    },
    uploadRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "12px",
      padding: "6px 8px",
      backgroundColor: themeColors.inputBg,
      borderRadius: "4px",
      border: `1px solid ${themeColors.border}`,
      color: themeColors.textMain,
    },
    statusDot: (active) => ({
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: active ? themeColors.success : (isDarkMode ? "#4b5563" : "#cbd5e1"),
    }),
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
    statCard: {
      backgroundColor: themeColors.cardBg,
      border: `1px solid ${themeColors.border}`,
      borderRadius: "10px",
      padding: "12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 4px rgba(0,0,0,0.02)",
    },
    statLabel: { fontSize: "11px", color: themeColors.textSub, marginBottom: "4px" },
    statValue: { fontSize: "15px", fontWeight: "700", color: isDarkMode ? "#60a5fa" : themeColors.textMain, fontFamily: "monospace" },
    videoWrapper: {
      borderRadius: "12px",
      overflow: "hidden",
      backgroundColor: "#000",
      boxShadow: isDarkMode ? "0 4px 15px rgba(0,0,0,0.4)" : "0 4px 15px rgba(0,0,0,0.15)",
      position: "relative",
      width: "100%",
      paddingTop: "56.25%",
    },
    videoPlayer: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
    floatingControls: { position: "absolute", top: "20px", left: "20px", zIndex: 1000, display: "flex", flexDirection: "column", gap: "8px" },
    iconBtn: {
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      backgroundColor: isDarkMode ? "#1e1e2d" : "white",
      border: `1px solid ${themeColors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 6px rgba(0,0,0,0.05)",
      color: themeColors.textMain,
    },
  }), [themeColors, isDarkMode]);

  // Handlers
  const onUploadChange = (e, label, setter) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (label === "KMZ") handleKMZFile(f); else if (label === "CSV") handleCSVFile(f); else setter(f);
    if (label === "Video" && f) setProcessedFolder(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleCSVFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSVText(e.target.result, fps);
        setTrackPoints(parsed); 
        setVideoFile(null); 
        
        // --- AUTO JUMP TO CSV START ---
        if (parsed.length > 0) {
            const start = parsed[0];
            setCurrentMapPos([start.lat, start.lng, start.time]);
            // Force fit logic via window or state triggers
            setTimeout(() => { if (window.fitBounds) window.fitBounds(); }, 200);
        }
        alert(`Loaded ${parsed.length} waypoints.`);
      } catch (error) { alert("Error parsing CSV."); }
    };
    reader.readAsText(file);
  };

  const handleKMZFile = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (file.name.toLowerCase().endsWith(".kmz")) {
            const zip = await JSZip.loadAsync(ev.target.result);
            const kmls = await loadKmlFiles(zip, "doc.kml");
            if(kmls.length) setKmzLayer({ kmlContent: kmls[0].kmlText, zip, baseDir: kmls[0].basePath, isActive: true, fileName: file.name });
            else {
                let found = false;
                zip.forEach(async (path)=>{ if(!found && path.endsWith(".kml")) { found=true; const fb=await loadKmlFiles(zip,path); if(fb.length) setKmzLayer({ kmlContent: fb[0].kmlText, zip, baseDir: fb[0].basePath, isActive: true, fileName: file.name }); } })
            }
        } else {
            const text = new TextDecoder().decode(ev.target.result);
            setKmzLayer({ kmlContent: text, zip: null, baseDir: "", isActive: true, fileName: file.name });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch(err) { alert("KMZ Error: "+err); }
  };

  const handleCreateCsv = async () => {
      if(videoFile && srtFile) {
          if(!processedFolder) return alert("Name required");
          if(!window.confirm(`Upload to server?`)) return;
          try { await handleLoadServerTrack(processedFolder); } catch(e){alert(e.message);}
          return;
      }
      if(trackPoints.length){
          const res = createCsvFromWaypoints(trackPoints, {fps, dedupeMeters: deduplicate, smoothWindow, filename: exportFile});
          if(!res) return;
          const blob = new Blob([res.csvText], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = res.filename; a.click();
          try {
              await fetch('/api/save_csv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({folder: processedFolder, filename: exportFile, csvText: res.csvText})});
              alert("Saved on Server");
          } catch(e) { /* Local save is fine */ }
      }
  };

  const handleLoadServerTrack = async (folder) => {
      const fName = folder || processedFolder || prompt("Folder?");
      if(!fName) return;
      try {
          const res = await fetch(`/api/track?folder=${encodeURIComponent(fName)}`);
          if(!res.ok) throw new Error("HTTP "+res.status);
          const data = await res.json();
          if(data.error) throw new Error(data.error);
          const waypoints = (data.track||[]).map(p=>({time: Number(p.time), lat: Number(p.lat||p.latitude), lng: Number(p.lng||p.longitude), alt: Number(p.altitude)}));
          waypoints.sort((a,b)=>a.time-b.time);
          setTrackPoints(waypoints); setFps(Number(data.fps)||DEFAULT_FPS); setProcessedFolder(fName);
          if(data.video) { videoRef.current.src = data.video; setVideoFile({name: `output_${fName}.mp4`}); }
          
          if(waypoints.length > 0) {
              const start = waypoints[0];
              setCurrentMapPos([start.lat, start.lng, start.time]);
              setTimeout(() => { if (window.fitBounds) window.fitBounds(); }, 200);
          }
          alert(`Loaded ${waypoints.length} points`);
      } catch(e){ alert("Load Error: "+e.message); }
  };

  // Icons
  const IconMap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
  const IconPlay = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>;

  return (
    <div style={styles.container} className="responsive-tracker-container">
      <style>{`
        @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        input:focus { border-color: ${themeColors.primary} !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        .responsive-tracker-container { flex-direction: row; }
        .left-panel-class { width: 70%; height: 100%; }
        .right-panel-class { width: 30%; height: 100%; }
        @media (max-width: 1100px) {
            .responsive-tracker-container { flex-direction: column !important; overflow-y: auto !important; }
            .left-panel-class { width: 100% !important; height: 60vh !important; min-height: 400px; border-right: none !important; border-bottom: 1px solid ${themeColors.border}; }
            .right-panel-class { width: 100% !important; height: auto !important; min-height: 40vh; }
        }
      `}</style>

      <div style={styles.leftPanel} className="left-panel-class">
        <div style={styles.mapWrapper}>
            <div style={styles.floatingControls}>
                 <button title="Fit Track" style={styles.iconBtn} onClick={() => window.fitBounds && window.fitBounds()}><IconMap /></button>
                 <button title="Center Start" style={styles.iconBtn} onClick={() => window.centerOnFirst && window.centerOnFirst()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
            <MapView 
                trackPoints={trackPoints} 
                currentMapPos={currentMapPos} 
                markers={markers} 
                kmzLayer={kmzLayer} 
                autoFollow={autoFollow} 
                timeOffset={timeOffset} 
                fps={fps} 
                videoRef={videoRef} 
                isDraggingRef={isDraggingRef} 
            />
        </div>

        <div style={styles.commandDeck}>
             <div style={styles.card}>
                <div style={styles.cardHeader}>Config</div>
                <div style={styles.inputGroup}><label style={{width:'40px'}}>FPS</label><input type="number" style={styles.input} value={fps} onChange={e=>setFps(Number(e.target.value))} /></div>
                <div style={styles.inputGroup}><label style={{width:'40px'}}>Off</label><input type="number" style={styles.input} value={timeOffset} onChange={e=>setTimeOffset(Number(e.target.value))} /></div>
                <div style={{fontSize:'11px', display:'flex', alignItems:'center', gap:'5px'}}><input type="checkbox" checked={autoFollow} onChange={e=>setAutoFollow(e.target.checked)} /> Follow</div>
             </div>
             <div style={styles.card}>
                <div style={styles.cardHeader}>Files</div>
                <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                    <div style={styles.uploadRow}><span>Video</span><div style={{display:'flex', gap:'4px'}}><div style={styles.statusDot(!!videoFile)}></div><button onClick={()=>fileRefs.current.Video.click()} style={{cursor:'pointer',border:`1px solid ${themeColors.border}`,backgroundColor:styles.card.backgroundColor,color:themeColors.textMain,borderRadius:'3px'}}>+</button></div></div>
                    <div style={styles.uploadRow}><span>SRT</span><div style={{display:'flex', gap:'4px'}}><div style={styles.statusDot(kmzLayer.isActive)}></div><button onClick={()=>fileRefs.current.KMZ.click()} style={{cursor:'pointer',border:`1px solid ${themeColors.border}`,backgroundColor:styles.card.backgroundColor,color:themeColors.textMain,borderRadius:'3px'}}>+</button></div></div>
                    <div style={styles.uploadRow}><span>CSV</span><div style={{display:'flex', gap:'4px'}}><div style={styles.statusDot(trackPoints.length>0)}></div><button onClick={()=>fileRefs.current.CSV.click()} style={{cursor:'pointer',border:`1px solid ${themeColors.border}`,backgroundColor:styles.card.backgroundColor,color:themeColors.textMain,borderRadius:'3px'}}>+</button></div></div>
                    <div style={styles.uploadRow}><span>KMZ</span><div style={{display:'flex', gap:'4px'}}><div style={styles.statusDot(kmzLayer.isActive)}></div><button onClick={()=>fileRefs.current.KMZ.click()} style={{cursor:'pointer',border:`1px solid ${themeColors.border}`,backgroundColor:styles.card.backgroundColor,color:themeColors.textMain,borderRadius:'3px'}}>+</button></div></div>
                </div>
                <input type="file" hidden ref={el=>fileRefs.current.Video=el} accept="video/*" onChange={e=>onUploadChange(e,'Video',setVideoFile)} />
                <input type="file" hidden ref={el=>fileRefs.current.SRT=el} accept=".srt" onChange={e=>onUploadChange(e,'SRT',setSrtFile)} />
                <input type="file" hidden ref={el=>fileRefs.current.CSV=el} accept=".csv" onChange={e=>onUploadChange(e,'CSV')} />
                <input type="file" hidden ref={el=>fileRefs.current.KMZ=el} accept=".kmz,.kml" onChange={e=>onUploadChange(e,'KMZ',handleKMZFile)} />
             </div>
             <div style={styles.card}>
                <div style={styles.cardHeader}>Process</div>
                <div style={styles.inputGroup}><input type="number" placeholder="Dedup" style={styles.input} value={deduplicate} onChange={e=>setDeduplicate(e.target.value)} /></div>
                <div style={styles.inputGroup}><input type="number" placeholder="Smooth" style={styles.input} value={smoothWindow} onChange={e=>setSmoothWindow(e.target.value)} /></div>
                <button style={{...styles.btn, backgroundColor: themeColors.primary}} onClick={handleCreateCsv}><IconPlay/> Run</button>
             </div>
             <div style={styles.card}>
                <div style={styles.cardHeader}>Export</div>
                <input type="text" placeholder="Folder" style={styles.input} value={processedFolder} onChange={e=>setProcessedFolder(e.target.value)} />
                <input type="text" placeholder="File.csv" style={styles.input} value={exportFile} onChange={e=>setExportFile(e.target.value)} />
                <button style={{...styles.btn, backgroundColor: '#64748b'}} onClick={()=>handleLoadServerTrack()}>Load Server</button>
             </div>
        </div>
      </div>

      <div style={styles.rightPanel} className="right-panel-class">
         <h3 style={{margin:0, fontSize:'14px', color: themeColors.primary, display:'flex', alignItems:'center', gap:'8px'}}>Stats</h3>
         <div style={styles.statGrid}>
            <div style={styles.statCard}><span style={styles.statLabel}>LAT</span><span style={styles.statValue}>{currentMapPos[0].toFixed(5)}</span></div>
            <div style={styles.statCard}><span style={styles.statLabel}>LNG</span><span style={styles.statValue}>{currentMapPos[1].toFixed(5)}</span></div>
            <div style={styles.statCard}><span style={styles.statLabel}>TIME</span><span style={styles.statValue}>{(currentMapPos[2]||0).toFixed(1)}s</span></div>
            <div style={styles.statCard}><span style={styles.statLabel}>PTS</span><span style={styles.statValue}>{trackPoints.length}</span></div>
         </div>
         <div style={styles.videoWrapper}>
            <video ref={videoRef} controls preload="auto" src={videoFile ? URL.createObjectURL(videoFile) : ""} style={styles.videoPlayer} />
         </div>
         <div style={{fontSize:'11px', textAlign:'center', color: themeColors.textSub}}>{videoFile ? videoFile.name : "No Video"}</div>
         <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${currentMapPos[0]},${currentMapPos[1]}`, "_blank")} style={{...styles.btn, backgroundColor: isDarkMode ? '#2563eb' : themeColors.textMain}}>Open Google Maps</button>
      </div>
    </div>
  );
};

export default ControlPanelWithKMZ;
