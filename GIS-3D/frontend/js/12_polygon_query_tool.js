/* eslint-disable no-undef */
// File: js/12_polygon_query_tool.js
// Polygon Query Tool: draw a polygon on the map, then spatially query
// properties, poles, manholes and pipelines that fall inside it.
(function () {
  let pqHandler = null;
  let isPqCaptureActive = false;
  let pqPointsCartesian = [];
  let pqPointEntities = [];
  let pqPolygonEntity = null;
  let pqOutlineEntity = null;
  let pqLastResults = null;

  function getViewer() {
    return typeof viewer !== "undefined" ? viewer : window.viewer;
  }

  function getPickCartesian(screenPosition) {
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

    return cartesian;
  }

  function cartesianToLonLat(cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height || 0,
    };
  }

  function normalizePolygon(points) {
    const cloned = points.map((point) => ({
      longitude: point.longitude,
      latitude: point.latitude,
    }));

    if (cloned.length > 2) {
      const first = cloned[0];
      const last = cloned[cloned.length - 1];
      if (first.longitude !== last.longitude || first.latitude !== last.latitude) {
        cloned.push({ ...first });
      }
    }

    return cloned;
  }

  // ── Ray-casting point-in-polygon ───────────────────────
  function pointInPolygon(point, polygonPoints) {
    let inside = false;

    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].longitude;
      const yi = polygonPoints[i].latitude;
      const xj = polygonPoints[j].longitude;
      const yj = polygonPoints[j].latitude;

      const intersects =
        yi > point.latitude !== yj > point.latitude &&
        point.longitude < ((xj - xi) * (point.latitude - yi)) / ((yj - yi) || 1e-12) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  function orientation(a, b, c) {
    const value = (b.latitude - a.latitude) * (c.longitude - b.longitude) -
      (b.longitude - a.longitude) * (c.latitude - b.latitude);

    if (Math.abs(value) < 1e-12) {
      return 0;
    }

    return value > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return (
      Math.min(a.longitude, c.longitude) <= b.longitude &&
      b.longitude <= Math.max(a.longitude, c.longitude) &&
      Math.min(a.latitude, c.latitude) <= b.latitude &&
      b.latitude <= Math.max(a.latitude, c.latitude)
    );
  }

  function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) {
      return true;
    }

    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
  }

  function lineIntersectsPolygon(linePoints, polygonPoints) {
    if (!Array.isArray(linePoints) || linePoints.length < 2 || polygonPoints.length < 3) {
      return false;
    }

    if (linePoints.some((point) => pointInPolygon(point, polygonPoints))) {
      return true;
    }

    for (let i = 0; i < linePoints.length - 1; i += 1) {
      const a = linePoints[i];
      const b = linePoints[i + 1];

      for (let j = 0; j < polygonPoints.length - 1; j += 1) {
        const c = polygonPoints[j];
        const d = polygonPoints[j + 1];

        if (segmentsIntersect(a, b, c, d)) {
          return true;
        }
      }
    }

    return false;
  }

  // ── Drawing on the map ──────────────────────────────────
  function setStatus(message, isError = false) {
    const status = document.getElementById("polygonQueryStatus");
    if (!status) return;

    status.textContent = message;
    status.classList.toggle("pq-status-error", Boolean(isError));

    if (!message) {
      status.classList.remove("pq-status-visible");
      return;
    }

    status.classList.add("pq-status-visible");
  }

  function updateButtonState() {
    const btn = document.getElementById("btnPolygonQuery");
    if (!btn) return;
    btn.classList.toggle("pq-drawing-active", isPqCaptureActive);
  }

  function clearPolygonDrawing() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) return;

    if (pqPolygonEntity) {
      cesiumViewer.entities.remove(pqPolygonEntity);
      pqPolygonEntity = null;
    }

    if (pqOutlineEntity) {
      cesiumViewer.entities.remove(pqOutlineEntity);
      pqOutlineEntity = null;
    }

    pqPointEntities.forEach((entity) => cesiumViewer.entities.remove(entity));
    pqPointEntities = [];
    pqPointsCartesian = [];
  }

  function drawPreview(isClosed) {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) return;

    if (pqOutlineEntity) {
      cesiumViewer.entities.remove(pqOutlineEntity);
      pqOutlineEntity = null;
    }

    if (pqPolygonEntity) {
      cesiumViewer.entities.remove(pqPolygonEntity);
      pqPolygonEntity = null;
    }

    if (pqPointsCartesian.length >= 2) {
      pqOutlineEntity = cesiumViewer.entities.add({
        polyline: {
          positions: isClosed ? [...pqPointsCartesian, pqPointsCartesian[0]] : pqPointsCartesian,
          width: 3,
          material: Cesium.Color.fromCssColorString("#ffd23c"),
          clampToGround: true,
        },
      });
    }

    if (isClosed && pqPointsCartesian.length >= 3) {
      pqPolygonEntity = cesiumViewer.entities.add({
        polygon: {
          hierarchy: pqPointsCartesian,
          material: Cesium.Color.fromCssColorString("#ffd23c").withAlpha(0.2),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#ffd23c"),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
      });
    }
  }

  function addPoint(cartesian) {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) return;

    pqPointsCartesian.push(cartesian);
    const pointEntity = cesiumViewer.entities.add({
      position: cartesian,
      point: {
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString("#ffd23c"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    pqPointEntities.push(pointEntity);
    drawPreview(false);
    setStatus(`Polygon Query: ${pqPointsCartesian.length} point(s). Double-click to finish (min 3).`);
  }

  function setCaptureActive(active) {
    isPqCaptureActive = Boolean(active);
    updateButtonState();

    if (isPqCaptureActive) {
      clearPolygonDrawing();
      setStatus("Polygon Query: click points on the map, double-click to finish.");
    } else if (pqPointsCartesian.length === 0) {
      setStatus("");
    }
  }

  function setCaptureActiveSilently(active) {
    isPqCaptureActive = Boolean(active);
    updateButtonState();
  }

  function initializeHandler() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) return;

    pqHandler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);

    pqHandler.setInputAction((movement) => {
      if (!isPqCaptureActive) return;

      const cartesian = getPickCartesian(movement.position);
      if (!cartesian) return;

      addPoint(cartesian);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    pqHandler.setInputAction(async () => {
      if (!isPqCaptureActive || pqPointsCartesian.length < 3) return;

      drawPreview(true);
      setCaptureActiveSilently(false);

      try {
        await runPolygonQuery();
      } catch (error) {
        console.error("Polygon query failed", error);
        setStatus(error.message || "Polygon query failed", true);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  // ── Data gathering & spatial filtering ─────────────────
  function ensureDataReady() {
    const tasks = [];

    if (typeof window.loadPoles === "function") {
      tasks.push(Promise.resolve(window.loadPoles()).catch(() => null));
    }

    if (typeof window.ensureManholesLoaded === "function") {
      tasks.push(Promise.resolve(window.ensureManholesLoaded()).catch(() => null));
    }

    if (typeof window.getAllSewagePipelines === "function") {
      tasks.push(Promise.resolve(window.getAllSewagePipelines()).catch(() => null));
    }

    return Promise.all(tasks);
  }

  function collectPropertyRecords() {
    const cesiumViewer = getViewer();
    if (!cesiumViewer) return [];

    const currentTime = cesiumViewer.clock.currentTime;
    const records = [];

    function pushFromDataSource(ds) {
      if (!ds || !ds.entities) return;

      ds.entities.values.forEach((entity) => {
        if (!entity) return;

        let points = [];
        let singlePoint = null;

        if (entity.polygon) {
          try {
            const hierarchy = entity.polygon.hierarchy?.getValue
              ? entity.polygon.hierarchy.getValue(currentTime)
              : entity.polygon.hierarchy;
            points = (hierarchy?.positions || []).map(cartesianToLonLat);
          } catch (_error) {
            points = [];
          }
        } else if (entity.position) {
          try {
            const pos = entity.position.getValue
              ? entity.position.getValue(currentTime)
              : entity.position;
            if (pos) singlePoint = cartesianToLonLat(pos);
          } catch (_error) {
            singlePoint = null;
          }
        }

        if (!points.length && !singlePoint) return;

        let entityProps = {};
        try {
          entityProps = entity.properties && typeof entity.properties.getValue === "function"
            ? (entity.properties.getValue(currentTime) || {})
            : (entity.properties || {});
        } catch (_error) {
          entityProps = {};
        }

        const ptaxData = typeof window.getCustomHouseData === "function"
          ? window.getCustomHouseData(entity)
          : null;

        // Entity's own properties bag (real-time submissions carry full data
        // directly) take priority, falling back to the ptax lookup table.
        const propertyData = Object.assign({}, ptaxData || {}, entityProps || {});

        records.push({
          entity,
          entityId: entity.id,
          points,
          singlePoint,
          propertyData,
          propertyNumber: propertyData["Property Number"] ||
            propertyData.propertyNumber ||
            entity.name ||
            "Unknown",
          owner: propertyData["Name of the Property Owner"] || propertyData.ownerName || "N/A",
          usage: propertyData["Usage of Property"] || propertyData.usageType || propertyData.usage || "N/A",
          address: propertyData["Address of Property"] || propertyData.propertyAddress || "N/A",
        });
      });
    }

    pushFromDataSource(typeof housesDataSource !== "undefined" ? housesDataSource : null);
    pushFromDataSource(window.realtimePropertiesDataSource);

    return records;
  }

  async function filterItemsByPolygon(areaPolygon) {
    const poles = typeof window.getAllPoleData === "function" ? window.getAllPoleData() : [];
    const manholes = typeof window.getAllManholeData === "function" ? window.getAllManholeData() : [];
    const pipelinesRaw = typeof window.getAllSewagePipelines === "function"
      ? await window.getAllSewagePipelines()
      : [];
    const pipelines = Array.isArray(pipelinesRaw) ? pipelinesRaw : [];

    const properties = collectPropertyRecords().filter((property) => {
      if (property.singlePoint) {
        return pointInPolygon(property.singlePoint, areaPolygon);
      }
      if (property.points.some((point) => pointInPolygon(point, areaPolygon))) {
        return true;
      }
      return lineIntersectsPolygon(property.points, areaPolygon);
    });

    const poleMatches = poles.filter((pole) => {
      const point = pole?.position;
      if (!point || !Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) {
        return false;
      }
      return pointInPolygon({ longitude: point.longitude, latitude: point.latitude }, areaPolygon);
    });

    const manholeMatches = manholes.filter((manhole) => {
      const point = manhole?.position;
      if (!point || !Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) {
        return false;
      }
      return pointInPolygon({ longitude: point.longitude, latitude: point.latitude }, areaPolygon);
    });

    const pipelineMatches = pipelines.filter((pipeline) => {
      const points = Array.isArray(pipeline?.points)
        ? pipeline.points
          .filter((point) => Number.isFinite(point?.longitude) && Number.isFinite(point?.latitude))
          .map((point) => ({ longitude: point.longitude, latitude: point.latitude }))
        : [];
      return lineIntersectsPolygon(points, areaPolygon);
    });

    return {
      properties,
      poles: poleMatches,
      manholes: manholeMatches,
      pipelines: pipelineMatches,
    };
  }

  async function runPolygonQuery() {
    setStatus("Polygon Query: loading data…");

    await ensureDataReady();

    const areaPolygon = normalizePolygon(pqPointsCartesian.map(cartesianToLonLat));
    clearPolygonDrawing();
    setStatus("");

    const results = await filterItemsByPolygon(areaPolygon);

    pqLastResults = results;
    openResultsWindow(results, areaPolygon.slice(0, -1));

    const total = results.properties.length + results.poles.length +
      results.manholes.length + results.pipelines.length;
    setStatus(`Polygon Query complete — ${total} result(s) found.`);
    window.setTimeout(() => setStatus(""), 3000);
  }

  // ── Property centroid helper (properties only have polygon points) ──
  function centroidOf(points) {
    if (!Array.isArray(points) || points.length === 0) return null;
    const sum = points.reduce(
      (acc, p) => ({ longitude: acc.longitude + p.longitude, latitude: acc.latitude + p.latitude }),
      { longitude: 0, latitude: 0 }
    );
    return {
      longitude: sum.longitude / points.length,
      latitude: sum.latitude / points.length,
    };
  }

  function csvEscape(value) {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function buildCsvRows(results) {
    const rows = [["Category", "Name/ID", "Type", "Material/Usage", "Status", "Latitude", "Longitude"]];

    results.properties.forEach((p) => {
      const c = p.singlePoint || centroidOf(p.points);
      rows.push(["Property", p.propertyNumber, p.usage, p.owner, "", c?.latitude ?? "", c?.longitude ?? ""]);
    });
    results.poles.forEach((p) => {
      rows.push(["Pole", p.poleNumber || p._id, p.type, p.voltage, "", p.position?.latitude ?? "", p.position?.longitude ?? ""]);
    });
    results.manholes.forEach((m) => {
      rows.push(["Manhole", m.manholeId, m.type, m.material, m.status, m.position?.latitude ?? "", m.position?.longitude ?? ""]);
    });
    results.pipelines.forEach((pl) => {
      rows.push(["Pipeline", pl.pipelineId || pl._id, "", pl.material, pl.status, "", ""]);
    });

    return rows;
  }

  // ── Results Window: opens a separate tab with a dark 2D Leaflet map ──
  function buildResultsWindowHtml(results, boundaryLonLat) {
    const csvRows = buildCsvRows(results);
    const csvRowsJson = JSON.stringify(csvRows);
    const boundaryJson = JSON.stringify(boundaryLonLat.map((p) => [p.latitude, p.longitude]));

    const propertyMarkers = results.properties.map((p) => {
      const c = p.singlePoint || centroidOf(p.points);
      return {
        lat: c?.latitude, lng: c?.longitude,
        title: p.propertyNumber || "Property",
        meta: `${p.usage || "N/A"} · Owner: ${p.owner || "N/A"}`,
      };
    }).filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

    const poleMarkers = results.poles.map((p) => ({
      lat: p.position?.latitude, lng: p.position?.longitude,
      title: p.poleNumber || p._id || "Pole",
      meta: `${p.type || "N/A"} · ${p.voltage || "N/A"}`,
    })).filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

    const manholeMarkers = results.manholes.map((m) => ({
      lat: m.position?.latitude, lng: m.position?.longitude,
      title: m.manholeId || "Manhole",
      meta: `${m.type || "N/A"} · ${m.material || "N/A"} · ${m.status || "Active"}`,
    })).filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

    const pipelineLines = results.pipelines.map((pl) => ({
      points: (pl.points || [])
        .filter((pt) => Number.isFinite(pt?.latitude) && Number.isFinite(pt?.longitude))
        .map((pt) => [pt.latitude, pt.longitude]),
      title: pl.pipelineId || pl._id || "Pipeline",
      meta: `${pl.diameter || "N/A"} mm · ${pl.material || "N/A"} · ${pl.status || "Active"}`,
    })).filter((pl) => pl.points.length >= 2);

    const total = propertyMarkers.length + poleMarkers.length + manholeMarkers.length + pipelineLines.length;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Polygon Query Results</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Sora:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<style>
  :root {
    color-scheme: dark;
    --bg: #071222;
    --bg-2: #0b1a31;
    --panel: rgba(7, 18, 35, 0.96);
    --panel-soft: rgba(15, 30, 56, 0.86);
    --line: rgba(111, 156, 238, 0.2);
    --line-strong: rgba(98, 159, 255, 0.42);
    --text: #d8e8ff;
    --muted: #87a8d8;
    --accent: #3e8dff;
    --accent-2: #26c5ff;
    --ok: #07c986;
    --warn: #f5b74f;
    --danger: #ff5f75;
    --topbar-height: 60px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--bg); font-family: "Manrope", "Segoe UI", Arial, sans-serif; }

  /* ── Top navbar ─────────────────────────────────────── */
  #topbar {
    position: fixed; top: 0; left: 0; right: 0; height: var(--topbar-height);
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    padding: 0 18px; background: rgba(8, 17, 33, 0.97); border-bottom: 1px solid var(--line);
    z-index: 1000; backdrop-filter: blur(8px);
  }
  .tb-left { display: flex; align-items: center; gap: 10px; min-width: 200px; }
  .brand-mark {
    width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center;
    font-family: "Sora", sans-serif; font-size: 12px; font-weight: 700;
    background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff;
  }
  .brand-copy { display: flex; flex-direction: column; line-height: 1.15; }
  .brand-title { font-family: "Sora", sans-serif; font-size: 14px; color: #eef4ff; font-weight: 700; }
  .brand-sub { font-size: 11px; color: var(--muted); }
  .tb-center {
    display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center;
    overflow-x: auto; scrollbar-width: none;
  }
  .tb-center::-webkit-scrollbar { display: none; }
  .filter-pill {
    display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--panel-soft); color: var(--muted);
    font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.15s;
  }
  .filter-pill .dot { width: 7px; height: 7px; border-radius: 50%; }
  .filter-pill.active { color: var(--text); border-color: var(--line-strong); background: rgba(62,141,255,0.12); }
  .filter-pill.off { opacity: 0.4; }
  .filter-pill:hover { border-color: var(--line-strong); }
  .tb-right { display: flex; align-items: center; gap: 10px; }
  #export-btn {
    display: flex; align-items: center; gap: 6px; border: none; border-radius: 8px;
    padding: 9px 16px; background: linear-gradient(180deg, #17d98a, var(--ok));
    color: #06210f; font-weight: 800; font-size: 13px; cursor: pointer; white-space: nowrap;
    box-shadow: 0 4px 14px rgba(7, 201, 134, 0.28);
  }
  #export-btn:hover { filter: brightness(1.07); }
  #export-btn:active { transform: translateY(1px); }

  /* ── Layout ──────────────────────────────────────────── */
  #app { position: absolute; top: var(--topbar-height); left: 0; right: 0; bottom: 0; display: flex; }
  #map { flex: 1; background: #dfe6ee; }
  #basemap-switcher {
    position: absolute; z-index: 900; top: 12px; right: 332px;
    display: flex; gap: 2px; padding: 3px; border-radius: 9px;
    background: var(--panel); border: 1px solid var(--line-strong); box-shadow: 0 4px 14px rgba(0,0,0,0.35);
  }
  .basemap-btn {
    border: none; background: transparent; color: var(--muted); font-size: 11px; font-weight: 700;
    padding: 6px 10px; border-radius: 6px; cursor: pointer;
  }
  .basemap-btn.active { background: var(--accent); color: #fff; }
  #sidebar {
    width: 320px; flex-shrink: 0; background: linear-gradient(180deg, var(--bg-2), var(--bg));
    border-left: 1px solid var(--line-strong); overflow-y: auto; color: var(--text);
    display: flex; flex-direction: column;
  }
  #search-bar {
    position: sticky; top: 0; z-index: 5; padding: 12px 14px; background: var(--panel);
    border-bottom: 1px solid var(--line); flex-shrink: 0;
  }
  #search-input {
    width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line);
    background: var(--panel-soft); color: var(--text); font-size: 12.5px; font-family: inherit;
    outline: none;
  }
  #search-input::placeholder { color: var(--muted); }
  #search-input:focus { border-color: var(--line-strong); }
  #list { flex: 1; overflow-y: auto; }
  .card-hidden { display: none !important; }
  .section-hdr {
    font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
    color: var(--muted); padding: 14px 16px 6px; display: flex; align-items: center; gap: 6px;
  }
  .section-hdr .dot { width: 6px; height: 6px; border-radius: 50%; }
  .card {
    margin: 4px 12px; padding: 9px 11px; border-radius: 10px; border: 1px solid var(--line);
    background: var(--panel-soft); cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.1s;
  }
  .card:hover { border-color: var(--line-strong); background: rgba(18,36,68,0.9); transform: translateX(-1px); }
  .card-name { font-size: 12.5px; font-weight: 700; color: var(--text); }
  .card-pipeline .card-name { color: var(--accent-2); }
  .card-manhole .card-name { color: var(--warn); }
  .card-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .empty { text-align: center; color: var(--muted); font-size: 12px; padding: 40px 16px; }
  .section-hidden { display: none !important; }

  /* ── Dark-theme the Leaflet chrome so it matches the app ── */
  .leaflet-popup-content-wrapper { background: var(--panel); color: var(--text); border: 1px solid var(--line-strong); border-radius: 10px; }
  .leaflet-popup-content { font-size: 12px; }
  .leaflet-popup-content b { color: var(--text); }
  .leaflet-popup-tip { background: var(--panel); }
  .leaflet-bar { border: 1px solid var(--line-strong) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
  .leaflet-bar a { background: var(--panel) !important; color: var(--text) !important; border-bottom: 1px solid var(--line) !important; }
  .leaflet-bar a:hover { background: var(--panel-soft) !important; color: var(--accent-2) !important; }
  .leaflet-control-attribution { background: var(--panel) !important; color: var(--muted) !important; border: 1px solid var(--line); border-radius: 6px; font-size: 10px; }
  .leaflet-control-attribution a { color: var(--accent-2) !important; }
</style>
</head>
<body>

<div id="topbar">
  <div class="tb-left">
    <div class="brand-mark">PQ</div>
    <div class="brand-copy">
      <div class="brand-title">Polygon Query Results</div>
      <div class="brand-sub" id="count-badge">${total} found</div>
    </div>
  </div>
  <div class="tb-center" id="category-filters"></div>
  <div class="tb-right">
    <button id="export-btn">⬇ Export CSV</button>
  </div>
</div>

<div id="app">
  <div id="map">
 <div id="basemap-switcher">
  <button class="basemap-btn active" data-layer="satellite">Satellite</button>
  <button class="basemap-btn" data-layer="streets">Streets</button>
  <button class="basemap-btn" data-layer="dark">Dark</button>
</div>
  </div>
  <div id="sidebar">
    <div id="search-bar">
      <input id="search-input" type="text" placeholder=" Search by ID, type, owner…" autocomplete="off" />
    </div>
    <div id="list"></div>
  </div>
</div>

<script>
  const properties = ${JSON.stringify(propertyMarkers)};
  const poles = ${JSON.stringify(poleMarkers)};
  const manholes = ${JSON.stringify(manholeMarkers)};
  const pipelines = ${JSON.stringify(pipelineLines)};
  const boundary = ${boundaryJson};
  const csvRows = ${csvRowsJson};

  const CATEGORY_META = {
    properties: { label: 'Properties', color: '#3e8dff', items: properties },
    poles:      { label: 'Poles',      color: '#07c986', items: poles },
    manholes:   { label: 'Manholes',   color: '#f5b74f', items: manholes },
    pipelines:  { label: 'Pipelines',  color: '#26c5ff', items: pipelines },
  };

  const map = L.map('map', { zoomControl: true }).setView(boundary[0] || [21.1458, 79.0882], 17);

  // ── Basemaps: default is the light "streets" map (not dark) ──
  const basemaps = {
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri', maxZoom: 25,
    }),
    streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 25,
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 25,
    }),
  };
  basemaps.satellite.addTo(map);

  document.querySelectorAll('.basemap-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      Object.values(basemaps).forEach((layer) => map.removeLayer(layer));
      basemaps[btn.dataset.layer].addTo(map);
      document.querySelectorAll('.basemap-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const boundsPoints = [];

  if (boundary.length >= 3) {
    L.polygon(boundary, { color: '#3e8dff', weight: 2, fillOpacity: 0.08 }).addTo(map);
    boundsPoints.push(...boundary);
  }

  function addMarker(item, color, group) {
    const marker = L.circleMarker([item.lat, item.lng], {
      radius: 7, color: '#0a1223', weight: 1.5, fillColor: color, fillOpacity: 0.95,
    });
    marker.bindPopup('<b>' + item.title + '</b><br>' + item.meta);
    marker.addTo(group);
    boundsPoints.push([item.lat, item.lng]);
    return marker;
  }

  const categoryLayers = {};
  const categoryMarkers = {};

  Object.keys(CATEGORY_META).forEach((key) => {
    const meta = CATEGORY_META[key];
    const group = L.layerGroup();
    categoryLayers[key] = group;

    if (key === 'pipelines') {
      categoryMarkers[key] = meta.items.map((pl) => {
        const line = L.polyline(pl.points, { color: meta.color, weight: 3 });
        line.bindPopup('<b>' + pl.title + '</b><br>' + pl.meta);
        line.addTo(group);
        boundsPoints.push(...pl.points);
        return line;
      });
    } else {
      categoryMarkers[key] = meta.items.map((item) => addMarker(item, meta.color, group));
    }

    if (meta.items.length) group.addTo(map);
  });

  if (boundsPoints.length) {
    map.fitBounds(boundsPoints, { padding: [30, 30] });
  }

  // ── Category filter pills (navbar) ──────────────────────
  const filtersEl = document.getElementById('category-filters');
  const activeCategories = new Set(Object.keys(CATEGORY_META));

  Object.keys(CATEGORY_META).forEach((key) => {
    const meta = CATEGORY_META[key];
    if (!meta.items.length) return;

    const pill = document.createElement('div');
    pill.className = 'filter-pill active';
    pill.innerHTML = '<span class="dot" style="background:' + meta.color + '"></span>' + meta.label + ' (' + meta.items.length + ')';
    pill.addEventListener('click', () => {
      if (activeCategories.has(key)) {
        activeCategories.delete(key);
        pill.classList.remove('active');
        pill.classList.add('off');
        map.removeLayer(categoryLayers[key]);
        document.querySelectorAll('.section-' + key).forEach((el) => el.classList.add('section-hidden'));
      } else {
        activeCategories.add(key);
        pill.classList.add('active');
        pill.classList.remove('off');
        categoryLayers[key].addTo(map);
        document.querySelectorAll('.section-' + key).forEach((el) => el.classList.remove('section-hidden'));
      }
    });
    filtersEl.appendChild(pill);
  });

  // ── Sidebar: categorized result cards ───────────────────
  const list = document.getElementById('list');

  function section(key) {
    const meta = CATEGORY_META[key];
    if (!meta.items.length) return;

    const hdr = document.createElement('div');
    hdr.className = 'section-hdr section-' + key;
    hdr.innerHTML = '<span class="dot" style="background:' + meta.color + '"></span>' + meta.label + ' (' + meta.items.length + ')';
    list.appendChild(hdr);

    meta.items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'card section-' + key + (key === 'pipelines' ? ' card-pipeline' : key === 'manholes' ? ' card-manhole' : '');
      card.dataset.key = key;
      card.dataset.idx = idx;
      card.dataset.search = (item.title + ' ' + item.meta).toLowerCase();
      card.innerHTML = '<div class="card-name">' + item.title + '</div><div class="card-meta">' + item.meta + '</div>';
      card.addEventListener('click', () => {
        const marker = categoryMarkers[key][idx];
        if (!marker) return;
        if (!map.hasLayer(categoryLayers[key])) categoryLayers[key].addTo(map);
        if (marker.getLatLng) {
          map.setView(marker.getLatLng(), 19);
        } else if (marker.getBounds) {
          map.fitBounds(marker.getBounds(), { padding: [30, 30] });
        }
        marker.openPopup();
      });
      list.appendChild(card);
    });
  }

  const total = properties.length + poles.length + manholes.length + pipelines.length;

  if (total === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No infrastructure found inside the selected polygon.';
    list.appendChild(empty);
  } else {
    section('properties');
    section('poles');
    section('manholes');
    section('pipelines');
  }

  function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (/[",\\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  }

  // ── Search box: filters sidebar cards + syncs map markers ──
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    document.querySelectorAll('.card').forEach((card) => {
      const matches = !query || (card.dataset.search || '').includes(query);
      card.classList.toggle('card-hidden', !matches);

      const key = card.dataset.key;
      const idx = Number(card.dataset.idx);
      const marker = categoryMarkers[key] && categoryMarkers[key][idx];
      if (!marker) return;

      const group = categoryLayers[key];
      const shouldShow = matches && activeCategories.has(key);
      if (shouldShow && !group.hasLayer(marker)) {
        group.addLayer(marker);
      } else if (!shouldShow && group.hasLayer(marker)) {
        group.removeLayer(marker);
      }
    });

    Object.keys(CATEGORY_META).forEach((key) => {
      const cards = document.querySelectorAll('.card.section-' + key);
      const anyVisible = Array.from(cards).some((c) => !c.classList.contains('card-hidden'));
      const hdr = document.querySelector('.section-hdr.section-' + key);
      if (hdr) hdr.classList.toggle('card-hidden', !anyVisible);
    });
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    const content = csvRows.map((row) => row.map(csvEscape).join(',')).join('\\r\\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
      + '-' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'polygon-query-' + stamp + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
<\/script>
</body>
</html>`;
  }

  function openResultsWindow(results, boundaryLonLat) {
    const html = buildResultsWindowHtml(results, boundaryLonLat);
    const resultsWindow = window.open("", "_blank");

    if (!resultsWindow) {
      setStatus("Popup blocked — allow popups for this site to view results.", true);
      return;
    }

    resultsWindow.document.open();
    resultsWindow.document.write(html);
    resultsWindow.document.close();
  }

  function exportResultsCsv() {
    if (!pqLastResults) {
      setStatus("Run a polygon query first.", true);
      return;
    }

    const rows = buildCsvRows(pqLastResults);
    const csvContent = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = `polygon-query-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // ── UI wiring ───────────────────────────────────────────
  function bindUi() {
    const toolBtn = document.getElementById("btnPolygonQuery");
    if (toolBtn) {
      toolBtn.addEventListener("click", () => {
        setCaptureActive(!isPqCaptureActive);
      });
    } else {
      console.warn("btnPolygonQuery not found");
    }

    const exportBtn = document.getElementById("pqExportCsv");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportResultsCsv);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isPqCaptureActive) {
        setCaptureActive(false);
        clearPolygonDrawing();
      }
    });
  }

  function init() {
    initializeHandler();
    bindUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.clearPolygonQuerySelection = clearPolygonDrawing;
  window.runPolygonQuery = runPolygonQuery;
  window.exportPolygonQueryCsv = exportResultsCsv;
})();