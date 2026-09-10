/* eslint-disable no-undef */
// File: js/1_config_globals.js

// Register last opened port/module in localStorage
try {
  localStorage.setItem("gis_active_module", "3d");
  localStorage.setItem("gis_last_port_module", "3d");
  localStorage.setItem("gis_last_port", "3001");
  localStorage.setItem("gis_last_port_url", window.location.origin);
} catch (e) {}

// Configure Cesium to handle CORS issues with KMZ files
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NDUyNzI0NS0xNzZmLTQ4ZDctYWY3MC1jMmY1MzQxZTc3NjkiLCJpZCI6MjY2NDUwLCJpYXQiOjE3MzkyNTQ2OTF9.ms2EiPBrQb7no-Hk3OX1haugWxAl6bYpbWhj-SH8aXA";

// CRITICAL: Set base URL to avoid CORS issues with workers
window.CESIUM_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.104/Build/Cesium/";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(2, {
      accessToken: Cesium.Ion.defaultAccessToken,
    })
  ),
  terrainProvider: Cesium.createWorldTerrain({
    requestVertexNormals: false,
    requestWaterMask: false,
  }),
  scene3DOnly: false,
  shouldAnimate: true,
  shadows: false,
  sceneMode: Cesium.SceneMode.SCENE3D,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  vrButton: false,
  infoBox: false,
  selectionIndicator: false,
});

// CRITICAL: Enable depth testing against terrain to prevent z-fighting
viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.globe.enableLighting = false;
viewer.scene.globe.showGroundAtmosphere = true;
viewer.scene.skyAtmosphere.show = true;
viewer.scene.fog.enabled = false;
viewer.scene.sun.show = true;
viewer.scene.moon.show = true;
viewer.scene.highDynamicRange = true;
viewer.scene.postProcessStages.fxaa.enabled = true;
viewer.scene.globe.maximumScreenSpaceError = 2.0;
viewer.scene.globe.loadingDescendantLimit = 20;
viewer.scene.globe.tileCacheSize = 100;
viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);

// Directly position camera to 3D terrain location immediately on startup
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(79.109468, 21.096398, 1200),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-30.0),
    roll: 0.0,
  },
});

// Disable default double-click behavior
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
  Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
);

let modelEntity = null;
let roadsDataSource = null;
let housesDataSource = null;
let uploadedFiles = {};
let textureUrlCache = {};
let debugMode = true;
let currentModelUrl = null;
let memoryCheckInterval = null;
let searchPinEntity = null;
const pinBuilder = new Cesium.PinBuilder();

// Street View shared state
window.streetViewState = {
  lat: null,
  lon: null
};

window.measurementState = {
  activeMode: null,
  positions: [],
  activeShape: null,
  pointEntities: []
};

function resolveBackendBase(explicitValue, proxyPrefix, localPort) {
  if (explicitValue) {
    return explicitValue.replace(/\/$/, "");
  }

  const { protocol, hostname, port } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (port === "4001" || (isLocalHost && port && port !== String(localPort))) {
    return `${protocol}//${hostname}:${localPort}`;
  }

  if (!port || port === "80" || port === "443") {
    return proxyPrefix;
  }

  return "";
}

window.resolveGloveBackendBase = function resolveGloveBackendBase() {
  return resolveBackendBase(window.GLOVE_BACKEND_URL, "/api/viewer", 4001);
};

window.resolveSurveyBackendBase = function resolveSurveyBackendBase() {
  return resolveBackendBase(window.PTAX_API_BASE || window.SURVEY_BACKEND_URL, "/survey", 4002);
};

window.resolveGloveApiBase = function resolveGloveApiBase() {
  const base = window.resolveGloveBackendBase();
  return base === "/api/viewer" ? base : `${base}/api`;
};

window.resolveSurveyApiBase = function resolveSurveyApiBase() {
  const base = window.resolveSurveyBackendBase();
  return `${base}/api`;
};
