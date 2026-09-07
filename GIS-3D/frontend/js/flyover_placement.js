/* eslint-disable no-undef */
// File: js/flyover_placement.js
// Flyover tool: pipeline jaisa multi-point path capture, lekin detailed elevated
// structure banata hai — deck + railings + support pillars + road markings.
(function () {
  let flyoverPoints = [];
  let previewEntities = [];
  let clickHandler = null;
  let isPointCaptureActive = false;
  const renderedFlyoverEntityIds = new Set();
  const renderedFlyoverEntityGroups = new Map();
  const flyoverDataIndex = new Map();
  let cachedFlyoverCatalog = [];
  let flyoverCatalogLoadPromise = null;
  let areSavedFlyoversVisible = false;

  const EARTH_RADIUS_METERS = 6378137;
  const DECK_THICKNESS = 0.6;
  const RAILING_HEIGHT = 1.1;
  const RAILING_POST_RADIUS = 0.06;
  const RAIL_TUBE_RADIUS = 0.06;
  const PILLAR_SPACING_METERS = 20;
  const PILLAR_RADIUS = 0.55;
  const PIER_CAP_HEIGHT = 0.8;

  const FLYOVER_MATERIAL_CONFIG = {
    RCC: { label: "RCC (Concrete)", deck: "#8f9296", pillar: "#8f9296", accent: "#54575a" },
    PSC: { label: "PSC (Prestressed Concrete)", deck: "#9a9c94", pillar: "#9a9c94", accent: "#5a5c55" },
    Steel: { label: "Steel", deck: "#5b6b78", pillar: "#4a5661", accent: "#2e3740" },
  };

  function resolveFlyoverApiBase() {
    if (typeof window.resolveGloveApiBase === "function") {
      return `${window.resolveGloveApiBase()}/flyovers`;
    }

    if (window.GLOVE_BACKEND_URL) {
      return `${window.GLOVE_BACKEND_URL.replace(/\/$/, "")}/api/flyovers`;
    }

    const { protocol, hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (port === "3001") {
      return `${protocol}//${hostname}:4001/api/flyovers`;
    }

    if (isLocalHost && port && port !== "4001") {
      return `${protocol}//${hostname}:4001/api/flyovers`;
    }

    return "/api/flyovers";
  }

  const FLYOVER_API_BASE = resolveFlyoverApiBase();

  function getViewer() {
    return typeof viewer !== "undefined" ? viewer : window.viewer;
  }

  function getInputValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function setStatus(message, isError) {
    const statusEl = document.getElementById("flyoverStatusMessage");
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function focusFlyoverId() {
    window.requestAnimationFrame(() => {
      document.getElementById("flyoverId")?.focus();
    });
  }

  function updatePointCount() {
    const pointCountEl = document.getElementById("flyoverPointCount");
    if (pointCountEl) {
      pointCountEl.textContent = `${flyoverPoints.length} points selected`;
    }
  }

  function getMaterialConfig(material) {
    return FLYOVER_MATERIAL_CONFIG[material] || FLYOVER_MATERIAL_CONFIG.RCC;
  }

  function normalizeFlyoverId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .trim();
  }

  // ── Geometry helpers (planar approximation, accurate enough for flyover spans) ──

  function lonScaleAt(latDeg) {
    return Math.max(0.2, Math.cos((latDeg * Math.PI) / 180)) * 111320;
  }

  function metersToDegLon(latDeg, meters) {
    return meters / lonScaleAt(latDeg);
  }

  function metersToDegLat(meters) {
    return meters / 111320;
  }

  function bearingBetween(p1, p2) {
    const dx = (p2.longitude - p1.longitude) * lonScaleAt(p1.latitude);
    const dy = (p2.latitude - p1.latitude) * 111320;
    return Math.atan2(dx, dy);
  }

  function averageHeading(t1, t2) {
    return Math.atan2(Math.sin(t1) + Math.sin(t2), Math.cos(t1) + Math.cos(t2));
  }

  function computeHeadings(points) {
    const headings = [];
    for (let i = 0; i < points.length; i += 1) {
      let theta;
      if (points.length < 2) {
        theta = 0;
      } else if (i === 0) {
        theta = bearingBetween(points[0], points[1]);
      } else if (i === points.length - 1) {
        theta = bearingBetween(points[i - 1], points[i]);
      } else {
        theta = averageHeading(
          bearingBetween(points[i - 1], points[i]),
          bearingBetween(points[i], points[i + 1])
        );
      }
      headings.push(theta);
    }
    return headings;
  }

  function offsetLonLat(point, headingRad, sideMeters) {
    const perpEast = Math.cos(headingRad) * sideMeters;
    const perpNorth = -Math.sin(headingRad) * sideMeters;

    return {
      longitude: point.longitude + metersToDegLon(point.latitude, perpEast),
      latitude: point.latitude + metersToDegLat(perpNorth),
    };
  }

  function segmentDistanceMeters(p1, p2) {
    const dx = (p2.longitude - p1.longitude) * lonScaleAt(p1.latitude);
    const dy = (p2.latitude - p1.latitude) * 111320;
    return Math.hypot(dx, dy);
  }

  function interpolatePoint(p1, p2, t) {
    return {
      longitude: p1.longitude + (p2.longitude - p1.longitude) * t,
      latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
      height: (p1.height || 0) + ((p2.height || 0) - (p1.height || 0)) * t,
    };
  }

  function buildPillarStations(points) {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    const stations = [points[0]];

    for (let i = 0; i < points.length - 1; i += 1) {
      const start = points[i];
      const end = points[i + 1];
      const distance = segmentDistanceMeters(start, end);

      if (distance > PILLAR_SPACING_METERS) {
        const steps = Math.floor(distance / PILLAR_SPACING_METERS);
        for (let s = 1; s <= steps; s += 1) {
          const t = (s * PILLAR_SPACING_METERS) / distance;
          if (t < 1) {
            stations.push(interpolatePoint(start, end, t));
          }
        }
      }

      stations.push(end);
    }

    return stations;
  }

  function toCesiumPosition(point, extraHeight = 0) {
    return Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, (point.height || 0) + extraHeight);
  }

  function toCesiumPositions(points, extraHeight = 0) {
    return points.map((point) => toCesiumPosition(point, extraHeight));
  }

  function createRectShape(widthMeters, thicknessMeters) {
    const hw = widthMeters / 2;
    const ht = thicknessMeters / 2;
    return [
      new Cesium.Cartesian2(-hw, -ht),
      new Cesium.Cartesian2(hw, -ht),
      new Cesium.Cartesian2(hw, ht),
      new Cesium.Cartesian2(-hw, ht),
    ];
  }

  function createTubeShape(radiusMeters, segments = 10) {
    const shape = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      shape.push(new Cesium.Cartesian2(Math.cos(angle) * radiusMeters, Math.sin(angle) * radiusMeters));
    }
    return shape;
  }

  // ── Detailed flyover builder: deck + railings + posts + markings + pillars ──

  function buildFlyoverEntities(cesiumViewer, points, meta, isPreview) {
    const entities = [];
    if (!cesiumViewer || !Array.isArray(points) || points.length < 2) {
      return entities;
    }

    const widthMeters = Number(meta?.width) > 0 ? Number(meta.width) : 8;
    const deckHeight = Number(meta?.deckHeight) > 0 ? Number(meta.deckHeight) : 7;
    const materialConfig = getMaterialConfig(meta?.material);
    const alpha = isPreview ? 0.75 : 0.97;
    const headings = computeHeadings(points);

    const add = (definition) => {
      const entity = cesiumViewer.entities.add(definition);
      entities.push(entity);
      return entity;
    };

    // Deck (rectangular cross-section swept along the 3D path).
    add({
      name: isPreview ? "Flyover Preview Deck" : `flyover-deck-${meta?.flyoverId}`,
      polylineVolume: {
        positions: toCesiumPositions(points, deckHeight),
        shape: createRectShape(widthMeters, DECK_THICKNESS),
        cornerType: Cesium.CornerType.MITERED,
        material: Cesium.Color.fromCssColorString(materialConfig.deck).withAlpha(alpha),
        outline: !isPreview,
        outlineColor: Cesium.Color.fromCssColorString(materialConfig.accent).withAlpha(alpha),
      },
    });

    // Centerline dashed road markings, sitting just above the deck surface.
    add({
      name: isPreview ? "Flyover Preview Markings" : `flyover-markings-${meta?.flyoverId}`,
      polyline: {
        positions: toCesiumPositions(points, deckHeight + DECK_THICKNESS / 2 + 0.05),
        width: 3,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.WHITE.withAlpha(alpha),
          dashLength: 8,
        }),
        clampToGround: false,
      },
    });

    // Left / right railing top rails (thin tubes offset from centerline).
    ["left", "right"].forEach((side) => {
      const sign = side === "left" ? 1 : -1;
      const railPoints = points.map((point, index) => {
        const offset = offsetLonLat(point, headings[index], sign * (widthMeters / 2));
        return {
          longitude: offset.longitude,
          latitude: offset.latitude,
          height: (point.height || 0) + deckHeight + DECK_THICKNESS / 2 + RAILING_HEIGHT,
        };
      });

      add({
        name: isPreview
          ? `Flyover Preview Rail ${side}`
          : `flyover-rail-${side}-${meta?.flyoverId}`,
        polylineVolume: {
          positions: toCesiumPositions(railPoints, 0),
          shape: createTubeShape(RAIL_TUBE_RADIUS),
          cornerType: Cesium.CornerType.ROUNDED,
          material: Cesium.Color.fromCssColorString(materialConfig.accent).withAlpha(alpha),
        },
      });

      // Vertical railing posts at every path vertex.
      points.forEach((point, index) => {
        const offset = offsetLonLat(point, headings[index], sign * (widthMeters / 2));
        const baseHeight = (point.height || 0) + deckHeight + DECK_THICKNESS / 2;
        const postCenter = Cesium.Cartesian3.fromDegrees(
          offset.longitude,
          offset.latitude,
          baseHeight + RAILING_HEIGHT / 2
        );

        add({
          position: postCenter,
          cylinder: {
            length: RAILING_HEIGHT,
            topRadius: RAILING_POST_RADIUS,
            bottomRadius: RAILING_POST_RADIUS,
            material: Cesium.Color.fromCssColorString(materialConfig.accent).withAlpha(alpha),
          },
        });
      });
    });

    // Support pillars along the path, spaced roughly every PILLAR_SPACING_METERS.
    const pillarStations = buildPillarStations(points);
    pillarStations.forEach((station) => {
      const groundHeight = station.height || 0;
      const deckBottom = groundHeight + deckHeight - DECK_THICKNESS / 2;
      const shaftHeight = Math.max(1, deckBottom - groundHeight - PIER_CAP_HEIGHT / 2);

      // Footing at ground level.
      add({
        position: Cesium.Cartesian3.fromDegrees(station.longitude, station.latitude, groundHeight + 0.15),
        box: {
          dimensions: new Cesium.Cartesian3(PILLAR_RADIUS * 3, PILLAR_RADIUS * 3, 0.3),
          material: Cesium.Color.fromCssColorString(materialConfig.accent).withAlpha(alpha),
        },
      });

      // Main shaft.
      add({
        position: Cesium.Cartesian3.fromDegrees(
          station.longitude,
          station.latitude,
          groundHeight + shaftHeight / 2 + 0.3
        ),
        cylinder: {
          length: shaftHeight,
          topRadius: PILLAR_RADIUS,
          bottomRadius: PILLAR_RADIUS * 1.1,
          material: Cesium.Color.fromCssColorString(materialConfig.pillar).withAlpha(alpha),
          outline: !isPreview,
          outlineColor: Cesium.Color.fromCssColorString(materialConfig.accent).withAlpha(alpha),
        },
      });

      // Pier cap supporting the deck.
      add({
        position: Cesium.Cartesian3.fromDegrees(station.longitude, station.latitude, deckBottom - PIER_CAP_HEIGHT / 2),
        box: {
          dimensions: new Cesium.Cartesian3(widthMeters * 0.55, PILLAR_RADIUS * 2.2, PIER_CAP_HEIGHT),
          material: Cesium.Color.fromCssColorString(materialConfig.accent).withAlpha(alpha),
        },
      });
    });

    return entities;
  }

  function clearPreviewEntities() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return;
    }

    previewEntities.forEach((entity) => cesiumViewer.entities.remove(entity));
    previewEntities = [];
  }

  function upsertPreview(points) {
    clearPreviewEntities();

    const cesiumViewer = getViewer();
    if (!cesiumViewer || points.length < 2) {
      return;
    }

    const meta = {
      width: Number(getInputValue("flyoverWidth")) || 8,
      deckHeight: Number(getInputValue("flyoverDeckHeight")) || 7,
      material: getInputValue("flyoverMaterial") || "RCC",
    };

    previewEntities = buildFlyoverEntities(cesiumViewer, points, meta, true);
  }

  function getPickCartographic(screenPosition) {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return null;
    }

    const scene = cesiumViewer.scene;
    let cartesian = null;

    if (scene.pickPositionSupported) {
      cartesian = scene.pickPosition(screenPosition);
    }

    if (!cartesian) {
      const ray = cesiumViewer.camera.getPickRay(screenPosition);
      cartesian = scene.globe.pick(ray, scene);
    }

    if (!cartesian) {
      return null;
    }

    return Cesium.Cartographic.fromCartesian(cartesian);
  }

  function addFlyoverPoint(lat, lng, height) {
    flyoverPoints.push({
      latitude: lat,
      longitude: lng,
      height: height || 0,
    });

    upsertPreview(flyoverPoints);
    updatePointCount();
    setStatus("Flyover point added. Continue selecting points along the road.", false);
  }

  function clearFlyoverPoints() {
    flyoverPoints.length = 0;
    updatePointCount();
    clearPreviewEntities();
  }

  function buildFlyoverPayload() {
    return {
      flyoverId: getInputValue("flyoverId"),
      width: Number(getInputValue("flyoverWidth")),
      deckHeight: Number(getInputValue("flyoverDeckHeight")),
      lanes: Number(getInputValue("flyoverLanes")) || 2,
      material: getInputValue("flyoverMaterial"),
      status: getInputValue("flyoverStatus"),
      installationDate: getInputValue("flyoverInstallationDate"),
      points: flyoverPoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        height: point.height,
      })),
    };
  }

  function validatePayload(payload) {
    if (!payload.flyoverId) {
      return "Flyover ID is required";
    }

    if (!Number.isFinite(payload.width) || payload.width <= 0) {
      return "Deck width must be a valid number";
    }

    if (!Number.isFinite(payload.deckHeight) || payload.deckHeight <= 0) {
      return "Deck height must be a valid number";
    }

    if (!payload.material) {
      return "Material is required";
    }

    if (!payload.status) {
      return "Status is required";
    }

    if (!payload.installationDate) {
      return "Installation date is required";
    }

    if (!Array.isArray(payload.points) || payload.points.length < 2) {
      return "Add at least two points to trace the flyover path";
    }

    return "";
  }

  function buildFlyoverSearchText(flyover) {
    return [
      flyover?.flyoverId,
      flyover?._id,
      flyover?.material,
      flyover?.status,
      flyover?.installationDate,
      Array.isArray(flyover?.points) ? flyover.points.length : "",
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .join(" ")
      .toLowerCase();
  }

  function indexFlyover(flyover, entityGroup) {
    if (!flyover) {
      return;
    }

    const key = normalizeFlyoverId(flyover.flyoverId || flyover._id);
    if (key) {
      flyoverDataIndex.set(key, flyover);
    }

    if (entityGroup && key) {
      renderedFlyoverEntityGroups.set(key, entityGroup);
      entityGroup.forEach((entity) => renderedFlyoverEntityIds.add(entity.id));
    }
  }

  async function fetchFlyoverCatalog(refresh = false) {
    if (!refresh && cachedFlyoverCatalog.length > 0) {
      return cachedFlyoverCatalog;
    }

    if (flyoverCatalogLoadPromise) {
      return flyoverCatalogLoadPromise;
    }

    flyoverCatalogLoadPromise = (async () => {
      const response = await fetch(FLYOVER_API_BASE, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch flyovers");
      }

      cachedFlyoverCatalog = Array.isArray(result.flyovers) ? result.flyovers : [];
      cachedFlyoverCatalog.forEach((flyover) => indexFlyover(flyover));
      return cachedFlyoverCatalog;
    })();

    try {
      return await flyoverCatalogLoadPromise;
    } finally {
      flyoverCatalogLoadPromise = null;
    }
  }

  function getFlyoverSuggestions(rawQuery, limit = 8) {
    const query = String(rawQuery || "").trim().toLowerCase();
    if (!query) {
      return [];
    }

    const prefixMatch = query.match(/^(?:flyover|fly|overbridge)\s*[:\-\s]?\s*(.*)$/i);
    const normalizedQuery = normalizeFlyoverId(prefixMatch ? prefixMatch[1] : query);

    const isFlyoverQuery =
      Boolean(prefixMatch) ||
      /^(fly[-\s]?)?flyover[-\s]?\d+/i.test(query) ||
      query.includes("flyover") ||
      query.includes("overbridge");

    if (!isFlyoverQuery && !normalizedQuery) {
      return [];
    }

    const suggestions = [];

    flyoverDataIndex.forEach((flyover, key) => {
      const searchableText = buildFlyoverSearchText(flyover);
      if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
        return;
      }

      suggestions.push({
        flyoverId: flyover.flyoverId || flyover._id || key,
        width: flyover.width,
        deckHeight: flyover.deckHeight,
        material: flyover.material,
        status: flyover.status,
      });
    });

    suggestions.sort((a, b) => {
      const aId = normalizeFlyoverId(a.flyoverId);
      const bId = normalizeFlyoverId(b.flyoverId);
      const aStarts = normalizedQuery ? aId.startsWith(normalizedQuery) : false;
      const bStarts = normalizedQuery ? bId.startsWith(normalizedQuery) : false;

      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }

      return String(a.flyoverId).localeCompare(String(b.flyoverId), undefined, { numeric: true });
    });

    return suggestions.slice(0, Math.max(1, limit));
  }

  async function ensureFlyoverVisible() {
    if (!areSavedFlyoversVisible) {
      await loadFlyovers();
    }
  }

  function focusFlyoverById(flyoverId) {
    const normalizedId = normalizeFlyoverId(flyoverId);
    if (!normalizedId) {
      return false;
    }

    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return false;
    }

    const entityGroup = renderedFlyoverEntityGroups.get(normalizedId);
    const deckEntity = entityGroup?.find((entity) => entity.name?.startsWith("flyover-deck-"));
    if (!deckEntity) {
      return false;
    }

    cesiumViewer.flyTo(deckEntity, {
      duration: 1.3,
      offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0), Cesium.Math.toRadians(-30), 260),
    });

    return true;
  }

  function updateFlyoverVisibility(rawQuery) {
    const query = String(rawQuery || "").trim().toLowerCase();
    const prefixMatch = query.match(/^(?:flyover|fly|overbridge)\s*[:\-\s]?\s*(.*)$/i);
    const normalizedQuery = normalizeFlyoverId(prefixMatch ? prefixMatch[1] : query);
    const shouldFilter = Boolean(prefixMatch) || /^(fly[-\s]?)?flyover[-\s]?\d+/i.test(query);

    renderedFlyoverEntityGroups.forEach((entityGroup, key) => {
      const show = !shouldFilter || !normalizedQuery || key.includes(normalizedQuery);
      entityGroup.forEach((entity) => {
        entity.show = shouldFilter ? show : areSavedFlyoversVisible;
      });
    });
  }

  function renderSavedFlyover(flyover) {
    const points = flyover?.points;
    const flyoverId = flyover?.flyoverId || flyover?._id;
    const cesiumViewer = getViewer();
    if (!cesiumViewer || !Array.isArray(points) || points.length < 2) {
      return;
    }

    const key = normalizeFlyoverId(flyoverId);
    if (renderedFlyoverEntityGroups.has(key)) {
      indexFlyover(flyover, renderedFlyoverEntityGroups.get(key));
      return;
    }

    const entityGroup = buildFlyoverEntities(cesiumViewer, points, flyover, false);
    indexFlyover(flyover, entityGroup);
  }

  function hideFlyovers() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return;
    }

    renderedFlyoverEntityIds.forEach((entityId) => {
      const entity = cesiumViewer.entities.getById(entityId);
      if (entity) {
        cesiumViewer.entities.remove(entity);
      }
    });

    renderedFlyoverEntityIds.clear();
    renderedFlyoverEntityGroups.clear();
    areSavedFlyoversVisible = false;
    setStatus("Flyovers hidden", false);

    const loadBtn = document.getElementById("btnLoadFlyovers");
    if (loadBtn) {
      loadBtn.textContent = "Load Flyovers";
    }
  }

  async function loadFlyovers() {
    try {
      const flyovers = await fetchFlyoverCatalog();
      flyovers.forEach((flyover) => renderSavedFlyover(flyover));

      areSavedFlyoversVisible = true;
      updateFlyoverVisibility(document.getElementById("searchInput")?.value || "");
      setStatus(`Loaded ${flyovers.length} flyovers`, false);

      const loadBtn = document.getElementById("btnLoadFlyovers");
      if (loadBtn) {
        loadBtn.textContent = "Hide Flyovers";
      }
    } catch (error) {
      setStatus(error.message || "Failed to load flyovers", true);
    }
  }

  async function toggleSavedFlyovers() {
    if (areSavedFlyoversVisible) {
      hideFlyovers();
      return;
    }

    await loadFlyovers();
  }

  async function saveFlyover() {
    const payload = buildFlyoverPayload();
    const validationMessage = validatePayload(payload);

    if (validationMessage) {
      setStatus(validationMessage, true);
      return;
    }

    try {
      const response = await fetch(`${FLYOVER_API_BASE}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save flyover");
      }

      setStatus("Flyover saved successfully", false);
      clearFlyoverPoints();

      if (result?.flyover) {
        cachedFlyoverCatalog = [
          result.flyover,
          ...cachedFlyoverCatalog.filter(
            (flyover) =>
              normalizeFlyoverId(flyover.flyoverId || flyover._id) !==
              normalizeFlyoverId(result.flyover.flyoverId || result.flyover._id)
          ),
        ];
        indexFlyover(result.flyover);
        renderSavedFlyover(result.flyover);
      }

      if (document.getElementById("flyoverPanel")?.classList.contains("hidden") === false) {
        focusFlyoverId();
      }

      if (areSavedFlyoversVisible) {
        await loadFlyovers();
      }
    } catch (error) {
      setStatus(error.message || "Failed to save flyover", true);
    }
  }

  function toggleCapture(active) {
    isPointCaptureActive = active;
    const addPointBtn = document.getElementById("btnAddFlyoverPoint");
    if (addPointBtn) {
      addPointBtn.classList.toggle("capture-active", active);
      addPointBtn.textContent = active ? "Adding Points..." : "Add Point";
    }

    setStatus(
      active ? "Click on map to trace the flyover path" : "Point capture paused",
      false
    );
  }

  function onSceneClick(movement) {
    if (!isPointCaptureActive) {
      return;
    }

    const cartographic = getPickCartographic(movement.position);
    if (!cartographic) {
      setStatus("Unable to capture point at clicked location", true);
      return;
    }

    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const lng = Cesium.Math.toDegrees(cartographic.longitude);
    const height = cartographic.height || 0;

    addFlyoverPoint(lat, lng, height);
  }

  function initializeClickCapture() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) {
      return;
    }

    if (clickHandler) {
      clickHandler.destroy();
    }

    clickHandler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
    clickHandler.setInputAction(onSceneClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  function setDefaultDate() {
    const dateInput = document.getElementById("flyoverInstallationDate");
    if (!dateInput || dateInput.value) {
      return;
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    dateInput.value = `${now.getFullYear()}-${month}-${day}`;
  }

  function bindUi() {
    const panel = document.getElementById("flyoverPanel");
    const toolBtn = document.getElementById("btnFlyoverTool");
    const closePanelBtn = document.getElementById("btnCloseFlyoverPanel");
    const addPointBtn = document.getElementById("btnAddFlyoverPoint");
    const saveBtn = document.getElementById("btnSaveFlyover");
    const loadBtn = document.getElementById("btnLoadFlyovers");
    const clearBtn = document.getElementById("btnClearFlyoverPoints");

    function setPanelVisibility(visible) {
      if (!panel) {
        return;
      }

      panel.classList.toggle("hidden", !visible);
      toolBtn?.classList.toggle("capture-active", visible);

      if (!visible && isPointCaptureActive) {
        toggleCapture(false);
      }

      if (visible) {
        setStatus("Use Add Point, then click multiple map locations along the road.", false);
        focusFlyoverId();
      }
    }

    toolBtn?.addEventListener("click", () => {
      const isHidden = panel?.classList.contains("hidden");
      setPanelVisibility(Boolean(isHidden));
      if (isHidden && !isPointCaptureActive) {
        toggleCapture(true);
      }
    });

    closePanelBtn?.addEventListener("click", () => setPanelVisibility(false));

    addPointBtn?.addEventListener("click", () => toggleCapture(!isPointCaptureActive));

    saveBtn?.addEventListener("click", saveFlyover);
    loadBtn?.addEventListener("click", toggleSavedFlyovers);

    clearBtn?.addEventListener("click", () => {
      clearFlyoverPoints();
      setStatus("Flyover points cleared", false);
      focusFlyoverId();
    });
  }

  function initializeFlyovers() {
    initializeClickCapture();
    bindUi();
    setDefaultDate();
    updatePointCount();
    fetchFlyoverCatalog().catch((error) => {
      console.warn("Failed to preload flyover catalog", error);
    });

    const loadBtn = document.getElementById("btnLoadFlyovers");
    if (loadBtn) {
      loadBtn.textContent = "Load Flyovers";
    }

    setStatus("Flyovers hidden. Search a specific flyover to show it.", false);
    if (!document.getElementById("flyoverPanel")?.classList.contains("hidden")) {
      focusFlyoverId();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFlyovers);
  } else {
    initializeFlyovers();
  }

  window.flyoverPoints = flyoverPoints;
  window.addFlyoverPoint = addFlyoverPoint;
  window.loadFlyovers = loadFlyovers;
  window.getFlyoverSuggestions = getFlyoverSuggestions;
  window.ensureFlyoverVisible = ensureFlyoverVisible;
  window.getAllFlyovers = () => fetchFlyoverCatalog();
  window.focusFlyoverById = focusFlyoverById;
  window.updateFlyoverVisibility = updateFlyoverVisibility;
  window.flyoverDataIndex = flyoverDataIndex;

  // ── Flyover Details Panel ─────────────────────────────
  let flyoverSectionAnimTimer = null;

  function showFlyoverDetailsPanel(flyoverIdOrData) {
    const data =
      typeof flyoverIdOrData === "object" && flyoverIdOrData !== null
        ? flyoverIdOrData
        : flyoverDataIndex.get(normalizeFlyoverId(String(flyoverIdOrData || "")));

    if (!data) return;

    const section = document.getElementById("flyoverSection");
    if (!section) return;

    if (flyoverSectionAnimTimer) {
      window.clearTimeout(flyoverSectionAnimTimer);
      flyoverSectionAnimTimer = null;
    }

    section.classList.remove("pole-opening");
    void section.offsetWidth;
    section.classList.add("pole-opening");
    flyoverSectionAnimTimer = window.setTimeout(() => {
      section.classList.remove("pole-opening");
      flyoverSectionAnimTimer = null;
    }, 420);

    const el = (id) => document.getElementById(id);
    if (el("flyoverDataId")) el("flyoverDataId").textContent = data.flyoverId || "-";
    if (el("flyoverDataWidth")) el("flyoverDataWidth").textContent = data.width != null ? `${data.width} m` : "-";
    if (el("flyoverDataDeckHeight"))
      el("flyoverDataDeckHeight").textContent = data.deckHeight != null ? `${data.deckHeight} m` : "-";
    if (el("flyoverDataMaterial")) el("flyoverDataMaterial").textContent = data.material || "-";
    if (el("flyoverDataStatus")) el("flyoverDataStatus").textContent = data.status || "-";
    if (el("flyoverDataDate"))
      el("flyoverDataDate").textContent = data.installationDate
        ? new Date(data.installationDate).toLocaleDateString()
        : "-";
    if (el("flyoverDataPoints"))
      el("flyoverDataPoints").textContent = Array.isArray(data.points) ? `${data.points.length} pts` : "-";

    section.classList.add("pole-visible");
    section.setAttribute("aria-hidden", "false");
  }

  function closeFlyoverDetailsPanel() {
    const section = document.getElementById("flyoverSection");
    if (!section) return;
    if (flyoverSectionAnimTimer) {
      window.clearTimeout(flyoverSectionAnimTimer);
      flyoverSectionAnimTimer = null;
    }
    section.classList.remove("pole-visible", "pole-opening");
    section.setAttribute("aria-hidden", "true");
  }

  window.showFlyoverDetailsPanel = showFlyoverDetailsPanel;
  window.closeFlyoverDetailsPanel = closeFlyoverDetailsPanel;

  document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("flyoverSectionCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeFlyoverDetailsPanel);
  });
})();
