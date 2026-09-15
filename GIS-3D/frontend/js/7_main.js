/* eslint-disable no-undef */
// File: js/7_main.js
// Yeh file saare event listeners ko attach karti hai aur app ko start karti hai.

document
  .getElementById("heading")
  .addEventListener("input", debounce(updateModelOrientation, 300));
document
  .getElementById("pitch")
  .addEventListener("input", debounce(updateModelOrientation, 300));
document
  .getElementById("roll")
  .addEventListener("input", debounce(updateModelOrientation, 300));
document
  .getElementById("longitude")
  .addEventListener("input", debounce(updateModelPosition, 300));
document
  .getElementById("latitude")
  .addEventListener("input", debounce(updateModelPosition, 300));
document
  .getElementById("height")
  .addEventListener("input", debounce(updateModelPosition, 300));
document
  .getElementById("scale")
  .addEventListener("input", debounce(updateActiveModelScale, 300));

window.addEventListener("beforeunload", function () {
  for (const url in textureUrlCache) {
    URL.revokeObjectURL(textureUrlCache[url]);
  }

  if (currentModelUrl) {
    URL.revokeObjectURL(currentModelUrl);
  }
});

console.log("=== Cesium 3D Model + KMZ Layers Viewer Initialized ===");
console.log("Layer Stacking Order:");
console.log("  1. Cesium Globe (base)");
console.log("  2. .glb Model");
console.log("  3. Roads KMZ (paths.kmz)");
console.log("  4. Houses KMZ (HOUSES polygon.kmz)");
console.log("Features:");
console.log("  ✓ Depth testing enabled to prevent z-fighting");
console.log("  ✓ Height offsets for proper layer stacking");
console.log("  ✓ Model opacity control (doesn't affect globe)");
console.log("  ✓ Individual layer visibility toggles");

// =================================================================
// === BADLAAV 4: NAYA ON-CLICK PIN FEATURE (REPLACE KIYA GAYA) ===
// =================================================================
const handler =
  new Cesium.ScreenSpaceEventHandler(
    viewer.scene.canvas
  );

handler.setInputAction(function (click) {

  // ─────────────────────────────────────────────────────────────
  // 🚰 MANHOLE TOOL — exclusive mode
  // Agar manhole tool active hai toh SIRF manhole handle karo.
  // Baaki sab click logic skip — warna pole/search pin bhi fire hoga.
  // ─────────────────────────────────────────────────────────────
  if (typeof window.isManholeToolActive === "function" && window.isManholeToolActive()) {
    try {
      const cartesianPosition = viewer.scene.pickPosition(click.position);
      if (Cesium.defined(cartesianPosition)) {
        console.log("🚰 Ground position picked:", cartesianPosition);
        window.handleManholeMapClick(cartesianPosition);
      }
    } catch (e) {
      console.warn("Error calculating manhole position:", e);
    }
    return; // ← exclusive — kuch aur fire nahi hoga
  }

  // 1️⃣ Detect clicked object (normal mode)
  const pickedObject =
    viewer.scene.pick(click.position);

  // 2️⃣ Check valid entity
  if (
    Cesium.defined(pickedObject) &&
    Cesium.defined(pickedObject.id) &&
    pickedObject.id instanceof Cesium.Entity
  ) {

    const clickedEntity =
      pickedObject.id;

    // 📷🎥 Geotagged Photo/Video pin clicked — open the media viewer immediately
    if (
      typeof window.GeotaggedMediaManager !== "undefined" &&
      window.GeotaggedMediaManager.checkMediaEntityPicked(clickedEntity)
    ) {
      return;
    }

    // 3️⃣ If house clicked (preloaded houses layer OR a realtime/user-added property)
    const isPreloadedHouse =
      housesDataSource &&
      housesDataSource.entities.contains(clickedEntity);

    const isRealtimeProperty =
      window.realtimePropertiesDataSource &&
      window.realtimePropertiesDataSource.entities.contains(clickedEntity);

    if (isPreloadedHouse || isRealtimeProperty) {

      const propertyData =
        getCustomHouseData(clickedEntity);

      addPinAndFlyToEntity(
        clickedEntity,
        propertyData
      );

      // ✅ SHOW BUTTON / DETAILS CARD
      showAddBannerButton(clickedEntity);

    }

    // 🚰 Manhole entity clicked
    else if (
      clickedEntity.properties &&
      clickedEntity.properties.getValue &&
      clickedEntity.properties.getValue(viewer.clock.currentTime)?.type === "manhole"
    ) {
      const props = clickedEntity.properties.getValue(viewer.clock.currentTime);
      const manholeId = props.manholeId;
      if (manholeId && typeof window.showManholeDetailsPanel === "function") {
        const data = typeof window.getManholeDataById === "function"
          ? window.getManholeDataById(manholeId)
          : null;
        if (typeof window.closeBannerSection === "function") window.closeBannerSection();
        if (typeof window.closePoleDetailsPanel === "function") window.closePoleDetailsPanel();
        if (typeof window.closePipelineDetailsPanel === "function") window.closePipelineDetailsPanel();
        window.showManholeDetailsPanel(data || { manholeId });
      }
    }

    // 🏧 ATM entity clicked
    else if (
      clickedEntity.properties &&
      clickedEntity.properties.getValue &&
      clickedEntity.properties.getValue(viewer.clock.currentTime)?.type === "atm"
    ) {
      const props = clickedEntity.properties.getValue(viewer.clock.currentTime);
      const atmId = props.atmId;
      if (atmId && typeof window.showAtmDetailsPanel === "function") {
        const data = typeof window.getAllAtmData === "function"
          ? window.getAllAtmData().find((a) => a._id === atmId)
          : null;
        if (typeof window.closeBannerSection === "function") window.closeBannerSection();
        if (typeof window.closePoleDetailsPanel === "function") window.closePoleDetailsPanel();
        if (typeof window.closeManholeDetailsPanel === "function") window.closeManholeDetailsPanel();
        if (typeof window.closePipelineDetailsPanel === "function") window.closePipelineDetailsPanel();
        window.showAtmDetailsPanel(data || { atmId });
      }
    }

    // 🛠 Pipeline entity clicked
    else if (
      clickedEntity.name &&
      String(clickedEntity.name).startsWith("sewage-pipeline-")
    ) {
      const pipelineId = String(clickedEntity.name).replace("sewage-pipeline-", "");
      if (pipelineId && typeof window.showPipelineDetailsPanel === "function") {
        const data = window.sewagePipelineDataIndex
          ? window.sewagePipelineDataIndex.get(pipelineId)
          : null;
        if (typeof window.closeBannerSection === "function") window.closeBannerSection();
        if (typeof window.closePoleDetailsPanel === "function") window.closePoleDetailsPanel();
        if (typeof window.closeManholeDetailsPanel === "function") window.closeManholeDetailsPanel();
        window.showPipelineDetailsPanel(data || { pipelineId });
      }
    }

    else {

      // Clicked other entity
      if (searchPinEntity) {

        viewer.entities.remove(
          searchPinEntity
        );

        searchPinEntity = null;

      }

      viewer.selectedEntity =
        clickedEntity;

    }

  }

  else {

    // Clicked ground
    if (searchPinEntity) {

      viewer.entities.remove(
        searchPinEntity
      );

      searchPinEntity = null;

    }

    viewer.selectedEntity =
      undefined;

  }

},
Cesium.ScreenSpaceEventType.LEFT_CLICK);
// === END: NAYA ON-CLICK PIN FEATURE ===

// ================================
// GLOBAL CLICK FOR STREET VIEW
// ================================
const streetViewHandler =
  new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

let streetViewClickCount = 0;

streetViewHandler.setInputAction((movement) => {

  const cartesian = viewer.scene.pickPosition(movement.position);
  if (!cartesian) return;

  const cartographic =
    Cesium.Cartographic.fromCartesian(cartesian);

  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);

  // Save globally
  window.streetViewState.lat = lat;
  window.streetViewState.lon = lon;

  streetViewClickCount += 1;
  if (streetViewClickCount < 2) {
    return;
  }

  streetViewClickCount = 0;

  console.log("Global StreetView location:", lat, lon);

}, Cesium.ScreenSpaceEventType.LEFT_CLICK);


// === BADLAAV 4: Hide search results when clicking outside ===
document.addEventListener("click", function (event) {
  const searchContainer = document.getElementById("search-container");
  if (!searchContainer.contains(event.target)) {
    document.getElementById("search-results").innerHTML = "";
  }
});
// === END BADLAAV 4 ===

window.onload = function () {
  initMeasurementTool(viewer);

  document.getElementById("btnDistance").onclick = startDistanceMeasure;
  document.getElementById("btnArea").onclick = startAreaMeasure;
  document.getElementById("btnHeight").onclick = startHeightMeasure;
};

window.addEventListener("load", () => {
    if (window.PolygonQueryTool) {
        PolygonQueryTool.init();
    }
});

// Sabse aakhir mein, default model load karo
loadDefaultModel();