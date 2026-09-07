(function () {
  // Same API-base resolution pattern as pole_placement.js / manhole_placement.js
  // (Glove backend on port 4000, where poles/manholes also live).
  function resolveAtmApiBase() {
    if (typeof window.resolveGloveApiBase === "function") {
      return `${window.resolveGloveApiBase()}/atms`;
    }

    if (window.GLOVE_BACKEND_URL) {
      return `${window.GLOVE_BACKEND_URL.replace(/\/$/, "")}/api/atms`;
    }

    const { protocol, hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (port === "3001") {
      return `${protocol}//${hostname}:4001/api/atms`;
    }

    if (isLocalHost && port && port !== "4001") {
      return `${protocol}//${hostname}:4001/api/atms`;
    }

    return "/api/atms";
  }

  const ATM_API_BASE = resolveAtmApiBase();

  const ATM_TYPE_CONFIG = {
    onsite: { label: "Onsite ATM", color: "#1e88e5" },
    offsite: { label: "Offsite ATM", color: "#2e7d32" },
    mobile: { label: "Mobile ATM", color: "#ef6c00" },
  };
  const DEFAULT_ATM_TYPE = "offsite";

  const atmEntities = new Map(); // dbId -> main clickable entity
  const atmComponentEntities = new Map(); // dbId -> [entities]
  const atmSearchIndex = new Map();
  const atmIdIndex = new Map();
  const atmDataIndex = new Map();
  const atmFormState = {
    pendingCartesian: null,
  };

  let clickHandler = null;
  let isAtmCaptureActive = false;

  function getViewer() {
    return typeof viewer !== "undefined" ? viewer : window.viewer;
  }

  function normalizeAtmType(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\/-]+/g, "_");

    return Object.prototype.hasOwnProperty.call(ATM_TYPE_CONFIG, normalized)
      ? normalized
      : DEFAULT_ATM_TYPE;
  }

  function getAtmTypeConfig(value) {
    return ATM_TYPE_CONFIG[normalizeAtmType(value)] || ATM_TYPE_CONFIG[DEFAULT_ATM_TYPE];
  }

  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Realistic-ish "ATM kiosk" visual made of a few stacked/offset boxes,
  // similar in spirit to how manhole/pole build up their look from
  // multiple primitives instead of one flat shape.
  const EARTH_RADIUS_METERS = 6378137;

  function createAtmVisualization(cesiumViewer, cartesianPosition, atmType) {
    const config = getAtmTypeConfig(atmType);
    const components = [];

    const cartographic = Cesium.Cartographic.fromCartesian(cartesianPosition);
    const groundHeight = cartographic.height || 0;
    const longitude = cartographic.longitude;
    const latitude = cartographic.latitude;
    const latCos = Math.max(0.2, Math.cos(latitude));

    function offsetPosition(eastMeters, northMeters, heightAboveGround) {
      return Cesium.Cartesian3.fromRadians(
        longitude + eastMeters / (EARTH_RADIUS_METERS * latCos),
        latitude + northMeters / EARTH_RADIUS_METERS,
        groundHeight + heightAboveGround
      );
    }

    // Machine casing colors modeled on a real free-standing ATM kiosk:
    // light grey/white body, dark screen recess, blue signage on top.
    const CASING_COLOR = "#d9dce1"; // light grey/white body
    const CASING_SHADE_COLOR = "#aeb4bc"; // slightly darker side/trim
    const SIGN_BLUE = "#2f8fe0"; // ATM signage blue, like the reference photo

    const cabinetHeight = 1.5;
    const cabinetWidth = 0.9;
    const cabinetDepth = 0.55;

    // Base plinth (concrete/dark base the kiosk stands on)
    const base = cesiumViewer.entities.add({
      position: offsetPosition(0, 0, 0.05),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth + 0.2, cabinetDepth + 0.2, 0.1),
        material: Cesium.Color.fromCssColorString("#3a3a3a"),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });
    components.push(base);

    // Main cabinet body — light grey/white casing (matches real ATM look)
    const cabinet = cesiumViewer.entities.add({
      position: offsetPosition(0, 0, 0.1 + cabinetHeight / 2),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth, cabinetDepth, cabinetHeight),
        material: Cesium.Color.fromCssColorString(CASING_COLOR),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#7a7f87"),
      },
    });
    components.push(cabinet);

    // Darker side trim strip down the front, like the moulded edge on a real unit
    const sideTrim = cesiumViewer.entities.add({
      position: offsetPosition(-cabinetWidth * 0.42, cabinetDepth / 2 + 0.005, 0.1 + cabinetHeight / 2),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.1, 0.01, cabinetHeight),
        material: Cesium.Color.fromCssColorString(CASING_SHADE_COLOR),
        outline: false,
      },
    });
    components.push(sideTrim);

    // Screen panel (dark inset on the front face, angled kiosk look)
    const screen = cesiumViewer.entities.add({
      position: offsetPosition(0.05, cabinetDepth / 2 + 0.01, 0.1 + cabinetHeight * 0.62),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.5, 0.03, cabinetHeight * 0.26),
        material: Cesium.Color.fromCssColorString("#12233a"),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });
    components.push(screen);

    // Faint blue glow on the screen so it reads as "on" from a distance
    const screenGlow = cesiumViewer.entities.add({
      position: offsetPosition(0.05, cabinetDepth / 2 + 0.02, 0.1 + cabinetHeight * 0.62),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.4, 0.005, cabinetHeight * 0.18),
        material: Cesium.Color.fromCssColorString("#3fa9f5").withAlpha(0.85),
        outline: false,
      },
    });
    components.push(screenGlow);

    // Card / receipt slot
    const cardSlot = cesiumViewer.entities.add({
      position: offsetPosition(0.05, cabinetDepth / 2 + 0.01, 0.1 + cabinetHeight * 0.46),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.3, 0.015, cabinetHeight * 0.03),
        material: Cesium.Color.fromCssColorString("#111318"),
        outline: false,
      },
    });
    components.push(cardSlot);

    // Keypad slab below the screen
    const keypad = cesiumViewer.entities.add({
      position: offsetPosition(0.05, cabinetDepth / 2 + 0.01, 0.1 + cabinetHeight * 0.38),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.35, 0.02, cabinetHeight * 0.1),
        material: Cesium.Color.fromCssColorString("#1a1a1a"),
        outline: false,
      },
    });
    components.push(keypad);

    // Cash dispenser slot near the bottom
    const dispenser = cesiumViewer.entities.add({
      position: offsetPosition(0.05, cabinetDepth / 2 + 0.01, 0.1 + cabinetHeight * 0.18),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.32, 0.02, cabinetHeight * 0.05),
        material: Cesium.Color.fromCssColorString("#0d0d0d"),
        outline: false,
      },
    });
    components.push(dispenser);

    // Thin type-accent strip at the base of the cabinet, so onsite/offsite/mobile
    // is still visually distinguishable without recoloring the whole machine
    const typeStrip = cesiumViewer.entities.add({
      position: offsetPosition(0, cabinetDepth / 2 + 0.005, 0.1 + cabinetHeight * 0.06),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth * 0.9, 0.01, cabinetHeight * 0.04),
        material: Cesium.Color.fromCssColorString(config.color),
        outline: false,
      },
    });
    components.push(typeStrip);

    // Blue "ATM" signage box on top, like the light-blue header on a real machine
    const signBox = cesiumViewer.entities.add({
      position: offsetPosition(0, 0, 0.1 + cabinetHeight + 0.14),
      box: {
        dimensions: new Cesium.Cartesian3(cabinetWidth + 0.15, cabinetDepth + 0.25, 0.28),
        material: Cesium.Color.fromCssColorString(SIGN_BLUE),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#1c5fa0"),
      },
    });
    components.push(signBox);

    // "ATM" text billboard on the sign, always faces the camera so it's readable
    // from any angle/distance — mirrors the blue ATM signage in the reference photo
    const signLabel = cesiumViewer.entities.add({
      position: offsetPosition(0, cabinetDepth / 2 + 0.15, 0.1 + cabinetHeight + 0.14),
      billboard: {
        image: makeAtmSignCanvas(),
        width: 46,
        height: 20,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    components.push(signLabel);

    return components;
  }

  let atmSignCanvasCache = null;
  function makeAtmSignCanvas() {
    if (atmSignCanvasCache) {
      return atmSignCanvasCache;
    }

    const width = 128;
    const height = 56;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    // Rounded blue signage plate, like the ATM header in the reference photo
    const radius = 10;
    ctx.fillStyle = "#2f8fe0";
    ctx.strokeStyle = "#1c5fa0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ATM", width / 2, height / 2 + 2);

    atmSignCanvasCache = canvas;
    return canvas;
  }

  // Stores an ATM's data in the search indexes WITHOUT drawing anything on
  // the map. This is what runs for every ATM on page load, so search/autocomplete
  // works immediately, but nothing appears on the globe until the user searches.
  function indexAtmMetadata(atmData) {
    const { _id, type } = atmData || {};
    if (!_id || atmDataIndex.has(_id)) {
      return;
    }

    const searchableText = `${atmData.atmId || ""} ${atmData.bankName || ""} ${type || ""}`.toLowerCase();

    atmDataIndex.set(_id, atmData);
    atmSearchIndex.set(_id, searchableText);
    atmIdIndex.set(_id, String(atmData.atmId || "").toLowerCase());
  }

  // Actually draws the ATM kiosk on the map. Called only when the ATM is
  // freshly placed via the form, or when the user searches for/selects an
  // ATM that hasn't been drawn yet (see ensureAtmVisualized below).
  function addAtmToScene(atmData) {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return;
    }

    const { _id, position, type } = atmData;
    if (!_id || atmEntities.has(_id)) {
      return;
    }

    if (!position || position.longitude === undefined || position.latitude === undefined) {
      return;
    }

    indexAtmMetadata(atmData);

    const cartesianPosition = Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      position.height || 0
    );

    const components = createAtmVisualization(cesiumViewer, cartesianPosition, type);
    if (components.length === 0) {
      return;
    }

    const clickEntity = cesiumViewer.entities.add({
      position: cartesianPosition,
      ellipsoid: {
        radii: new Cesium.Cartesian3(1.2, 1.2, 1.2),
        material: Cesium.Color.WHITE.withAlpha(0.01),
        outline: false,
      },
      properties: {
        type: "atm",
        atmId: _id,
      },
    });
    components.push(clickEntity);

    atmEntities.set(_id, clickEntity);
    atmComponentEntities.set(_id, components);
  }

  // Draws the ATM on the map on demand (if it isn't already drawn) using the
  // metadata already indexed from loadAllAtms(). Returns true if the ATM is
  // now on the map (either it already was, or was just created).
  function ensureAtmVisualized(dbId) {
    if (!dbId) {
      return false;
    }
    if (atmEntities.has(dbId)) {
      return true;
    }
    const atmData = atmDataIndex.get(dbId);
    if (!atmData) {
      return false;
    }
    addAtmToScene(atmData);
    return atmEntities.has(dbId);
  }

  function normalizeAtmSearchValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^atm\s*[:\-\s]?/i, "")
      .replace(/\s+/g, "");
  }

  function getAtmSuggestions(rawQuery, limit = 8) {
    const query = normalizeAtmSearchValue(rawQuery);
    if (!query) {
      return [];
    }

    const suggestions = [];
    atmDataIndex.forEach((atmData, dbId) => {
      const searchableText = atmSearchIndex.get(dbId) || "";
      const normalizedAtmId = normalizeAtmSearchValue(atmIdIndex.get(dbId) || "");

      if (searchableText.includes(query) || normalizedAtmId.includes(query) || query.includes(normalizedAtmId)) {
        suggestions.push({
          ...atmData,
          _id: dbId,
        });
      }
    });

    return suggestions.slice(0, Math.max(1, limit));
  }

  function getAtmDataById(dbIdOrAtmId) {
    if (atmDataIndex.has(dbIdOrAtmId)) {
      return atmDataIndex.get(dbIdOrAtmId);
    }

    const normalizedTarget = normalizeAtmSearchValue(dbIdOrAtmId);
    for (const [dbId, businessId] of atmIdIndex.entries()) {
      if (normalizeAtmSearchValue(businessId) === normalizedTarget) {
        return atmDataIndex.get(dbId);
      }
    }

    return null;
  }

  function focusAtmById(atmIdOrDbId) {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return false;
    }

    const normalizedTarget = normalizeAtmSearchValue(atmIdOrDbId);
    if (!normalizedTarget) {
      return false;
    }

    let matchedDbId = atmEntities.has(atmIdOrDbId) ? atmIdOrDbId : null;
    if (!matchedDbId) {
      atmIdIndex.forEach((businessId, dbId) => {
        const normalizedBusinessId = normalizeAtmSearchValue(businessId || "");
        if (!matchedDbId && (normalizedBusinessId === normalizedTarget || normalizedBusinessId.includes(normalizedTarget))) {
          matchedDbId = dbId;
        }
      });
    }

    if (!matchedDbId) {
      return false;
    }

    // ATM is only drawn on the globe here, at the moment it's actually
    // searched for/selected — not when the map first loads.
    ensureAtmVisualized(matchedDbId);

    const mainEntity = atmEntities.get(matchedDbId);
    if (!mainEntity) {
      return false;
    }

    cesiumViewer.flyTo(mainEntity, {
      duration: 1.2,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0),
        Cesium.Math.toRadians(-35),
        60
      ),
    });

    showAtmDetailsPanel(matchedDbId);

    return true;
  }

  async function loadAllAtms() {
    if (typeof axios === "undefined") {
      return;
    }
    try {
      const response = await axios.get(`${ATM_API_BASE}/get-atms`);
      const atms = response.data?.atms || [];
      // Only index for search here — do NOT draw them on the map yet.
      // They should appear only when the user actually searches for one.
      atms.forEach((atm) => indexAtmMetadata(atm));
      console.log(`Indexed ${atms.length} ATMs for search (not shown until searched)`);
    } catch (error) {
      console.error("Failed to load ATMs:", error?.response?.data || error.message || error);
    }
  }

  function openAtmModal(cartesianPosition) {
    atmFormState.pendingCartesian = cartesianPosition;

    const idInput = document.getElementById("atmId");
    if (idInput) idInput.value = "";
    const bankInput = document.getElementById("atmBankName");
    if (bankInput) bankInput.value = "";
    const typeSelect = document.getElementById("atmType");
    if (typeSelect) typeSelect.value = DEFAULT_ATM_TYPE;
    const statusSelect = document.getElementById("atmStatus");
    if (statusSelect) statusSelect.value = "active";
    const dateInput = document.getElementById("atmInstallationDate");
    if (dateInput) dateInput.value = getTodayDateString();
    const notesInput = document.getElementById("atmNotes");
    if (notesInput) notesInput.value = "";

    const modal = document.getElementById("atmModal");
    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }

    if (idInput) {
      window.requestAnimationFrame(() => idInput.focus());
    }
  }

  function closeAtmModal() {
    const modal = document.getElementById("atmModal");
    const activeElement = document.activeElement;

    if (modal && activeElement instanceof HTMLElement && modal.contains(activeElement)) {
      const fallback =
        document.getElementById("searchInput") ||
        document.getElementById("atmId") ||
        document.body;
      if (fallback instanceof HTMLElement) fallback.focus();
    }

    if (modal) {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }

    atmFormState.pendingCartesian = null;
  }

  function getFormPayload() {
    if (!atmFormState.pendingCartesian) {
      return null;
    }

    const atmId = document.getElementById("atmId")?.value.trim();
    const bankName = document.getElementById("atmBankName")?.value.trim();
    const type = normalizeAtmType(document.getElementById("atmType")?.value);
    const status = document.getElementById("atmStatus")?.value.trim() || "active";
    const notes = document.getElementById("atmNotes")?.value.trim();
    const installationDate = document.getElementById("atmInstallationDate")?.value;

    if (!atmId || !bankName || !installationDate) {
      return null;
    }

    const cartographic = Cesium.Cartographic.fromCartesian(atmFormState.pendingCartesian);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const height = cartographic.height || 0;

    return {
      atmId,
      bankName,
      type,
      status,
      notes,
      installationDate,
      position: { longitude, latitude, height },
      x: atmFormState.pendingCartesian.x,
      y: atmFormState.pendingCartesian.y,
      z: atmFormState.pendingCartesian.z,
    };
  }

  function resetAtmForm() {
    const form = document.getElementById("atmForm");
    if (form) form.reset();
  }

  async function saveAtmWithForm(event) {
    event.preventDefault();

    if (typeof axios === "undefined") {
      return;
    }

    const payload = getFormPayload();
    if (!payload) {
      alert("Please fill in all required ATM fields");
      return;
    }

    try {
      const response = await axios.post(`${ATM_API_BASE}/add-atm`, payload);
      const savedAtm = response.data?.atm || payload;
      if (!savedAtm._id) {
        savedAtm._id = `atm-${Date.now()}`;
      }

      addAtmToScene(savedAtm);
      console.log("ATM saved:", savedAtm);

      resetAtmForm();
      closeAtmModal();
      if (isAtmCaptureActive) {
        document.getElementById("btnAtmTool")?.focus();
      }
    } catch (error) {
      console.error("Failed to save ATM:", error?.response?.data || error.message || error);
      const message = error?.response?.data?.message || "Failed to save ATM. Check console for details.";
      alert(message);
    }
  }

  function toggleAtmCapture(active) {
    isAtmCaptureActive = Boolean(active);

    const btn = document.getElementById("btnAtmTool");
    if (btn) {
      btn.classList.toggle("capture-active", isAtmCaptureActive);
      btn.title = isAtmCaptureActive ? "ATM Tool (active)" : "ATM Tool";
      btn.setAttribute("aria-label", isAtmCaptureActive ? "ATM Tool active" : "ATM Tool");
    }
  }

  function handleClick(clickEvent) {
    if (!isAtmCaptureActive) {
      return;
    }

    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return;
    }

    const ray = cesiumViewer.camera.getPickRay(clickEvent.position);
    const pickedPosition = cesiumViewer.scene.globe.pick(ray, cesiumViewer.scene);

    if (!pickedPosition) {
      return;
    }

    openAtmModal(pickedPosition);
  }

  // ── ATM Details Panel ──────────────────────────────
  function showAtmDetailsPanel(atmIdOrData) {
    const data = (typeof atmIdOrData === "object" && atmIdOrData !== null)
      ? atmIdOrData
      : atmDataIndex.get(atmIdOrData);

    if (!data) return;

    const section = document.getElementById("atmSection");
    if (!section) return;

    const config = getAtmTypeConfig(data.type);
    const el = (id) => document.getElementById(id);

    if (el("atmDataId")) el("atmDataId").textContent = data.atmId || "-";
    if (el("atmDataBank")) el("atmDataBank").textContent = data.bankName || "-";
    if (el("atmDataType")) el("atmDataType").textContent = config.label;
    if (el("atmDataStatus")) el("atmDataStatus").textContent = data.status || "-";
    if (el("atmDataDate")) {
      el("atmDataDate").textContent = data.installationDate
        ? new Date(data.installationDate).toLocaleDateString()
        : "-";
    }
    if (el("atmDataCoords")) {
      const lon = Number.isFinite(data?.position?.longitude) ? data.position.longitude.toFixed(6) : "-";
      const lat = Number.isFinite(data?.position?.latitude) ? data.position.latitude.toFixed(6) : "-";
      el("atmDataCoords").textContent = `${lon}, ${lat}`;
    }

    section.classList.add("pole-visible");
    section.setAttribute("aria-hidden", "false");
  }

  function closeAtmDetailsPanel() {
    const section = document.getElementById("atmSection");
    if (!section) return;
    section.classList.remove("pole-visible");
    section.setAttribute("aria-hidden", "true");
  }

  function handleAtmEntityPick(pickedObject) {
    if (!pickedObject || !Cesium.defined(pickedObject.id)) {
      return false;
    }
    const entity = pickedObject.id;
    const atmId = entity?.properties?.atmId?.getValue
      ? entity.properties.atmId.getValue()
      : entity?.properties?.atmId;

    if (!atmId || !atmDataIndex.has(atmId)) {
      return false;
    }

    showAtmDetailsPanel(atmId);
    return true;
  }

  function initializeAtmPlacement() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return;
    }

    if (clickHandler) {
      clickHandler.destroy();
    }

    clickHandler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
    clickHandler.setInputAction(handleClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    const form = document.getElementById("atmForm");
    form?.addEventListener("submit", saveAtmWithForm);

    const atmToolBtn = document.getElementById("btnAtmTool");
    atmToolBtn?.addEventListener("click", () => {
      toggleAtmCapture(!isAtmCaptureActive);
    });

    const closeBtn = document.getElementById("atmModalClose");
    closeBtn?.addEventListener("click", closeAtmModal);

    const cancelBtn = document.getElementById("atmModalCancel");
    cancelBtn?.addEventListener("click", closeAtmModal);

    const modal = document.getElementById("atmModal");
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeAtmModal();
    });

    const sectionCloseBtn = document.getElementById("atmSectionCloseBtn");
    sectionCloseBtn?.addEventListener("click", closeAtmDetailsPanel);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAtmDetailsPanel();
      }
    });

    loadAllAtms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAtmPlacement);
  } else {
    initializeAtmPlacement();
  }

  // Expose globals (same pattern as pole_placement.js / manhole_placement.js)
  window.loadAllAtms = loadAllAtms;
  window.isAtmToolActive = function () {
    return isAtmCaptureActive;
  };
  window.showAtmDetailsPanel = showAtmDetailsPanel;
  window.closeAtmDetailsPanel = closeAtmDetailsPanel;
  window.handleAtmEntityPick = handleAtmEntityPick;
  window.getAllAtmData = () => Array.from(atmDataIndex.values());
  window.getAtmSuggestions = getAtmSuggestions;
  window.getAtmDataById = getAtmDataById;
  window.focusAtmById = focusAtmById;
  window.ensureAtmsLoaded = loadAllAtms;
  window.getAtmTypeLabel = (type) => getAtmTypeConfig(type).label;
})();