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
    // Start hidden, same as housesDataSource, until user checks the
    // "Roads" checkbox in the Layer Manager.
    roadsDataSource.show = false;
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
    // Layer Manager me "Roads" status hamesha "Loading..." atka reh jata
    // tha kyunki isse kabhi update hi nahi kiya jata tha. Fetch complete
    // hote hi (success ya fail dono me) status ko sahi state me update.
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

/* ------------------------------------------------
   3️⃣ ADD ROAD POLYGON + MARKER TO CESIUM
------------------------------------------------ */
function addRoadPolygonTo3D(feature) {
  if (!feature || !feature.geometry || !feature.properties) return;

  const ds = ensureRoadsDataSource();

  // Polygon coordinates
  const coords = feature.geometry.coordinates[0].flat();

  // ---- POLYGON ---- (added to roadsDataSource, not viewer.entities,
  // so it belongs to the "roads" layer and the Layer Manager toggle
  // can show/hide it — visible fill now, houses-jaisa dikhne ke liye)
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

  // 🔥 VERY IMPORTANT: PropertyBag
  polygonEntity.properties = new Cesium.PropertyBag({
    hasVideo: feature.properties.hasVideo === true,
    videoUrl: feature.properties.videoUrl || ""
  });

  polygonEntity.allowPicking = true;

  // ---- CENTER MARKER (CLICK FRIENDLY) ----
  if (feature.properties.centroid) {
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        feature.properties.centroid[0],
        feature.properties.centroid[1]
      ),
      billboard: {
        image: "/icons/survey-pin.png",
        width: 28,
        height: 28
      },
      properties: new Cesium.PropertyBag({
        hasVideo: feature.properties.hasVideo === true,
        videoUrl: feature.properties.videoUrl || ""
      })
    });
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

  // IMPORTANT: reset first
  iframe.src = "";
  iframe.src = videoUrl;
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