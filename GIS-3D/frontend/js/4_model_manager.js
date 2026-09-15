/* eslint-disable no-undef */
// File: js/4_model_manager.js
// Logic bilkul change nahi kiya hai (except: both preset GLBs ab hamesha
// loaded rehte hain, dropdown sirf camera ko fly karta hai).

// File input handlers
const fileInput = document.getElementById("fileInput");
const uploadInput = document.getElementById("modelUpload");

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        const dataArray = fileContent.split(/\s+/);

        const zone = parseInt(dataArray[2], 10);
        const easting = parseFloat(dataArray[3]);
        const northing = parseFloat(dataArray[4]);
        const northernHemisphere = true;

        const latLng = utmToLatLng(
          zone,
          easting,
          northing,
          northernHemisphere
        );

        document.getElementById("latitude").value =
          latLng.latitude.toFixed(6);
        document.getElementById("longitude").value =
          latLng.longitude.toFixed(6);
        updateModelPosition();
      };
      reader.readAsText(file);
    }
  });
}

if (uploadInput) {
  uploadInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);

    showLoading(`Processing ${files.length} files...`);
    updateProgress(5);

    if (modelEntity) {
      viewer.entities.remove(modelEntity);
      modelEntity = null;
    }

    uploadedFiles = {};

    setTimeout(() => {
      files.forEach((file) => {
        uploadedFiles[file.name] = file;
      });

      debugLog("Files uploaded", Object.keys(uploadedFiles));
      updateProgress(30);
      createTextureUrlCache();
      updateFileStatus();
      updateProgress(50);

      const glbFile = findFileByExtension(uploadedFiles, ".glb");
      const gltfFile = findFileByExtension(uploadedFiles, ".gltf");
      const objFileName = findFileByExtension(uploadedFiles, ".obj");
      const daeFile = findFileByExtension(uploadedFiles, ".dae");

      if (glbFile) {
        handleGenericModelFile(uploadedFiles[glbFile]);
      } else if (gltfFile) {
        handleGenericModelFile(uploadedFiles[gltfFile]);
      } else if (objFileName) {
        handleObjFile(uploadedFiles[objFileName]);
      } else if (daeFile) {
        handleGenericModelFile(uploadedFiles[daeFile]);
      }

      updateProgress(90);
    }, 100);
  });
}

function handleObjFile(objFile) {
  const objReader = new FileReader();

  objReader.onload = function (e) {
    const objContent = e.target.result;
    const mtlFileName = findMtlForObj(objFile.name, uploadedFiles);

    if (mtlFileName) {
      debugLog("Found MTL file", mtlFileName);
      loadObjWithMtl(
        objContent,
        uploadedFiles[mtlFileName],
        objFile.name
      );
    } else {
      debugLog("No MTL file found, loading OBJ only");
      loadObjOnly(objContent, objFile.name);
    }
  };

  objReader.readAsText(objFile);
}

function loadObjWithMtl(objContent, mtlFile, objFileName) {
  const mtlReader = new FileReader();

  mtlReader.onload = function (e) {
    const mtlContent = e.target.result;
    debugLog("MTL content loaded", `Length: ${mtlContent.length}`);

    try {
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => resolveTextureUrl(url));

      const mtlLoader = new THREE.MTLLoader(manager);
      const materials = mtlLoader.parse(mtlContent, "");
      materials.preload();

      debugLog("Materials loaded", Object.keys(materials.materials));

      const objLoader = new THREE.OBJLoader(manager);
      objLoader.setMaterials(materials);

      const object = objLoader.parse(objContent);

      object.traverse((child) => {
        if (child.isMesh) {
          debugLog(`Mesh found: ${child.name}`, {
            material: child.material ? child.material.type : "none",
            hasTexture: !!(child.material && child.material.map),
          });

          if (child.material) {
            if (child.material.map) {
              child.material.needsUpdate = true;
              debugLog(`Texture applied to mesh: ${child.name}`);
            }

            child.material.side = THREE.DoubleSide;
            if (child.material.transparent === undefined) {
              child.material.transparent = false;
            }
          }
        }
      });

      convertAndAddToCesium(object, objFileName);
    } catch (error) {
      console.error("Error loading MTL file:", error);
      loadObjOnly(objContent, objFileName);
    }
  };

  mtlReader.readAsText(mtlFile);
}

function loadObjOnly(objContent, objFileName) {
  try {
    const objLoader = new THREE.OBJLoader();
    const object = objLoader.parse(objContent);

    object.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshLambertMaterial({
          color: 0x888888,
          side: THREE.DoubleSide,
        });
      }
    });

    convertAndAddToCesium(object, objFileName);
  } catch (error) {
    console.error("Error loading OBJ file:", error);
    alert("Error loading OBJ file. Please check the file format.");
  }
}

function convertAndAddToCesium(object, fileName) {
  if (modelEntity) {
    viewer.entities.remove(modelEntity);
  }

  const scene = new THREE.Scene();
  scene.add(object);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight2.position.set(-1, -1, -1);
  scene.add(directionalLight2);

  const exporter = new THREE.GLTFExporter();
  exporter.parse(
    scene,
    function (gltf) {
      let modelUrl;

      if (gltf instanceof ArrayBuffer) {
        modelUrl = URL.createObjectURL(
          new Blob([gltf], { type: "model/gltf-binary" })
        );
      } else {
        modelUrl = URL.createObjectURL(
          new Blob([JSON.stringify(gltf)], { type: "model/gltf+json" })
        );
      }

      addModelToCesium(modelUrl, fileName);
    },
    {
      binary: true,
      embedImages: true,
      includeCustomExtensions: false,
      animations: [],
      maxTextureSize: 4096,
      forcePowerOfTwoTextures: false,
      truncateDrawRange: false,
    }
  );
}

function addModelToCesium(modelUrl, fileName) {
  if (currentModelUrl) {
    URL.revokeObjectURL(currentModelUrl);
  }
  currentModelUrl = modelUrl;

  const longitude = parseFloat(
    document.getElementById("longitude").value
  );
  const latitude = parseFloat(document.getElementById("latitude").value);
  const height = parseFloat(document.getElementById("height").value);

  console.log(
    `Positioning model at: ${latitude}, ${longitude}, height: ${height}`
  );

  const position = Cesium.Cartesian3.fromDegrees(
    longitude,
    latitude,
    height
  );

  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(
      parseFloat(document.getElementById("heading").value || 0)
    ),
    Cesium.Math.toRadians(
      parseFloat(document.getElementById("pitch").value || 0)
    ),
    Cesium.Math.toRadians(
      parseFloat(document.getElementById("roll").value || 0)
    )
  );

  // Determine height reference based on height value
  const heightRef =
    height === 0
      ? Cesium.HeightReference.CLAMP_TO_GROUND
      : Cesium.HeightReference.RELATIVE_TO_GROUND;

  modelEntity = viewer.entities.add({
    name: fileName,
    position: position,
    heightReference: heightRef,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr
    ),
    model: {
      uri: modelUrl,
      scale: parseFloat(document.getElementById("scale").value || 1.0),
      minimumPixelSize: 128,
      maximumScale: 20000,
      allowPicking: true,
      show: true,
      heightReference: heightRef,
      shadows: Cesium.ShadowMode.DISABLED,
      imageBasedLightingFactor: new Cesium.Cartesian2(1.0, 1.0),
      colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
      colorBlendAmount: 0.5,
      // Color with alpha for opacity control
      color: Cesium.Color.WHITE.withAlpha(1.0),
    },
  });

  const cameraOffset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(0),
    Cesium.Math.toRadians(-15),
    1000
  );

  viewer.trackedEntity = modelEntity;

  setTimeout(() => {
    viewer.zoomTo(modelEntity, cameraOffset).then(() => {
      console.log("Model positioned and camera adjusted");
    });
  }, 1000);

  setTimeout(hideLoading, 500);

  console.log("Model added to Cesium:", fileName);
  document.getElementById("modelStatus").textContent = "Loaded";
  document.getElementById("modelStatus").className =
    "layer-status status-loaded";
  document.getElementById("modelToggle").checked = true;
  updateModelAdjustTargetLabel();
}

function handleGenericModelFile(file) {
  console.log(`Loading ${file.name} with terrain clamping`);

  const modelUrl = URL.createObjectURL(file);

  if (file.name.toLowerCase().endsWith(".glb")) {
    console.log("GLB file detected");
  }

  addModelToCesium(modelUrl, file.name);
}

// Real-time model adjustment now applies to whichever model is currently
// "active": the manually-uploaded custom model if one exists, otherwise
// the preset GLB (Manewada / Manish Nagar) selected in the navbar dropdown.
function getActiveModelEntity() {
  return modelEntity || presetModelEntities[currentModelId] || null;
}

// When "Apply to all uploaded models" is checked, live adjustments (and
// Save/Reset) act on every preset model entity currently on the map
// instead of just the one selected in the navbar dropdown.
function isApplyToAllModelsChecked() {
  const checkbox = document.getElementById("applyToAllModels");
  return !!(checkbox && checkbox.checked);
}

function getTargetModelEntities() {
  if (modelEntity) return [modelEntity];

  if (isApplyToAllModelsChecked()) {
    const entities = Object.values(presetModelEntities).filter(Boolean);
    if (entities.length) return entities;
  }

  const active = presetModelEntities[currentModelId];
  return active ? [active] : [];
}

function updateModelOrientation() {
  const targetEntities = getTargetModelEntities();
  targetEntities.forEach((targetEntity) => {
    const position = targetEntity.position.getValue(
      Cesium.JulianDate.now()
    );
    const heading = Cesium.Math.toRadians(
      parseFloat(document.getElementById("heading").value || 0)
    );
    const pitch = Cesium.Math.toRadians(
      parseFloat(document.getElementById("pitch").value || 0)
    );
    const roll = Cesium.Math.toRadians(
      parseFloat(document.getElementById("roll").value || 0)
    );

    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr
    );
    targetEntity.orientation = orientation;
  });
}

function updateModelPosition() {
  const targetEntities = getTargetModelEntities();
  targetEntities.forEach((targetEntity) => {
    const longitude = parseFloat(
      document.getElementById("longitude").value
    );
    const latitude = parseFloat(
      document.getElementById("latitude").value
    );
    const height = parseFloat(document.getElementById("height").value);

    const position = Cesium.Cartesian3.fromDegrees(
      longitude,
      latitude,
      height
    );
    targetEntity.position = position;

    if (height === 0) {
      targetEntity.model.heightReference =
        Cesium.HeightReference.CLAMP_TO_GROUND;
      targetEntity.heightReference =
        Cesium.HeightReference.CLAMP_TO_GROUND;
    } else {
      targetEntity.model.heightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;
      targetEntity.heightReference = Cesium.HeightReference.NONE;
    }

    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(
        parseFloat(document.getElementById("heading").value || 0)
      ),
      Cesium.Math.toRadians(
        parseFloat(document.getElementById("pitch").value || 0)
      ),
      Cesium.Math.toRadians(
        parseFloat(document.getElementById("roll").value || 0)
      )
    );

    targetEntity.orientation =
      Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    console.log(
      `Model repositioned to: ${latitude}, ${longitude}, height: ${height}`
    );
  });
}

// Reads the Scale slider and applies it live to whichever model(s) are active.
function updateActiveModelScale() {
  const targetEntities = getTargetModelEntities();
  targetEntities.forEach((targetEntity) => {
    if (targetEntity.model) {
      targetEntity.model.scale = parseFloat(
        document.getElementById("scale").value || 1.0
      );
    }
  });
}

// Updates the "Adjusting: <model>" caption in the sidebar panel so it's
// always clear which model the live controls are currently editing.
function updateModelAdjustTargetLabel() {
  const label = document.getElementById("modelAdjustTarget");
  if (!label) return;

  if (modelEntity) {
    label.textContent = "Adjusting: Uploaded Model";
  } else {
    const config = getModelConfig(currentModelId);
    label.textContent = `Adjusting: ${config ? config.label : currentModelId}`;
  }
}

// "Reset to Default" button in the Model Adjustment panel — clears any
// saved location for the active preset model and restores its transform
// from the hardcoded MODELS config. Has no default to reset to for a
// manually-uploaded model, so it's a no-op in that case.
function resetActiveModelTransform() {
  if (modelEntity) {
    console.log("No default transform to reset to for an uploaded model.");
    return;
  }

  const applyToAll = isApplyToAllModelsChecked();
  const targetIds = applyToAll ? MODELS.map((m) => m.id) : [currentModelId];

  const overrides = loadModelTransformOverrides();
  targetIds.forEach((id) => {
    if (overrides[id]) delete overrides[id];

    const config = getModelConfig(id);
    const entity = presetModelEntities[id];
    if (!config || !entity) return;

    const position = Cesium.Cartesian3.fromDegrees(
      config.longitude,
      config.latitude,
      config.height
    );
    entity.position = position;
    entity.model.heightReference =
      config.height === 0
        ? Cesium.HeightReference.CLAMP_TO_GROUND
        : Cesium.HeightReference.RELATIVE_TO_GROUND;
    entity.heightReference =
      config.height === 0
        ? Cesium.HeightReference.CLAMP_TO_GROUND
        : Cesium.HeightReference.NONE;

    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(config.heading),
      Cesium.Math.toRadians(config.pitch),
      Cesium.Math.toRadians(config.roll)
    );
    entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr
    );
    if (entity.model) entity.model.scale = parseFloat(config.scale);
  });
  saveModelTransformOverrides(overrides);

  const activeConfig = getModelConfig(currentModelId);
  if (activeConfig) {
    document.getElementById("longitude").value = activeConfig.longitude;
    document.getElementById("latitude").value = activeConfig.latitude;
    document.getElementById("height").value = activeConfig.height;
    document.getElementById("scale").value = activeConfig.scale;
    document.getElementById("heading").value = activeConfig.heading;
    document.getElementById("pitch").value = activeConfig.pitch;
    document.getElementById("roll").value = activeConfig.roll;

    const scaleLabel = document.getElementById("scaleValueLabel");
    if (scaleLabel) scaleLabel.textContent = `${parseFloat(activeConfig.scale).toFixed(1)}x`;
  }

  updateModelAdjustTargetLabel();
}

// "Save Location" button in the Model Adjustment panel — persists the
// active preset model's current position/height/scale/rotation to
// localStorage so it loads there again next time the app opens.
function saveActiveModelTransform() {
  const label = document.getElementById("modelAdjustTarget");

  if (modelEntity) {
    if (label) {
      label.textContent = "Saving isn't supported for an uploaded model.";
      setTimeout(() => updateModelAdjustTargetLabel(), 2200);
    }
    return;
  }

  const config = getModelConfig(currentModelId);
  if (!config) return;

  const applyToAll = isApplyToAllModelsChecked();
  const targetIds = applyToAll ? MODELS.map((m) => m.id) : [currentModelId];

  const transform = {
    longitude: parseFloat(document.getElementById("longitude").value),
    latitude: parseFloat(document.getElementById("latitude").value),
    height: parseFloat(document.getElementById("height").value),
    scale: parseFloat(document.getElementById("scale").value),
    heading: parseFloat(document.getElementById("heading").value),
    pitch: parseFloat(document.getElementById("pitch").value),
    roll: parseFloat(document.getElementById("roll").value),
  };

  const overrides = loadModelTransformOverrides();
  targetIds.forEach((id) => {
    overrides[id] = { ...transform };
  });
  saveModelTransformOverrides(overrides);

  console.log(`Saved custom location for ${applyToAll ? "all models" : config.label}:`, transform);

  if (label) {
    label.textContent = applyToAll
      ? "Saved! All models will load at this location next time."
      : `Saved! ${config.label} will load here next time.`;
    setTimeout(() => updateModelAdjustTargetLabel(), 2200);
  }
}

function resetToGroundLevel() {
  document.getElementById("height").value = "0";
  updateModelPosition();
  console.log("Model height reset to ground level (0)");
}

function centerOnModel() {
  const targetEntity =
    modelEntity ||
    presetModelEntities[currentModelId || DEFAULT_MODEL_ID] ||
    presetModelEntities[DEFAULT_MODEL_ID];

  if (targetEntity) {
    const cameraOffset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-35.0),
      520
    );
    viewer.zoomTo(targetEntity, cameraOffset);
  } else {
    flyToModelId(DEFAULT_MODEL_ID);
  }
}

// Model opacity control
function updateModelOpacity(value) {
  const opacity = parseFloat(value) / 100;
  document.getElementById("modelOpacityValue").textContent = `${value}%`;

  if (modelEntity && modelEntity.model) {
    // Update model color with new alpha value
    modelEntity.model.color = Cesium.Color.WHITE.withAlpha(opacity);
  }

  // Also apply to both preset GLBs (manewada + manish nagar), same
  // reason as the toggle fix above — they aren't the same object as
  // modelEntity.
  if (typeof presetModelEntities === "object" && presetModelEntities) {
    Object.values(presetModelEntities).forEach((ent) => {
      if (ent && ent.model) {
        ent.model.color = Cesium.Color.WHITE.withAlpha(opacity);
      }
    });
  }
}

// List of pre-configured GLB models available from the navbar dropdown.
// Add more entries here to make more models selectable.
const MODELS = [
  {
    id: "manewada",
    label: "Manewada",
    url: "./manewada.glb",
    longitude: 79.109468,
    latitude: 21.096398,
    height: 0,
    scale: 1.0,
    heading: 105,
    pitch: 92,
    roll: 15,
  },
  {
    id: "manishnagar",
    label: "Manish Nagar",
    url: "./manish nagar.glb",
    longitude: 79.097664,
    latitude: 21.101988,
    height: 0,
    scale: 1.0,
    heading: 105,
    pitch: 92,
    roll: 15,
  },
];

const DEFAULT_MODEL_ID = "manishnagar";
let currentModelId = "manishnagar";

// Holds every preset model entity currently on the map, keyed by id.
// Both models live in here at once — nothing gets removed when a
// different one is picked from the dropdown.
const presetModelEntities = {};

function getModelConfig(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0];
}

// ---------------------------------------------------------------
// SAVED MODEL LOCATION (per preset model, persisted in localStorage)
// ---------------------------------------------------------------
// Lets a user drag a preset model (Manewada / Manish Nagar) into place
// with the live Model Adjustment panel and "Save Location" it — so the
// NEXT time the app loads, that model appears at the saved spot/scale/
// rotation instead of the hardcoded MODELS default.
const MODEL_TRANSFORM_STORAGE_KEY = "gis3d_model_transform_overrides";

function loadModelTransformOverrides() {
  try {
    const raw = localStorage.getItem(MODEL_TRANSFORM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Failed to read saved model locations:", e);
    return {};
  }
}

function saveModelTransformOverrides(overrides) {
  try {
    localStorage.setItem(
      MODEL_TRANSFORM_STORAGE_KEY,
      JSON.stringify(overrides)
    );
  } catch (e) {
    console.warn("Failed to persist saved model location:", e);
  }
}

// Returns the MODELS config for `id` with any saved override layered on
// top (longitude/latitude/height/scale/heading/pitch/roll only — url,
// id and label always come from the MODELS entry).
function getEffectiveModelConfig(id) {
  const base = getModelConfig(id);
  if (!base) return null;
  const saved = loadModelTransformOverrides()[id];
  return saved ? { ...base, ...saved } : base;
}

// Populates the navbar <select id="modelSelect"> from the MODELS list.
function populateModelSelector() {
  const select = document.getElementById("modelSelect");
  if (!select) return;

  select.innerHTML = "";
  MODELS.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = m.label;
    select.appendChild(option);
  });

  select.value = DEFAULT_MODEL_ID;

  // Selecting from the dropdown flies the camera to that model,
  // lazily downloading it first if it hasn't been loaded yet (see
  // flyToModelId). Once loaded, a model stays on the map.
  select.addEventListener("change", (e) => {
    flyToModelId(e.target.value);
  });
}

// Adds a single preset model entity to the viewer (if not already added)
// and returns it. Does not touch any other model.
function addPresetModelEntity(config) {
  if (presetModelEntities[config.id]) {
    return presetModelEntities[config.id];
  }

  // Always resolve through the saved-override lookup by id, regardless of
  // whether the caller already passed an effective config or a bare
  // MODELS entry — this is the single place new entities get positioned.
  const effective = getEffectiveModelConfig(config.id) || config;

  const position = Cesium.Cartesian3.fromDegrees(
    effective.longitude,
    effective.latitude,
    effective.height
  );

  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(effective.heading),
    Cesium.Math.toRadians(effective.pitch),
    Cesium.Math.toRadians(effective.roll)
  );

  const entity = viewer.entities.add({
    name: config.label,
    position: position,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr
    ),
    model: {
      uri: config.url,
      scale: effective.scale,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      shadows: Cesium.ShadowMode.DISABLED,
      color: Cesium.Color.WHITE.withAlpha(1.0),
    },
  });

  presetModelEntities[config.id] = entity;
  return entity;
}

// Directly opens the active 3D model and terrain on startup without any loading overlay
function loadAllPresetModels(options = {}) {
  currentModelId = DEFAULT_MODEL_ID;
  const select = document.getElementById("modelSelect");
  if (select) select.value = DEFAULT_MODEL_ID;

  const defaultConfig = getEffectiveModelConfig(DEFAULT_MODEL_ID);
  const elLon = document.getElementById("longitude");
  const elLat = document.getElementById("latitude");
  const elHeight = document.getElementById("height");
  const elScale = document.getElementById("scale");
  const elHeading = document.getElementById("heading");
  const elPitch = document.getElementById("pitch");
  const elRoll = document.getElementById("roll");

  if (elLon) elLon.value = defaultConfig.longitude;
  if (elLat) elLat.value = defaultConfig.latitude;
  if (elHeight) elHeight.value = defaultConfig.height;
  if (elScale) elScale.value = defaultConfig.scale;
  if (elHeading) elHeading.value = defaultConfig.heading;
  if (elPitch) elPitch.value = defaultConfig.pitch;
  if (elRoll) elRoll.value = defaultConfig.roll;
  const scaleLabel = document.getElementById("scaleValueLabel");
  if (scaleLabel) scaleLabel.textContent = `${parseFloat(defaultConfig.scale).toFixed(1)}x`;
  updateModelAdjustTargetLabel();

  // Add primary model (Manewada) directly to viewer
  const entity = addPresetModelEntity(defaultConfig);
  if (entity) {
    viewer.zoomTo(
      entity,
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0),
        Cesium.Math.toRadians(-35.0),
        520
      )
    ).catch(() => {});
  }

  const modelStatus = document.getElementById("modelStatus");
  if (modelStatus) {
    modelStatus.textContent = "Loaded";
    modelStatus.className = "layer-status status-loaded";
  }
  const modelToggle = document.getElementById("modelToggle");
  if (modelToggle) {
    modelToggle.checked = true;
  }

  hideLoading();

  if (typeof window.onLayoutChanged === "function") {
    window.onLayoutChanged(DEFAULT_MODEL_ID);
  }

  // The other preset model (31-53MB GLB) is intentionally NOT preloaded
  // here anymore — it used to download in the background 1s after
  // startup regardless of whether the user ever looks at that area.
  // It now loads lazily, on first switch to it (see flyToModelId), so
  // the initial page load only ever pays for the model actually shown.

  // Load KMZ layers in background
  if (options.isInitial) {
    setTimeout(loadKMZLayers, 200);
  }

  console.log(`3D Terrain & model opened directly with ${defaultConfig.label} as default.`);
}

// Flies the camera to a preset model by id, loading it first if this is
// the first time it's been selected (see loadAllPresetModels — only the
// default model is loaded at startup, everything else is lazy).
function flyToModelId(id) {
  const config = getEffectiveModelConfig(id);
  if (!config) return;

  currentModelId = config.id;

  const select = document.getElementById("modelSelect");
  if (select) select.value = config.id;

  document.getElementById("longitude").value = config.longitude;
  document.getElementById("latitude").value = config.latitude;
  document.getElementById("height").value = config.height;
  document.getElementById("scale").value = config.scale;
  document.getElementById("heading").value = config.heading;
  document.getElementById("pitch").value = config.pitch;
  document.getElementById("roll").value = config.roll;
  const scaleLabel = document.getElementById("scaleValueLabel");
  if (scaleLabel) scaleLabel.textContent = `${parseFloat(config.scale).toFixed(1)}x`;

  const wasAlreadyLoaded = !!presetModelEntities[config.id];
  const label = document.getElementById("modelAdjustTarget");
  if (!wasAlreadyLoaded && label) {
    label.textContent = `Loading ${config.label}...`;
  }

  // No-op if this model is already loaded; otherwise downloads it now.
  const entity = addPresetModelEntity(config);

  if (!wasAlreadyLoaded) {
    setTimeout(() => updateModelAdjustTargetLabel(), 1500);
  } else {
    updateModelAdjustTargetLabel();
  }

  viewer.flyTo(entity, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-35.0),
      520
    ),
  });

  if (typeof window.onLayoutChanged === "function") {
    window.onLayoutChanged(config.id);
  }

  console.log(`Flying to ${config.label}`);
}

// Kept for backward compatibility with existing calls (e.g. js/7_main.js).
// Now loads BOTH preset models instead of just one.
function loadDefaultModel() {
  populateModelSelector();
  loadAllPresetModels({ isInitial: true });
}

// Since only the default preset model loads at startup (the other one is
// lazy, see loadAllPresetModels), jumping straight to a house via search
// needs to make sure that house's area model is actually on the map —
// otherwise the polygon/pin shows up floating with no building mesh under
// it. Does NOT move the camera; the caller (flyToHouse) handles that.
function ensurePresetModelLoadedForHouseId(houseId) {
  const idStr = String(houseId || "");
  const isManish =
    idStr.toUpperCase().startsWith("MN") || idStr.toLowerCase().includes("manish");
  const modelId = isManish ? "manishnagar" : "manewada";
  const config = getEffectiveModelConfig(modelId);
  if (config) addPresetModelEntity(config);
}
window.ensurePresetModelLoadedForHouseId = ensurePresetModelLoadedForHouseId;