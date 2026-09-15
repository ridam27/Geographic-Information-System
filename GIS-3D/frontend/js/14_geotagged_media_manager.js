/* eslint-disable no-undef */
/**
 * 14_geotagged_media_manager.js
 * 
 * Modular Geotagged Survey Data Integration:
 * - Dynamic GPX parser & survey track visualizer
 * - Dynamic Photo JSON parser & camera marker billboard visualizer
 * - Dynamic Video JSON parser & video/play marker billboard visualizer
 * - Independent layer toggles for Photos & Videos with CustomDataSources
 * - Layout-specific association (Manish Nagar)
 * - Interactive media modal viewers (High-res photo lightbox & HTML5 video player)
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // 1. CONFIGURATION & FILE PATH RESOLUTION
  // ─────────────────────────────────────────────────────────────
  window.LAYOUT_SURVEY_CONFIG = window.LAYOUT_SURVEY_CONFIG || {
    manishnagar: {
      id: "manishnagar",
      label: "Manish Nagar",
      // Configurable paths: can be relative paths, local server routes, or absolute URLs
      gpxUrl: "data/manish_nagar/manish_nagar.gpx",
      photosJsonUrl: "data/manish_nagar/photos.json",
      videosJsonUrl: "data/manish_nagar/videos.json",
      photosBaseUrl: "data/manish_nagar/",
      videosBaseUrl: "data/manish_nagar/",
      // Default camera view for survey center
      center: {
        longitude: 79.097290,
        latitude: 21.102300,
        height: 600
      }
    }
  };

  // State management
  const surveyMediaState = {
    activeLayoutId: "manishnagar", // Default active layout
    photosVisible: false,
    videosVisible: false,
    gpxVisible: true,
    loadedLayouts: {}, // Cache of loaded datasets per layout
    photoDataSource: null,
    videoDataSource: null,
    gpxDataSource: null,
    activeMedia: null
  };

  // ─────────────────────────────────────────────────────────────
  // 2. PIN ICONS (High-DPI SVG Billboards)
  // ─────────────────────────────────────────────────────────────
  // Camera Pin for Photos: Luminous Cyan/Teal (#06b6d4 / #0284c7)
  const PHOTO_PIN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>
      </filter>
      <linearGradient id="photoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
    </defs>
    <g filter="url(#shadow)">
      <!-- Pin background shape -->
      <path d="M24 2 C13 2 4 11 4 22 C4 35 21 52 24 55 C27 52 44 35 44 22 C44 11 35 2 24 2 Z" fill="url(#photoGrad)" stroke="#ffffff" stroke-width="2.5" />
      <!-- Inner circular badge -->
      <circle cx="24" cy="22" r="14" fill="#0f172a" opacity="0.4" />
      <!-- Camera Icon -->
      <g transform="translate(13, 11) scale(0.9)" fill="#ffffff">
        <path d="M4 7 H7 L8.5 4.5 C8.8 4 9.4 3.7 10 3.7 H14 C14.6 3.7 15.2 4 15.5 4.5 L17 7 H20 C21.1 7 22 7.9 22 9 V19 C22 20.1 21.1 21 20 21 H4 C2.9 21 2 20.1 2 19 V9 C2 7.9 2.9 7 4 7 Z M12 18 C14.76 18 17 15.76 17 13 C17 10.24 14.76 8 12 8 C9.24 8 7 10.24 7 13 C7 15.76 9.24 18 12 18 Z M12 16 C10.34 16 9 14.66 9 13 C9 11.34 10.34 10 12 10 C13.66 10 15 11.34 15 13 C15 14.66 13.66 16 12 16 Z"/>
      </g>
    </g>
  </svg>
  `)}`;

  // Video/Play Pin for Videos: Luminous Rose/Crimson (#f43f5e / #e11d48)
  const VIDEO_PIN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58">
    <defs>
      <filter id="shadowV" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>
      </filter>
      <linearGradient id="videoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f43f5e" />
        <stop offset="100%" stop-color="#be123c" />
      </linearGradient>
    </defs>
    <g filter="url(#shadowV)">
      <!-- Pin background shape -->
      <path d="M24 2 C13 2 4 11 4 22 C4 35 21 52 24 55 C27 52 44 35 44 22 C44 11 35 2 24 2 Z" fill="url(#videoGrad)" stroke="#ffffff" stroke-width="2.5" />
      <!-- Inner circular badge -->
      <circle cx="24" cy="22" r="14" fill="#0f172a" opacity="0.4" />
      <!-- Video Camcorder / Play Icon -->
      <g transform="translate(14, 12) scale(0.9)" fill="#ffffff">
        <path d="M4 6 C2.9 6 2 6.9 2 8 V16 C2 17.1 2.9 18 4 18 H14 C15.1 18 16 17.1 16 16 V13.5 L19.7 16.3 C20.3 16.8 21.2 16.3 21.2 15.5 V8.5 C21.2 7.7 20.3 7.2 19.7 7.7 L16 10.5 V8 C16 6.9 15.1 6 14 6 H4 Z M9 10 L13 12 L9 14 V10 Z"/>
      </g>
    </g>
  </svg>
  `)}`;

  // ─────────────────────────────────────────────────────────────
  // 3. INITIALIZE CESIUM DATA SOURCES
  // ─────────────────────────────────────────────────────────────
  function initDataSources() {
    if (typeof viewer === "undefined" || !viewer) {
      console.warn("MediaManager: Cesium viewer not yet ready. Will retry.");
      setTimeout(initDataSources, 200);
      return;
    }

    if (!surveyMediaState.photoDataSource) {
      surveyMediaState.photoDataSource = new Cesium.CustomDataSource("survey_photos");
      surveyMediaState.photoDataSource.show = surveyMediaState.photosVisible;
      viewer.dataSources.add(surveyMediaState.photoDataSource);
    }

    if (!surveyMediaState.videoDataSource) {
      surveyMediaState.videoDataSource = new Cesium.CustomDataSource("survey_videos");
      surveyMediaState.videoDataSource.show = surveyMediaState.videosVisible;
      viewer.dataSources.add(surveyMediaState.videoDataSource);
    }

    if (!surveyMediaState.gpxDataSource) {
      surveyMediaState.gpxDataSource = new Cesium.CustomDataSource("survey_gpx");
      surveyMediaState.gpxDataSource.show = surveyMediaState.gpxVisible;
      viewer.dataSources.add(surveyMediaState.gpxDataSource);
    }

    // Check initial UI checkbox states if already present in DOM
    const photoCb = document.getElementById("photosToggle");
    if (photoCb) {
      surveyMediaState.photosVisible = photoCb.checked;
      surveyMediaState.photoDataSource.show = photoCb.checked;
    }

    const videoCb = document.getElementById("videosToggle");
    if (videoCb) {
      surveyMediaState.videosVisible = videoCb.checked;
      surveyMediaState.videoDataSource.show = videoCb.checked;
    }

    // Always pre-load Manish Nagar survey data so it's ready immediately
    loadLayoutSurveyData("manishnagar");
  }

  // ─────────────────────────────────────────────────────────────
  // 4. URL RESOLUTION HELPER
  // ─────────────────────────────────────────────────────────────
  function resolveMediaUrl(rawPath, baseDir) {
    if (!rawPath) return "";
    const cleanPath = String(rawPath).trim();

    // If already absolute HTTP(S) URL or Data URL
    if (/^(https?:|\/\/|data:[^/]|blob:)/i.test(cleanPath)) {
      return cleanPath;
    }

    // If Windows path like D:\... or C:\..., strip drive and normalize slashes
    let normalized = cleanPath.replace(/^[a-zA-Z]:[\\/]/, "").replace(/\\/g, "/");

    // If path already starts with data/ or /data/ or frontend/, do not prepend baseDir
    if (normalized.startsWith("data/") || normalized.startsWith("./data/") || normalized.startsWith("/data/") || normalized.startsWith("frontend/")) {
      return normalized;
    }

    // If baseDir provided and path is relative
    if (baseDir && !normalized.startsWith("/") && !normalized.startsWith("./")) {
      const normalizedBase = baseDir.endsWith("/") ? baseDir : baseDir + "/";
      return normalizedBase + normalized;
    }

    return normalized;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. GPX PARSER & INTEGRATION
  // ─────────────────────────────────────────────────────────────
  async function loadGPX(url, layoutId) {
    if (!url) return null;
    try {
      console.log(`[GPX] Fetching survey GPX track from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      const gpxText = await response.text();
      return parseAndRenderGPX(gpxText, layoutId);
    } catch (err) {
      console.warn(`[GPX] Notice: Could not load GPX from ${url} (${err.message}). If file is not yet placed, upload or configure path.`);
      return null;
    }
  }

  function parseAndRenderGPX(xmlText, layoutId) {
    if (!xmlText || typeof DOMParser === "undefined") return null;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        console.error("[GPX] XML Parse Error:", parseError[0].textContent);
        return null;
      }

      const tracks = [];
      const waypoints = [];

      // 1. Extract Tracks (<trk>)
      const trkElements = xmlDoc.getElementsByTagName("trk");
      for (let i = 0; i < trkElements.length; i++) {
        const trk = trkElements[i];
        const nameEl = trk.getElementsByTagName("name")[0];
        const trackName = nameEl ? nameEl.textContent : `Survey Track ${i + 1}`;

        const trkpts = trk.getElementsByTagName("trkpt");
        const coordinates = [];
        const trackPoints = [];

        for (let j = 0; j < trkpts.length; j++) {
          const pt = trkpts[j];
          const lat = parseFloat(pt.getAttribute("lat"));
          const lon = parseFloat(pt.getAttribute("lon"));
          const eleEl = pt.getElementsByTagName("ele")[0];
          const ele = eleEl ? parseFloat(eleEl.textContent) : 0;
          const timeEl = pt.getElementsByTagName("time")[0];
          const time = timeEl ? timeEl.textContent : null;

          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates.push(lon, lat, ele);
            trackPoints.push({ lat, lon, ele, time });
          }
        }

        if (coordinates.length >= 6) { // At least 2 Cartesian points (lon, lat, ele)
          tracks.push({
            name: trackName,
            coordinates: Cesium.Cartesian3.fromDegreesArrayHeights(coordinates),
            points: trackPoints
          });
        }
      }

      // Fallback: If no <trk>, check for <rte> (Routes)
      if (tracks.length === 0) {
        const rteElements = xmlDoc.getElementsByTagName("rte");
        for (let i = 0; i < rteElements.length; i++) {
          const rte = rteElements[i];
          const rtepts = rte.getElementsByTagName("rtept");
          const coordinates = [];
          for (let j = 0; j < rtepts.length; j++) {
            const pt = rtepts[j];
            const lat = parseFloat(pt.getAttribute("lat"));
            const lon = parseFloat(pt.getAttribute("lon"));
            const eleEl = pt.getElementsByTagName("ele")[0];
            const ele = eleEl ? parseFloat(eleEl.textContent) : 0;
            if (!isNaN(lat) && !isNaN(lon)) {
              coordinates.push(lon, lat, ele);
            }
          }
          if (coordinates.length >= 6) {
            tracks.push({
              name: `Survey Route ${i + 1}`,
              coordinates: Cesium.Cartesian3.fromDegreesArrayHeights(coordinates)
            });
          }
        }
      }

      // 2. Extract Waypoints (<wpt>)
      const wptElements = xmlDoc.getElementsByTagName("wpt");
      for (let i = 0; i < wptElements.length; i++) {
        const wpt = wptElements[i];
        const lat = parseFloat(wpt.getAttribute("lat"));
        const lon = parseFloat(wpt.getAttribute("lon"));
        const nameEl = wpt.getElementsByTagName("name")[0];
        const descEl = wpt.getElementsByTagName("desc")[0];

        if (!isNaN(lat) && !isNaN(lon)) {
          waypoints.push({
            lat,
            lon,
            name: nameEl ? nameEl.textContent : `WPT-${i + 1}`,
            description: descEl ? descEl.textContent : ""
          });
        }
      }

      // 3. Render into GPX DataSource
      if (surveyMediaState.gpxDataSource) {
        // Clear any old entities with matching layout
        const toRemove = [];
        surveyMediaState.gpxDataSource.entities.values.forEach(e => {
          if (e._layoutId === layoutId) toRemove.push(e);
        });
        toRemove.forEach(e => surveyMediaState.gpxDataSource.entities.remove(e));

        // Add track polylines
        tracks.forEach((track, idx) => {
          const polylineEntity = surveyMediaState.gpxDataSource.entities.add({
            name: `GPX: ${track.name}`,
            polyline: {
              positions: track.coordinates,
              width: 5,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.25,
                color: Cesium.Color.fromCssColorString("#06b6d4").withAlpha(0.9)
              }),
              clampToGround: true
            },
            properties: {
              type: "gpx_track",
              layoutId: layoutId,
              trackIndex: idx,
              pointCount: track.points?.length || 0
            }
          });
          polylineEntity._layoutId = layoutId;
        });

        // Add waypoint pins
        waypoints.forEach(wpt => {
          const wptEntity = surveyMediaState.gpxDataSource.entities.add({
            name: wpt.name,
            position: Cesium.Cartesian3.fromDegrees(wpt.lon, wpt.lat, 0),
            billboard: {
              image: typeof pinBuilder !== "undefined" ? pinBuilder.fromText("W", Cesium.Color.ROYALBLUE, 36).toDataURL() : PHOTO_PIN_SVG,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              scale: 0.85
            },
            description: wpt.description,
            properties: {
              type: "gpx_waypoint",
              layoutId: layoutId,
              ...wpt
            }
          });
          wptEntity._layoutId = layoutId;
        });

        console.log(`[GPX] Rendered ${tracks.length} tracks and ${waypoints.length} waypoints for layout ${layoutId}.`);
      }

      return { tracks, waypoints };
    } catch (err) {
      console.error("[GPX] Parsing error:", err);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. PHOTO JSON PARSER & MARKERS CREATOR
  // ─────────────────────────────────────────────────────────────
  async function loadPhotoJSON(url, layoutId, baseDir) {
    if (!url) return [];
    try {
      console.log(`[Photos] Fetching photo metadata JSON from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      return createPhotoMarkers(data, layoutId, baseDir);
    } catch (err) {
      console.warn(`[Photos] Notice: Could not load photo JSON from ${url} (${err.message}).`);
      updateLayerStatusBadge("photos", 0, "Not Loaded");
      return [];
    }
  }

  function extractCoordinateField(obj, candidates) {
    for (const key of candidates) {
      if (obj[key] !== undefined && obj[key] !== null && !isNaN(parseFloat(obj[key]))) {
        return parseFloat(obj[key]);
      }
    }
    return null;
  }

  function extractStringField(obj, candidates) {
    for (const key of candidates) {
      if (obj[key] && typeof obj[key] === "string" && obj[key].trim() !== "") {
        return obj[key].trim();
      }
    }
    return "";
  }

  function createPhotoMarkers(rawData, layoutId, baseDir) {
    if (!rawData) return [];

    let items = [];
    if (Array.isArray(rawData)) {
      items = rawData;
    } else if (Array.isArray(rawData.photos)) {
      items = rawData.photos;
    } else if (Array.isArray(rawData.images)) {
      items = rawData.images;
    } else if (Array.isArray(rawData.features)) {
      // GeoJSON FeatureCollection
      items = rawData.features.map(f => {
        const coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [0, 0];
        return {
          lon: coords[0],
          lat: coords[1],
          alt: coords[2] || 0,
          ...(f.properties || {})
        };
      });
    }

    if (!surveyMediaState.photoDataSource) return [];

    // Clear previous entities for this layout
    const toRemove = [];
    surveyMediaState.photoDataSource.entities.values.forEach(e => {
      if (e._layoutId === layoutId) toRemove.push(e);
    });
    toRemove.forEach(e => surveyMediaState.photoDataSource.entities.remove(e));

    const validPhotoEntities = [];

    items.forEach((item, index) => {
      const lat = extractCoordinateField(item, ["latitude", "lat", "LATITUDE", "Lat", "y", "Y"]);
      const lon = extractCoordinateField(item, ["longitude", "lon", "lng", "LONGITUDE", "Lon", "Lng", "x", "X"]);
      const alt = extractCoordinateField(item, ["altitude", "alt", "height", "ele", "z", "Z"]) || 0;

      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        console.warn(`[Photos] Skipping photo record #${index + 1}: invalid or missing coordinates`, item);
        return;
      }

      const rawPhotoPath = extractStringField(item, ["photo", "url", "path", "image", "src", "file", "photoUrl", "filePath", "filename"]);
      const resolvedPhotoUrl = resolveMediaUrl(rawPhotoPath, baseDir);
      const filename = extractStringField(item, ["filename", "name", "title", "id"]) || (rawPhotoPath ? rawPhotoPath.split(/[/\\]/).pop() : `Photo_${index + 1}.jpg`);
      const timestamp = extractStringField(item, ["timestamp", "date", "time", "dateTime", "created_at"]);
      const description = extractStringField(item, ["description", "desc", "caption", "notes"]);

      const photoRecord = {
        id: item.id || `photo_${layoutId}_${index + 1}`,
        type: "geotagged_photo",
        layoutId: layoutId,
        index: index,
        filename: filename,
        photoUrl: resolvedPhotoUrl,
        rawPath: rawPhotoPath,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        timestamp: timestamp,
        description: description,
        rawMetadata: item
      };

      const entity = surveyMediaState.photoDataSource.entities.add({
        id: `geotagged_photo_${layoutId}_${index}_${Date.now()}`,
        name: `📷 ${filename}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        billboard: {
          image: PHOTO_PIN_SVG,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scale: 0.85,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.1, 8.0e4, 0.45),
          disableDepthTestDistance: Number.POSITIVE_INFINITY // Always render crisp on top of terrain/mesh
        },
        properties: photoRecord
      });

      entity._layoutId = layoutId;
      entity._mediaType = "photo";
      entity._mediaData = photoRecord;

      validPhotoEntities.push(entity);
    });

    console.log(`[Photos] Loaded & created ${validPhotoEntities.length} photo markers for layout ${layoutId}.`);
    updateLayerStatusBadge("photos", validPhotoEntities.length, `${validPhotoEntities.length} loaded`);
    return validPhotoEntities;
  }

  // ─────────────────────────────────────────────────────────────
  // 7. VIDEO JSON PARSER & MARKERS CREATOR
  // ─────────────────────────────────────────────────────────────
  async function loadVideoJSON(url, layoutId, baseDir) {
    if (!url) return [];
    try {
      console.log(`[Videos] Fetching video metadata JSON from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      return createVideoMarkers(data, layoutId, baseDir);
    } catch (err) {
      console.warn(`[Videos] Notice: Could not load video JSON from ${url} (${err.message}).`);
      updateLayerStatusBadge("videos", 0, "Not Loaded");
      return [];
    }
  }

  function createVideoMarkers(rawData, layoutId, baseDir) {
    if (!rawData) return [];

    let items = [];
    if (Array.isArray(rawData)) {
      items = rawData;
    } else if (Array.isArray(rawData.videos)) {
      items = rawData.videos;
    } else if (Array.isArray(rawData.clips)) {
      items = rawData.clips;
    } else if (Array.isArray(rawData.features)) {
      // GeoJSON FeatureCollection
      items = rawData.features.map(f => {
        const coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [0, 0];
        return {
          lon: coords[0],
          lat: coords[1],
          alt: coords[2] || 0,
          ...(f.properties || {})
        };
      });
    }

    if (!surveyMediaState.videoDataSource) return [];

    // Clear previous entities for this layout
    const toRemove = [];
    surveyMediaState.videoDataSource.entities.values.forEach(e => {
      if (e._layoutId === layoutId) toRemove.push(e);
    });
    toRemove.forEach(e => surveyMediaState.videoDataSource.entities.remove(e));

    const validVideoEntities = [];

    items.forEach((item, index) => {
      const lat = extractCoordinateField(item, ["latitude", "lat", "LATITUDE", "Lat", "y", "Y"]);
      const lon = extractCoordinateField(item, ["longitude", "lon", "lng", "LONGITUDE", "Lon", "Lng", "x", "X"]);
      const alt = extractCoordinateField(item, ["altitude", "alt", "height", "ele", "z", "Z"]) || 0;

      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        console.warn(`[Videos] Skipping video record #${index + 1}: invalid or missing coordinates`, item);
        return;
      }

      const rawVideoPath = extractStringField(item, ["video", "url", "path", "src", "file", "videoUrl", "filePath", "filename"]);
      const resolvedVideoUrl = resolveMediaUrl(rawVideoPath, baseDir);
      const filename = extractStringField(item, ["filename", "name", "title", "id"]) || (rawVideoPath ? rawVideoPath.split(/[/\\]/).pop() : `Video_${index + 1}.mp4`);
      const timestamp = extractStringField(item, ["timestamp", "date", "time", "dateTime", "created_at"]);
      const description = extractStringField(item, ["description", "desc", "caption", "notes"]);
      const duration = extractStringField(item, ["duration", "length"]);

      const videoRecord = {
        id: item.id || `video_${layoutId}_${index + 1}`,
        type: "geotagged_video",
        layoutId: layoutId,
        index: index,
        filename: filename,
        videoUrl: resolvedVideoUrl,
        rawPath: rawVideoPath,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        timestamp: timestamp,
        description: description,
        duration: duration,
        rawMetadata: item
      };

      const entity = surveyMediaState.videoDataSource.entities.add({
        id: `geotagged_video_${layoutId}_${index}_${Date.now()}`,
        name: `🎥 ${filename}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        billboard: {
          image: VIDEO_PIN_SVG,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scale: 0.85,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.1, 8.0e4, 0.45),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        properties: videoRecord
      });

      entity._layoutId = layoutId;
      entity._mediaType = "video";
      entity._mediaData = videoRecord;

      validVideoEntities.push(entity);
    });

    console.log(`[Videos] Loaded & created ${validVideoEntities.length} video markers for layout ${layoutId}.`);
    updateLayerStatusBadge("videos", validVideoEntities.length, `${validVideoEntities.length} loaded`);
    return validVideoEntities;
  }

  // ─────────────────────────────────────────────────────────────
  // 8. LAYOUT FILTERING & ORCHESTRATION
  // ─────────────────────────────────────────────────────────────
  async function loadLayoutSurveyData(layoutId) {
    if (!layoutId) return;
    const config = window.LAYOUT_SURVEY_CONFIG[layoutId];
    if (!config) {
      console.log(`[MediaManager] No survey media configuration defined for layout '${layoutId}'.`);
      // Hide any entities if switching away from a configured layout
      if (surveyMediaState.photoDataSource) surveyMediaState.photoDataSource.show = false;
      if (surveyMediaState.videoDataSource) surveyMediaState.videoDataSource.show = false;
      if (surveyMediaState.gpxDataSource) surveyMediaState.gpxDataSource.show = false;
      return;
    }

    surveyMediaState.activeLayoutId = layoutId;
    console.log(`[MediaManager] Loading survey data for layout: ${config.label} (${layoutId})...`);

    // Ensure DataSources are ready
    if (!surveyMediaState.photoDataSource) {
      initDataSources();
    }

    // Determine backend base URL (handles localhost:4001 or current host)
    const backendBase = (typeof window.resolveGloveBackendBase === "function")
      ? window.resolveGloveBackendBase()
      : (window.location.port === "4001" ? "" : "http://localhost:4001");

    // 1. Directly load local survey data files (GPX, Photos JSON, Videos JSON)
    let loadedFromApi = false;
    try {
      const [gpxResult, photoResult, videoResult] = await Promise.allSettled([
        loadGPX(config.gpxUrl, layoutId),
        loadPhotoJSON(config.photosJsonUrl, layoutId, config.photosBaseUrl),
        loadVideoJSON(config.videosJsonUrl, layoutId, config.videosBaseUrl)
      ]);

      const photoList = photoResult.status === "fulfilled" ? photoResult.value : [];
      const videoList = videoResult.status === "fulfilled" ? videoResult.value : [];

      surveyMediaState.loadedLayouts[layoutId] = {
        gpx: gpxResult.status === "fulfilled" ? gpxResult.value : null,
        photos: photoList,
        videos: videoList
      };

      if (photoList.length > 0 || videoList.length > 0) {
        console.log(`[MediaManager] Successfully loaded ${photoList.length} photos and ${videoList.length} videos from local survey data.`);
        loadedFromApi = true;
      }
    } catch (e) {
      console.warn("[MediaManager] Local files load note:", e);
    }

    // 2. If local files empty, fallback to backend API
    if (!loadedFromApi) {
      try {
        const apiEndpoint = `${backendBase}/api/survey-data/${layoutId}`;
        const apiResp = await fetch(apiEndpoint);
        if (apiResp.ok) {
          const apiData = await apiResp.json();
          if (apiData && (Array.isArray(apiData.photos) || Array.isArray(apiData.videos))) {
            if (Array.isArray(apiData.photos)) createPhotoMarkers(apiData.photos, layoutId, "");
            if (Array.isArray(apiData.videos)) createVideoMarkers(apiData.videos, layoutId, "");
          }
        }
      } catch (err) {
        console.log("[MediaManager] Survey API error:", err.message);
      }
    }

    // Apply current toggle states
    const photoCb = document.getElementById("photosToggle");
    if (photoCb) togglePhotos(photoCb.checked);

    const videoCb = document.getElementById("videosToggle");
    if (videoCb) toggleVideos(videoCb.checked);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. INDEPENDENT LAYER TOGGLES
  // ─────────────────────────────────────────────────────────────
  function togglePhotos(forceState) {
    const checkbox = document.getElementById("photosToggle");
    const isChecked = typeof forceState === "boolean" ? forceState : (checkbox ? checkbox.checked : true);
    if (checkbox && checkbox.checked !== isChecked) {
      checkbox.checked = isChecked;
    }

    surveyMediaState.photosVisible = isChecked;

    if (surveyMediaState.photoDataSource) {
      surveyMediaState.photoDataSource.show = isChecked;
      if (isChecked && surveyMediaState.photoDataSource.entities.values.length === 0) {
        loadLayoutSurveyData("manishnagar");
      }
    }

    console.log(`[Layer] Photos layer is now ${isChecked ? "ON" : "OFF"}`);
  }

  function toggleVideos(forceState) {
    const checkbox = document.getElementById("videosToggle");
    const isChecked = typeof forceState === "boolean" ? forceState : (checkbox ? checkbox.checked : true);
    if (checkbox && checkbox.checked !== isChecked) {
      checkbox.checked = isChecked;
    }

    surveyMediaState.videosVisible = isChecked;

    if (surveyMediaState.videoDataSource) {
      surveyMediaState.videoDataSource.show = isChecked;
      if (isChecked && surveyMediaState.videoDataSource.entities.values.length === 0) {
        loadLayoutSurveyData("manishnagar");
      }
    }

    console.log(`[Layer] Videos layer is now ${isChecked ? "ON" : "OFF"}`);
  }

  function toggleGPX(forceState) {
    const isChecked = typeof forceState === "boolean" ? forceState : !surveyMediaState.gpxVisible;
    surveyMediaState.gpxVisible = isChecked;
    if (surveyMediaState.gpxDataSource) {
      surveyMediaState.gpxDataSource.show = isChecked;
    }
  }

  function updateLayerStatusBadge(type, count, text) {
    const badge = document.getElementById(`${type}Status`);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = `${count}`;
      badge.className = "layer-status status-loaded";
      badge.title = `${count} ${type} markers loaded`;
    } else {
      badge.textContent = text || "Loaded";
      badge.className = text === "Not Loaded" ? "layer-status status-loading" : "layer-status status-loaded";
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 10. DIRECT MEDIA VIEWERS (LIGHTBOX & VIDEO PLAYER MODALS)
  // ─────────────────────────────────────────────────────────────
  function openPhoto(photoData) {
    if (!photoData) return;
    surveyMediaState.activeMedia = photoData;

    let modal = document.getElementById("photoMediaModal");
    if (!modal) {
      createMediaModalsInDOM();
      modal = document.getElementById("photoMediaModal");
    }

    const titleEl = document.getElementById("photoModalTitle");
    const imgEl = document.getElementById("photoModalImage");
    const latEl = document.getElementById("photoModalLat");
    const lonEl = document.getElementById("photoModalLon");
    const timeEl = document.getElementById("photoModalTime");
    const descEl = document.getElementById("photoModalDesc");
    const rawPathEl = document.getElementById("photoModalPath");
    const errorEl = document.getElementById("photoModalError");

    if (titleEl) titleEl.textContent = photoData.filename || "Geotagged Photo";
    if (latEl) latEl.textContent = photoData.latitude !== undefined ? Number(photoData.latitude).toFixed(6) : "--";
    if (lonEl) lonEl.textContent = photoData.longitude !== undefined ? Number(photoData.longitude).toFixed(6) : "--";
    if (timeEl) timeEl.textContent = photoData.timestamp || "Not available";
    if (descEl) descEl.textContent = photoData.description || "Survey Photo Marker";
    if (rawPathEl) rawPathEl.textContent = photoData.rawPath || photoData.photoUrl || "";

    if (errorEl) errorEl.style.display = "none";
    if (imgEl) {
      imgEl.style.display = "block";
      imgEl.src = "";
      imgEl.alt = photoData.filename || "Survey Photo";

      imgEl.onerror = function () {
        console.warn(`[Photo Viewer] Could not load image from: ${photoData.photoUrl}`);
        imgEl.style.display = "none";
        if (errorEl) {
          errorEl.style.display = "flex";
          const errorPathEl = document.getElementById("photoModalErrorPath");
          if (errorPathEl) errorPathEl.textContent = photoData.photoUrl || photoData.rawPath;
        }
      };

      imgEl.src = photoData.photoUrl;
    }

    modal.classList.remove("hidden");
    modal.classList.add("active");
  }

  function closePhotoModal() {
    const modal = document.getElementById("photoMediaModal");
    if (modal) {
      modal.classList.remove("active");
      modal.classList.add("hidden");
      const imgEl = document.getElementById("photoModalImage");
      if (imgEl) imgEl.src = "";
    }
  }

  function openVideo(videoData) {
    if (!videoData) return;
    surveyMediaState.activeMedia = videoData;

    let modal = document.getElementById("videoMediaModal");
    if (!modal) {
      createMediaModalsInDOM();
      modal = document.getElementById("videoMediaModal");
    }

    const titleEl = document.getElementById("videoModalTitle");
    const videoEl = document.getElementById("videoModalPlayer");
    const latEl = document.getElementById("videoModalLat");
    const lonEl = document.getElementById("videoModalLon");
    const timeEl = document.getElementById("videoModalTime");
    const descEl = document.getElementById("videoModalDesc");
    const rawPathEl = document.getElementById("videoModalPath");
    const errorEl = document.getElementById("videoModalError");

    if (titleEl) titleEl.textContent = videoData.filename || "Geotagged Video";
    if (latEl) latEl.textContent = videoData.latitude !== undefined ? Number(videoData.latitude).toFixed(6) : "--";
    if (lonEl) lonEl.textContent = videoData.longitude !== undefined ? Number(videoData.longitude).toFixed(6) : "--";
    if (timeEl) timeEl.textContent = videoData.timestamp || "Not available";
    if (descEl) descEl.textContent = videoData.description || "Survey Video Marker";
    if (rawPathEl) rawPathEl.textContent = videoData.rawPath || videoData.videoUrl || "";

    if (errorEl) errorEl.style.display = "none";

    if (videoEl) {
      videoEl.pause();
      videoEl.style.display = "block";
      videoEl.muted = true;
      videoEl.src = "";

      videoEl.onerror = function () {
        console.warn(`[Video Player] Could not load or play video from: ${videoData.videoUrl}`);
        videoEl.style.display = "none";
        if (errorEl) {
          errorEl.style.display = "flex";
          const errorPathEl = document.getElementById("videoModalErrorPath");
          if (errorPathEl) errorPathEl.textContent = videoData.videoUrl || videoData.rawPath;
        }
      };

      videoEl.src = videoData.videoUrl;
      videoEl.load();
      videoEl.play().catch(e => console.log("Autoplay was prevented or pending interaction:", e.message));
    }

    modal.classList.remove("hidden");
    modal.classList.add("active");
  }

  function closeVideoModal() {
    const modal = document.getElementById("videoMediaModal");
    if (modal) {
      modal.classList.remove("active");
      modal.classList.add("hidden");
      const videoEl = document.getElementById("videoModalPlayer");
      if (videoEl) {
        videoEl.pause();
        videoEl.src = "";
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 11. DOM MODAL CREATOR (If not present in index.html)
  // ─────────────────────────────────────────────────────────────
  function createMediaModalsInDOM() {
    if (document.getElementById("photoMediaModal")) return;

    const modalContainer = document.createElement("div");
    modalContainer.id = "surveyMediaModalsContainer";
    modalContainer.innerHTML = `
      <!-- Photo Modal -->
      <div id="photoMediaModal" class="survey-media-modal hidden" aria-label="Geotagged Photo Viewer">
        <div class="survey-modal-backdrop" onclick="window.closePhotoModal()"></div>
        <div class="survey-modal-window">
          <div class="survey-modal-header photo-header">
            <div class="survey-modal-title-group">
              <span class="survey-modal-icon">📷</span>
              <div>
                <h3 id="photoModalTitle">Geotagged Photo</h3>
                <span class="survey-layout-tag">Manish Nagar Survey</span>
              </div>
            </div>
            <div class="survey-modal-actions">
              <button type="button" class="modal-icon-btn" onclick="window.togglePhotoFullscreen()" title="Fullscreen">⛶</button>
              <button type="button" class="modal-icon-btn" onclick="window.openPhotoInNewTab()" title="Open Original">↗</button>
              <button type="button" class="modal-icon-btn close" onclick="window.closePhotoModal()" title="Close">✕</button>
            </div>
          </div>
          <div class="survey-modal-body">
            <div class="media-view-wrapper">
              <img id="photoModalImage" src="" alt="Geotagged Photo" class="survey-image-display" />
              <div id="photoModalError" class="survey-media-error hidden">
                <div class="error-icon">⚠️</div>
                <h4>Photo Unavailable</h4>
                <p>Could not load the photo from the specified path:</p>
                <code id="photoModalErrorPath"></code>
                <span class="error-hint">Verify that the photo file exists in your configured media directory or static server.</span>
              </div>
            </div>
          </div>
          <div class="survey-modal-footer">
            <div class="survey-meta-grid">
              <div class="survey-meta-item">
                <span class="meta-label">Latitude</span>
                <span class="meta-value" id="photoModalLat">--</span>
              </div>
              <div class="survey-meta-item">
                <span class="meta-label">Longitude</span>
                <span class="meta-value" id="photoModalLon">--</span>
              </div>
              <div class="survey-meta-item">
                <span class="meta-label">Timestamp</span>
                <span class="meta-value" id="photoModalTime">--</span>
              </div>
              <div class="survey-meta-item wide">
                <span class="meta-label">Source Path</span>
                <span class="meta-value path-mono" id="photoModalPath">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Video Modal -->
      <div id="videoMediaModal" class="survey-media-modal hidden" aria-label="Geotagged Video Player">
        <div class="survey-modal-backdrop" onclick="window.closeVideoModal()"></div>
        <div class="survey-modal-window">
          <div class="survey-modal-header video-header">
            <div class="survey-modal-title-group">
              <span class="survey-modal-icon">🎥</span>
              <div>
                <h3 id="videoModalTitle">Geotagged Video</h3>
                <span class="survey-layout-tag">Manish Nagar Survey</span>
              </div>
            </div>
            <div class="survey-modal-actions">
              <button type="button" class="modal-icon-btn" onclick="window.toggleVideoFullscreen()" title="Fullscreen">⛶</button>
              <button type="button" class="modal-icon-btn" onclick="window.openVideoInNewTab()" title="Open Original">↗</button>
              <button type="button" class="modal-icon-btn close" onclick="window.closeVideoModal()" title="Close">✕</button>
            </div>
          </div>
          <div class="survey-modal-body">
            <div class="media-view-wrapper">
              <video id="videoModalPlayer" controls autoplay muted playsinline class="survey-video-display"></video>
              <div id="videoModalError" class="survey-media-error hidden">
                <div class="error-icon">⚠️</div>
                <h4>Video Unavailable</h4>
                <p>Could not stream or load the video from the specified path:</p>
                <code id="videoModalErrorPath"></code>
                <span class="error-hint">Verify that the video file exists and is supported (MP4/H.264/WebM).</span>
              </div>
            </div>
          </div>
          <div class="survey-modal-footer">
            <div class="survey-meta-grid">
              <div class="survey-meta-item">
                <span class="meta-label">Latitude</span>
                <span class="meta-value" id="videoModalLat">--</span>
              </div>
              <div class="survey-meta-item">
                <span class="meta-label">Longitude</span>
                <span class="meta-value" id="videoModalLon">--</span>
              </div>
              <div class="survey-meta-item">
                <span class="meta-label">Timestamp</span>
                <span class="meta-value" id="videoModalTime">--</span>
              </div>
              <div class="survey-meta-item wide">
                <span class="meta-label">Source Path</span>
                <span class="meta-value path-mono" id="videoModalPath">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);
  }

  // Fullscreen & utility handlers
  window.togglePhotoFullscreen = function () {
    const win = document.querySelector("#photoMediaModal .survey-modal-window");
    if (!win) return;
    if (!document.fullscreenElement) {
      win.requestFullscreen?.().catch(err => console.log(err));
    } else {
      document.exitFullscreen?.().catch(err => console.log(err));
    }
  };

  window.toggleVideoFullscreen = function () {
    const player = document.getElementById("videoModalPlayer");
    if (!player) return;
    if (!document.fullscreenElement) {
      if (player.requestFullscreen) {
        player.requestFullscreen();
      } else {
        const win = document.querySelector("#videoMediaModal .survey-modal-window");
        win?.requestFullscreen?.();
      }
    } else {
      document.exitFullscreen?.();
    }
  };

  window.openPhotoInNewTab = function () {
    if (surveyMediaState.activeMedia?.photoUrl) {
      window.open(surveyMediaState.activeMedia.photoUrl, "_blank");
    }
  };

  window.openVideoInNewTab = function () {
    if (surveyMediaState.activeMedia?.videoUrl) {
      window.open(surveyMediaState.activeMedia.videoUrl, "_blank");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 12. HOOK CESIUM ENTITY PICKING
  // ─────────────────────────────────────────────────────────────
  function checkMediaEntityPicked(clickedEntity) {
    if (!clickedEntity) return false;

    // Check if entity is from photoDataSource
    if (surveyMediaState.photoDataSource && surveyMediaState.photoDataSource.entities.contains(clickedEntity)) {
      const data = clickedEntity._mediaData || (clickedEntity.properties ? clickedEntity.properties.getValue(viewer.clock.currentTime) : null);
      if (data) {
        openPhoto(data);
        return true;
      }
    }

    // Check if entity is from videoDataSource
    if (surveyMediaState.videoDataSource && surveyMediaState.videoDataSource.entities.contains(clickedEntity)) {
      const data = clickedEntity._mediaData || (clickedEntity.properties ? clickedEntity.properties.getValue(viewer.clock.currentTime) : null);
      if (data) {
        openVideo(data);
        return true;
      }
    }

    // Check property markers with custom flags
    if (clickedEntity._mediaType === "photo") {
      openPhoto(clickedEntity._mediaData);
      return true;
    }

    if (clickedEntity._mediaType === "video") {
      openVideo(clickedEntity._mediaData);
      return true;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // 13. EXPOSE PUBLIC INTERFACE
  // ─────────────────────────────────────────────────────────────
  window.GeotaggedMediaManager = {
    init: initDataSources,
    loadGPX: loadGPX,
    loadPhotoJSON: loadPhotoJSON,
    loadVideoJSON: loadVideoJSON,
    createPhotoMarkers: createPhotoMarkers,
    createVideoMarkers: createVideoMarkers,
    loadLayoutSurveyData: loadLayoutSurveyData,
    togglePhotos: togglePhotos,
    toggleVideos: toggleVideos,
    toggleGPX: toggleGPX,
    openPhoto: openPhoto,
    openVideo: openVideo,
    closePhotoModal: closePhotoModal,
    closeVideoModal: closeVideoModal,
    checkMediaEntityPicked: checkMediaEntityPicked,
    getState: () => surveyMediaState
  };

  // Global shorthand bindings
  window.loadGPX = loadGPX;
  window.loadPhotoJSON = loadPhotoJSON;
  window.loadVideoJSON = loadVideoJSON;
  window.createPhotoMarkers = createPhotoMarkers;
  window.createVideoMarkers = createVideoMarkers;
  window.togglePhotos = togglePhotos;
  window.toggleVideos = toggleVideos;
  window.openPhoto = openPhoto;
  window.openVideo = openVideo;
  window.closePhotoModal = closePhotoModal;
  window.closeVideoModal = closeVideoModal;

  // Layout switcher listener hook
  window.onLayoutChanged = function (layoutId) {
    console.log(`[MediaManager] Layout changed to: ${layoutId}`);
    if (layoutId.toLowerCase().includes("manish")) {
      loadLayoutSurveyData("manishnagar");
    } else {
      // If other layout without media, hide Manish Nagar markers
      if (surveyMediaState.photoDataSource) surveyMediaState.photoDataSource.show = false;
      if (surveyMediaState.videoDataSource) surveyMediaState.videoDataSource.show = false;
      if (surveyMediaState.gpxDataSource) surveyMediaState.gpxDataSource.show = false;
    }
  };

  // Keyboard shortcut: ESC closes open media modals
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closePhotoModal();
      closeVideoModal();
    }
  });

  // Self-initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      createMediaModalsInDOM();
      setTimeout(initDataSources, 500);
    });
  } else {
    createMediaModalsInDOM();
    setTimeout(initDataSources, 500);
  }

})();
