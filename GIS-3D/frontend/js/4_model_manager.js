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
}

function handleGenericModelFile(file) {
  console.log(`Loading ${file.name} with terrain clamping`);

  const modelUrl = URL.createObjectURL(file);

  if (file.name.toLowerCase().endsWith(".glb")) {
    console.log("GLB file detected");
  }

  addModelToCesium(modelUrl, file.name);
}

function updateModelOrientation() {
  if (modelEntity) {
    const position = modelEntity.position.getValue(
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
    modelEntity.orientation = orientation;
  }
}

function updateModelPosition() {
  if (modelEntity) {
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
    modelEntity.position = position;

    if (height === 0) {
      modelEntity.model.heightReference =
        Cesium.HeightReference.CLAMP_TO_GROUND;
      modelEntity.heightReference =
        Cesium.HeightReference.CLAMP_TO_GROUND;
    } else {
      modelEntity.model.heightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;
      modelEntity.heightReference = Cesium.HeightReference.NONE;
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

    modelEntity.orientation =
      Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    const cameraOffset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-15),
      1000
    );

    viewer.zoomTo(modelEntity, cameraOffset);

    console.log(
      `Model repositioned to: ${latitude}, ${longitude}, height: ${height}`
    );
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
    presetModelEntities["manewada"];

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
    longitude: 79.097290,
    latitude: 21.102300,
    height: 0,
    scale: 1.0,
    heading: 105,
    pitch: 92,
    roll: 15,
  },
];

const DEFAULT_MODEL_ID = "manewada";
let currentModelId = "manewada";

// Holds every preset model entity currently on the map, keyed by id.
// Both models live in here at once — nothing gets removed when a
// different one is picked from the dropdown.
const presetModelEntities = {};

function getModelConfig(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0];
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

  // Selecting from the dropdown now only flies the camera to that
  // model. It does NOT load/unload anything — both models stay loaded
  // on the map at all times.
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

  const position = Cesium.Cartesian3.fromDegrees(
    config.longitude,
    config.latitude,
    config.height
  );

  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(config.heading),
    Cesium.Math.toRadians(config.pitch),
    Cesium.Math.toRadians(config.roll)
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
      scale: config.scale,
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

  const defaultConfig = getModelConfig(DEFAULT_MODEL_ID);
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

  // Load remaining models in background
  setTimeout(() => {
    MODELS.filter((m) => m.id !== DEFAULT_MODEL_ID).forEach((config) => {
      addPresetModelEntity(config);
    });
  }, 1000);

  // Load KMZ layers in background
  if (options.isInitial) {
    setTimeout(loadKMZLayers, 200);
  }

  console.log("3D Terrain & model opened directly with Manewada as default.");
}

// Flies the camera to an already-loaded preset model by id.
// Both models remain on the map; this only moves the camera and
// updates the form fields to reflect whichever one is now "current".
function flyToModelId(id) {
  const config = getModelConfig(id);
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

  // No-op if this model is already loaded (it always is, after startup).
  const entity = addPresetModelEntity(config);

  viewer.flyTo(entity, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-35.0),
      520
    ),
  });

  console.log(`Flying to ${config.label}`);
}

// Kept for backward compatibility with existing calls (e.g. js/7_main.js).
// Now loads BOTH preset models instead of just one.
function loadDefaultModel() {
  populateModelSelector();
  loadAllPresetModels({ isInitial: true });
}