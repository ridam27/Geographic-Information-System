/*************************************************
 * ROAD SURVEY – 3D SIDE (FINAL WORKING FILE)
 * Only frontend – no backend/db changes
 *************************************************/

const API_BASE =
    window.SURVEY_BACKEND_URL || window.PTAX_API_BASE || "https://geo-survey-backend-2fy8.onrender.com";

/* ------------------------------------------------
   0️⃣ ROADS DATA SOURCE (so Layer Manager toggle works,
   same pattern as housesDataSource)
------------------------------------------------ */
// 'roadsDataSource' is declared as `let roadsDataSource = null;` in
// 1_config_globals.js (loaded before this file). We assign to that
// same global here (no `let`/`const`) so toggleLayer('roads') in
// 5_layer_manager.js can actually find and toggle it.
function ensureRoadsDataSource() {
  if (!roadsDataSource) {
    roadsDataSource = new Cesium.CustomDataSource("roads");
    const isChecked = document.getElementById("roadsToggle")?.checked ?? true;
    roadsDataSource.show = isChecked;
    viewer.dataSources.add(roadsDataSource);
  }
  return roadsDataSource;
}

/* ------------------------------------------------
   1️⃣ LOAD EXISTING ROAD SURVEYS FROM DB
------------------------------------------------ */
fetch(`${API_BASE}/api/road-surveys`)
  .then(res => res.json())
  .then(data => {
    if (!data || !data.features) return;
    data.features.forEach(feature => {
      addRoadPolygonTo3D(feature);
    });
  })
  .catch(err => console.error("Road survey load error:", err))
  .finally(() => {
    const statusEl = document.getElementById("roadsStatus");
    if (statusEl) {
      statusEl.textContent = "Loaded";
      statusEl.className = "layer-status status-loaded";
    }
  });

/* ------------------------------------------------
   2️⃣ REALTIME – NEW ROAD WITHOUT REFRESH
------------------------------------------------ */
if (typeof socket !== "undefined") {
  socket.on("3d:road:new", (feature) => {
    addRoadPolygonTo3D(feature);
  });
}

// Camera icon SVG pin for Road Survey marker
const ROAD_CAMERA_PIN_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
  <circle cx="19" cy="19" r="17" fill="#E11D48" stroke="#FFFFFF" stroke-width="2.5"/>
  <rect x="9" y="13" width="12" height="12" rx="2" fill="#FFFFFF"/>
  <polygon points="22,16 28,12 28,26 22,22" fill="#FFFFFF"/>
</svg>
`)}`;

/* ------------------------------------------------
   2️⃣.B LOAD STATIC AREA ROADS (roads.kmz & paths.kmz)
------------------------------------------------ */
let isRoadKmzLoaded = false;

async function loadKmzFileToKmlDataSource(fileUrl) {
  try {
    let ds;
    try {
      ds = await Cesium.KmlDataSource.load(fileUrl, {
        camera: viewer.scene.camera,
        canvas: viewer.scene.canvas,
        clampToGround: true
      });
    } catch (directErr) {
      console.log(`Direct load failed for ${fileUrl}, trying JSZip fallback...`);
      if (window.JSZip) {
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        const zip = await JSZip.loadAsync(blob);
        const kmlFileName = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.kml')) || 'doc.kml';
        if (zip.files[kmlFileName]) {
          const kmlText = await zip.files[kmlFileName].async('string');
          const kmlBlob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' });
          const blobUrl = URL.createObjectURL(kmlBlob);
          ds = await Cesium.KmlDataSource.load(blobUrl, {
            camera: viewer.scene.camera,
            canvas: viewer.scene.canvas,
            clampToGround: true
          });
          URL.revokeObjectURL(blobUrl);
        }
      }
    }
    return ds;
  } catch (err) {
    console.warn(`Error loading KMZ ${fileUrl}:`, err);
    return null;
  }
}

async function loadStaticRoadKMZ() {
  if (isRoadKmzLoaded) return;
  if (typeof Cesium === "undefined" || typeof viewer === "undefined" || !viewer) {
    setTimeout(loadStaticRoadKMZ, 300);
    return;
  }

  isRoadKmzLoaded = true;
  const ds = ensureRoadsDataSource();
  const kmzFiles = ["roads.kmz", "paths.kmz", encodeURI("Manish Nagar Roads.kmz")];

  // How far above real ground the road overlay is lifted so the 3D model
  // (a raised photogrammetry/GLB mesh, not actual terrain) can never draw
  // over it. clampToGround/CLAMP_TO_GROUND only classify against terrain
  // and registered 3D Tilesets — never against a plain Model entity — which
  // is exactly why the model was rendering on top of the roads before.
  const ROAD_ELEVATION_MARGIN = 25; // meters above real terrain

  for (const file of kmzFiles) {
    const kmlDs = await loadKmzFileToKmlDataSource(file);
    if (!kmlDs) continue;

    const allEntities = kmlDs.entities.values;
    console.log(`Loaded ${allEntities.length} road features from ${file}`);

    // Gather every polyline/polygon vertex so we can resolve real ground
    // elevation for all of them in one batched terrain request, then lift
    // the geometry above the model instead of clamping it to the ground.
    const cartoBatch = [];
    const lineJobs = [];
    const polyJobs = [];

    allEntities.forEach((entity) => {
      if (entity.polyline) {
        const positions = entity.polyline.positions?.getValue(viewer.clock.currentTime);
        if (positions && positions.length) {
          const start = cartoBatch.length;
          positions.forEach((p) => cartoBatch.push(Cesium.Cartographic.fromCartesian(p)));
          lineJobs.push({ entity, start, count: positions.length });
        }
      } else if (entity.polygon) {
        const hierarchy = entity.polygon.hierarchy?.getValue(viewer.clock.currentTime);
        const positions = hierarchy && hierarchy.positions;
        if (positions && positions.length) {
          const start = cartoBatch.length;
          positions.forEach((p) => cartoBatch.push(Cesium.Cartographic.fromCartesian(p)));
          polyJobs.push({ entity, start, count: positions.length });
        }
      }
    });

    // Only trust the sampled heights if terrain sampling actually
    // succeeds — falling back to raw (often 0/ellipsoid-relative) heights
    // would float or bury the roads, which is worse than the original
    // clampToGround behavior. On failure we just keep clampToGround: true
    // (the pre-existing, imperfect-but-safe behavior).
    let terrainSampled = false;
    if (cartoBatch.length > 0) {
      try {
        await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartoBatch);
        terrainSampled = true;
      } catch (e) {
        console.warn(`Terrain sampling failed for ${file}, roads will stay ground-clamped (may render under the model):`, e);
      }
    }

    const raisePositions = (start, count) => {
      const raised = [];
      for (let i = 0; i < count; i++) {
        const c = cartoBatch[start + i];
        raised.push(
          Cesium.Cartesian3.fromRadians(
            c.longitude,
            c.latitude,
            (c.height || 0) + ROAD_ELEVATION_MARGIN
          )
        );
      }
      return raised;
    };

    if (terrainSampled) {
      lineJobs.forEach(({ entity, start, count }) => {
        entity.polyline.positions = raisePositions(start, count);
        entity.polyline.clampToGround = false;
      });

      polyJobs.forEach(({ entity, start, count }) => {
        entity.polygon.hierarchy = raisePositions(start, count);
        entity.polygon.perPositionHeight = true;
        entity.polygon.heightReference = undefined;
      });
    } else {
      lineJobs.forEach(({ entity }) => {
        entity.polyline.clampToGround = true;
      });
      polyJobs.forEach(({ entity }) => {
        entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
      });
    }

    allEntities.forEach((entity) => {
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.RED.withAlpha(0.65);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.9);
        entity.polygon.outlineWidth = 2.0;
      }
      if (entity.polyline) {
        entity.polyline.material = Cesium.Color.RED.withAlpha(0.85);
        entity.polyline.width = 10.0;
        // Belt-and-suspenders: the geometry is already lifted above the
        // model, but depthFailMaterial (only honored when clampToGround is
        // false, which it now is) keeps the line visible even if some
        // local part of the model still pokes above the margin.
        entity.polyline.depthFailMaterial = Cesium.Color.RED.withAlpha(0.85);
      }

      // Some exported KMZs (e.g. Google Earth "Temporary Places") mark
      // placemarks/folders as visibility=0 by default, which Cesium's
      // KmlDataSource maps to entity.show = false — so the geometry loads
      // but never renders. Force it visible since these are always-on
      // static layers, not something the KML author actually meant to hide.
      entity.show = true;

      // Add entity to roadsDataSource
      ds.entities.add(entity);

      let positionsToPin = [];

      if (entity.position) {
        const p = entity.position.getValue(viewer.clock.currentTime);
        if (p) positionsToPin.push(p);
      } else if (entity.polyline && entity.polyline.positions) {
        const rawPositions = entity.polyline.positions.getValue(viewer.clock.currentTime);
        if (rawPositions && rawPositions.length > 0) {
          const midIdx = Math.floor(rawPositions.length / 2);
          positionsToPin.push(rawPositions[midIdx]);

          // Also place pins at start/quarter/three-quarter points if polyline has multiple vertices
          if (rawPositions.length >= 4) {
            positionsToPin.push(rawPositions[Math.floor(rawPositions.length / 4)]);
            positionsToPin.push(rawPositions[Math.floor((3 * rawPositions.length) / 4)]);
          }
        }
      } else if (entity.polygon && entity.polygon.hierarchy) {
        const hierarchy = entity.polygon.hierarchy.getValue(viewer.clock.currentTime);
        if (hierarchy && hierarchy.positions && hierarchy.positions.length > 0) {
          const rawPositions = hierarchy.positions;
          let sumX = 0, sumY = 0, sumZ = 0;
          rawPositions.forEach(p => { sumX += p.x; sumY += p.y; sumZ += p.z; });
          positionsToPin.push(new Cesium.Cartesian3(
            sumX / rawPositions.length,
            sumY / rawPositions.length,
            sumZ / rawPositions.length
          ));
        }
      }

      // Add Camera Pin Icon for each position found
      positionsToPin.forEach(pos => {
        const pinEntity = ds.entities.add({
          position: pos,
          billboard: {
            image: ROAD_CAMERA_PIN_ICON,
            width: 32,
            height: 32,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: new Cesium.PropertyBag({
            hasVideo: true,
            videoUrl: "https://everythingyoupost.com/stream/?stream=cam"
          })
        });
        pinEntity.allowPicking = true;
      });

      if (!entity.properties) entity.properties = new Cesium.PropertyBag();
      try {
        entity.properties.addProperty("hasVideo", true);
        entity.properties.addProperty("videoUrl", "https://everythingyoupost.com/stream/?stream=cam");
      } catch (e) {
        entity.properties.hasVideo = true;
        entity.properties.videoUrl = "https://everythingyoupost.com/stream/?stream=cam";
      }
    });
  }
}

// Automatically load static area roads once viewer initializes
if (document.readyState === "complete" || document.readyState === "interactive") {
  loadStaticRoadKMZ();
} else {
  window.addEventListener("DOMContentLoaded", loadStaticRoadKMZ);
}

/* ------------------------------------------------
   3️⃣ ADD ROAD POLYGON + MARKER TO CESIUM
------------------------------------------------ */
function addRoadPolygonTo3D(feature) {
  if (!feature || !feature.geometry || !feature.properties) return;

  const ds = ensureRoadsDataSource();

  // Polygon coordinates
  const rawCoords = feature.geometry.coordinates[0];
  const coords = rawCoords.flat();

  // ---- POLYGON ---- (added to roadsDataSource)
  const polygonEntity = ds.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
      material: Cesium.Color.RED.withAlpha(0.6),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2.0,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  });

  const videoUrl = feature.properties.videoUrl || "https://everythingyoupost.com/stream/?stream=cam";

  // PropertyBag for polygon click
  polygonEntity.properties = new Cesium.PropertyBag({
    hasVideo: feature.properties.hasVideo !== false,
    videoUrl: videoUrl
  });

  polygonEntity.allowPicking = true;

  // ---- CENTER MARKER (CLICKABLE CAMERA PIN ICON) ----
  let centroid = feature.properties.centroid;
  if (!centroid || !Array.isArray(centroid) || centroid.length < 2) {
    let sumLng = 0, sumLat = 0;
    rawCoords.forEach(([lng, lat]) => {
      sumLng += lng;
      sumLat += lat;
    });
    if (rawCoords.length > 0) {
      centroid = [sumLng / rawCoords.length, sumLat / rawCoords.length];
    }
  }

  if (centroid && centroid.length >= 2) {
    const pinEntity = ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(centroid[0], centroid[1]),
      billboard: {
        image: ROAD_CAMERA_PIN_ICON,
        width: 32,
        height: 32,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      properties: new Cesium.PropertyBag({
        hasVideo: feature.properties.hasVideo !== false,
        videoUrl: videoUrl
      })
    });
    pinEntity.allowPicking = true;
  }
}

/* ------------------------------------------------
   4️⃣ CLICK HANDLER (CESIUM CORRECT WAY)
------------------------------------------------ */
viewer.screenSpaceEventHandler.setInputAction((click) => {

  const picked =
      viewer.scene.pick(click.position);

  if (!picked || !picked.id) return;

  const entity = picked.id;

  // SAFETY CHECK
  if (
      !entity.properties ||
      !entity.properties.hasVideo
  ) return;

  // SAFE ACCESS
  const hasVideo =
      entity.properties.hasVideo.getValue();

  if (hasVideo) {

      const videoUrl =
          entity.properties.videoUrl.getValue();

      showPopup(videoUrl);

  }

},
Cesium.ScreenSpaceEventType.LEFT_CLICK);

/* ------------------------------------------------
   5️⃣ POPUP + VIDEO + ROLE CHECK
------------------------------------------------ */
function showPopup(videoUrl) {
  const popup = document.getElementById("roadPopup");
  const iframe = document.getElementById("roadIframe");

  if (!popup || !iframe) {
    console.error("Popup or iframe missing");
    return;
  }

  popup.classList.remove("hidden");

  const targetUrl = (videoUrl && !videoUrl.includes("13.127.220.89"))
    ? videoUrl
    : "https://everythingyoupost.com/stream/?stream=cam";

  // IMPORTANT: reset first
  iframe.src = "";
  iframe.src = targetUrl;
}



/* ------------------------------------------------
   6️⃣ OPTIONAL: CLOSE POPUP (if button used)
------------------------------------------------ */
function closePopup() {
  const popup = document.getElementById("roadPopup");
  const video = document.getElementById("roadVideo");

  if (video) {
    video.pause();
    video.src = "";
    video.style.display = "none";
  }
  if (popup) popup.classList.add("hidden");
}

const popup = document.getElementById("roadPopup");
const resizeBtn = document.getElementById("resizeBtn");
const closeBtn = document.getElementById("closeBtn");

resizeBtn.onclick = async () => {
  if (!document.fullscreenElement) {
    await popup.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
};


closeBtn.onclick = () => {
  const iframe = document.getElementById("roadIframe");
  iframe.src = "";
  popup.classList.add("hidden");

  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
};