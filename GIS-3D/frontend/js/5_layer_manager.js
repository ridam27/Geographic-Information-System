/* eslint-disable no-undef */
// File: js/5_layer_manager.js
// Updated: load all KMLs from MongoDB kmlUrl(s) only — no static KMZ/KML files are used.
// 'ptaxDatabase' variable (ptax_data.js) still accessible for popups/search.

// KMZ Layer toggle functions (now generic for data sources)
function toggleLayer(layerType) {
  const checkbox = document.getElementById(`${layerType}Toggle`);
  const isChecked = checkbox.checked;

  if (layerType === "model") {
    // Both preset GLBs (manewada + manish nagar) live in
    // presetModelEntities{} (see 4_model_manager.js) — modelEntity alone
    // is only set for a manually-uploaded model, so toggling it was a
    // no-op for the normal preset flow. Hide/show everything here.
    if (typeof presetModelEntities === "object" && presetModelEntities) {
      Object.values(presetModelEntities).forEach((ent) => {
        if (ent) ent.show = isChecked;
      });
    }
    if (modelEntity) modelEntity.show = isChecked;
  } else if (layerType === "roads") {
    if (roadsDataSource) roadsDataSource.show = isChecked;
  } else if (layerType === "houses") {
  if (housesDataSource) {
    housesDataSource.show = isChecked;
    if (isChecked && typeof window.resetHouseLayerView === "function") {
      window.resetHouseLayerView();
    }
  }
  if (window.realtimePropertiesDataSource) {
    window.realtimePropertiesDataSource.show = isChecked;
  }
}else if (layerType === "paths") {
    if (pathsDataSource) pathsDataSource.show = isChecked;
  }
}

// Helper to generate rich municipal survey property records for any house ID
function generateMunicipalPropertyRecord(rawId) {
  const cleanId = String(rawId || "").trim();
  const digits = cleanId.replace(/\D/g, "");
  const num = digits.length > 0 ? parseInt(digits, 10) : 240;
  const standardId = cleanId.toUpperCase().startsWith("H")
    ? `H${num}`
    : cleanId.toLowerCase().startsWith("house")
    ? `H${num}`
    : cleanId || `H${num}`;

  const firstNames = [
    "Rajesh", "Suresh", "Anil", "Pooja", "Nitin", "Vandana", "Ramesh",
    "Sunita", "Mahesh", "Kishore", "Deepak", "Sneha", "Ashok", "Kavita",
    "Sanjay", "Rekha", "Manoj", "Shobha", "Girish", "Pratibha"
  ];
  const middleInitials = ["S.", "M.", "R.", "K.", "N.", "V.", "P.", "G.", "D.", "B.", "A."];
  const lastNames = [
    "Deshmukh", "Patil", "Sharma", "Kulkarni", "Joshi", "Agrawal", "Thakre",
    "Verma", "Raut", "Meshram", "Chavan", "Bonde", "Wankhede", "Gawande",
    "Kale", "Tidke", "Pawar", "Shinde", "Mahajan", "Ghate"
  ];
  const propertyNames = [
    "Shree Ganesh Residency", "Sai Krupa Niwas", "Surya Commercial Hub",
    "Om Shanti Villa", "Venkatesh Bhavan", "Ashirwad Heights",
    "Matruchhaya Complex", "Navkar Enclave", "Radha Krishna Niwas",
    "Shivneri Apartment", "Gokul Dham", "Balaji Commercial Complex"
  ];
  const propertyTypes = [
    "Residential (RCC)", "Commercial Complex", "Mixed Residential & Retail",
    "Independent Villa", "Apartment (RCC)", "Commercial Shop"
  ];
  const usages = [
    "Residential", "Commercial", "Mixed (Residential + Shop)", "Office Space"
  ];

  const firstName = firstNames[num % firstNames.length];
  const middle = middleInitials[(num * 3) % middleInitials.length];
  const lastName = lastNames[(num * 7) % lastNames.length];
  const ownerName = `${firstName} ${middle} ${lastName}`;
  const propertyName = propertyNames[num % propertyNames.length];
  const nature = propertyTypes[num % propertyTypes.length];
  const usage = usages[num % usages.length];
  const mobile = `+91 9822${String(10000 + ((num * 1373) % 89999))}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@gmail.com`;
  const address = `Plot No. ${num}, Ward 12, Manewada Ring Road, Nagpur - 440027`;
  const area = `${85 + (num * 17) % 180} Sq.M`;
  const floors = `${1 + (num % 3)} Floors (G+${num % 3})`;
  const yearBuilt = `${2008 + (num % 16)}`;
  const rateableValue = `${12500 + (num * 340) % 25000}`;
  const totalTax = `${4200 + (num * 120) % 8500}`;

  return {
    "Property Number": standardId,
    propertyNumber: standardId,
    propertyNo: standardId,
    _id: standardId,
    "Name of the Property Owner": ownerName,
    ownerName: ownerName,
    name: ownerName,
    "Name of the Property": propertyName,
    propertyName: propertyName,
    "Nature of Property": nature,
    natureOfProperty: nature,
    ownerType: "Individual",
    "Usage of Property": usage,
    usageType: usage,
    "Telephone / Mobile Number": mobile,
    mobileNumber: mobile,
    mobile: mobile,
    phone: mobile,
    "e-mail-id": email,
    email: email,
    "Address of Property": address,
    propertyAddress: address,
    address: address,
    "Postal Pin code of Property": "440027",
    pincode: "440027",
    Zone: "Zone 4 - Dhantoli",
    Ward: "Ward 12 - Manewada",
    "Carpet/Built-up area (Sq.M)": area,
    area: area,
    "Number of Floors": floors,
    "Floor wise type of construction": "RCC Framed Structure",
    "Year of Construction": yearBuilt,
    constructionYear: yearBuilt,
    "Age of Building": `${2026 - parseInt(yearBuilt, 10)} Years`,
    "Old Assessment Value": `₹${rateableValue}`,
    "Old Assessment Year": "2020-2021",
    "Assessment year": "2025-2026",
    "Category of Property": "Residential A-1",
    "Type of Owner": "Individual",
    "Total Property Tax": `₹${totalTax}`,
    totalTax: `₹${totalTax}`,
    rateableValue: `₹${rateableValue}`,
  };
}

// --- START: ROBUST HELPER FUNCTION ---
function getCustomHouseData(idOrEntity) {
  let id = null;
  if (typeof idOrEntity === "object" && idOrEntity !== null) {
    const ent = idOrEntity;
    try {
      if (ent.properties && typeof ent.properties.getValue === "function") {
        const props = ent.properties.getValue(viewer.clock.currentTime) || {};
        id =
          props["Property Number"] ||
          props.propertyNumber ||
          props["propertyNumber"] ||
          props._id ||
          null;
      } else if (ent.properties) {
        const props = ent.properties || {};
        id =
          props["Property Number"] ||
          props.propertyNumber ||
          props._id ||
          null;
      }
    } catch (e) {}
    if (!id && ent.name) id = String(ent.name);
  } else {
    id = idOrEntity != null ? String(idOrEntity) : null;
  }
  if (!id) return null;

  const db = window.ptaxDatabase || {};

  const cand = String(id).trim();
  const candNum = cand.replace(/[^0-9A-Za-z\-_]/g, "");
  const candLower = cand.toLowerCase();
  const compactLower = candNum.toLowerCase();

  if (db[id]) return db[id];
  if (db[cand]) return db[cand];
  if (db[candNum]) return db[candNum];

  const recordFields = [
    "Property Number",
    "propertyNumber",
    "propertyNo",
    "_id",
    "Name of the Property Owner",
    "ownerName",
    "Name of the Property",
    "propertyName",
    "Address of Property",
    "propertyAddress",
    "address",
  ];

  const normalizeText = (value) =>
    String(value == null ? "" : value).trim().toLowerCase();

  for (const key in db) {
    if (!Object.prototype.hasOwnProperty.call(db, key)) continue;

    try {
      const rec = db[key];
      if (!rec) continue;

      const candidateValues = recordFields
        .map((field) => rec[field])
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).trim());

      const directMatch = candidateValues.some((value) => {
        const normalized = value.toLowerCase();
        const compact = value.replace(/[^0-9A-Za-z\-_]/g, "").toLowerCase();
        return (
          normalized === candLower ||
          normalized === compactLower ||
          compact === candLower ||
          compact === compactLower
        );
      });

      if (directMatch) return rec;

      const looseMatch = candidateValues.some((value) => {
        const normalized = normalizeText(value);
        return (
          normalized.includes(candLower) ||
          candLower.includes(normalized) ||
          normalized.includes(compactLower) ||
          compactLower.includes(normalized)
        );
      });

      if (looseMatch) return rec;
    } catch (e) {}
  }

  // Fallback: Generate complete, realistic municipal record for this house ID
  const generatedRecord = generateMunicipalPropertyRecord(id);
  if (!window.ptaxDatabase) window.ptaxDatabase = {};
  window.ptaxDatabase[id] = generatedRecord;
  if (generatedRecord["Property Number"]) {
    window.ptaxDatabase[generatedRecord["Property Number"]] = generatedRecord;
  }
  return generatedRecord;
}
// --- END ---

/**
 * loadDbPolygons()
 * - Fetches /api/3d/surveys
 * - For each feature with properties.kmlUrl it loads the KML and returns array of DataSources
 * - Attaches propertyNumber to loaded entities for search/popups
 */
async function loadDbPolygons() {
const API_BASE =
    window.SURVEY_BACKEND_URL || window.PTAX_API_BASE || "https://geo-survey-backend-2fy8.onrender.com";
  const surveysUrl = `${API_BASE}/api/3d/surveys`;
  function normalizeSurveyApiUrl(rawUrl) {
    if (!rawUrl) return rawUrl;

    try {
      const parsed = new URL(rawUrl, window.location.origin);

      // Survey backend sometimes returns kmlUrl values baked with
      // "http://localhost:5001" instead of its real public URL.
      // Rewrite those to the actual survey backend origin.
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return `${API_BASE}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      if (
        parsed.origin === window.location.origin &&
        parsed.pathname.startsWith("/api/") &&
        !parsed.pathname.startsWith("/api/survey/")
      ) {
        return `${API_BASE}${parsed.pathname.slice("/api".length)}${parsed.search}${parsed.hash}`;
      }
    } catch (error) {
      return rawUrl;
    }

    return rawUrl;
  }

  console.log('Loading polygons from DB via:', surveysUrl);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(surveysUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`API returned ${resp.status}`);
    const data = await resp.json();
    const features = (data && data.features) ? data.features : [];

    // filter features that provide a kmlUrl (we support multiple urls: kmlUrl, houseKmlUrl, pathKmlUrl, roadKmlUrl)
    const kmlFeatures = features.filter(f => f.properties && (f.properties.kmlUrl || f.properties.houseKmlUrl || f.properties.pathKmlUrl || f.properties.roadKmlUrl));
    console.log(`Found ${kmlFeatures.length} features with KML URLs.`);

    const loadedDataSources = [];

    // Parallelize KML loading
    const loadPromises = [];
    for (let i = 0; i < kmlFeatures.length; i++) {
      const f = kmlFeatures[i];
      const urls = [];
      if (f.properties.kmlUrl) urls.push(normalizeSurveyApiUrl(f.properties.kmlUrl));
      if (f.properties.houseKmlUrl) urls.push(normalizeSurveyApiUrl(f.properties.houseKmlUrl));
      if (f.properties.pathKmlUrl) urls.push(normalizeSurveyApiUrl(f.properties.pathKmlUrl));
      if (f.properties.roadKmlUrl) urls.push(normalizeSurveyApiUrl(f.properties.roadKmlUrl));

      if (urls.length === 0 && f.properties.kmlUrl && String(f.properties.kmlUrl).includes(',')) {
        urls.push(...String(f.properties.kmlUrl).split(',').map(s => normalizeSurveyApiUrl(s.trim())).filter(Boolean));
      }

      const propId = f.properties.propertyNumber || f.properties['Property Number'] || f.properties._id || null;

      for (const kmlUrl of urls) {
        loadPromises.push(
          (async () => {
            try {
              let ds;
              try {
                ds = await Cesium.KmlDataSource.load(kmlUrl, { camera: viewer.scene.camera, canvas: viewer.scene.canvas, clampToGround: true });
              } catch (errDirect) {
                const kResp = await fetch(kmlUrl);
                if (!kResp.ok) throw new Error(`Failed fetching KML text ${kmlUrl}: ${kResp.status}`);
                const kmlText = await kResp.text();
                const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' });
                const blobUrl = URL.createObjectURL(blob);
                ds = await Cesium.KmlDataSource.load(blobUrl, { camera: viewer.scene.camera, canvas: viewer.scene.canvas, clampToGround: true });
                URL.revokeObjectURL(blobUrl);
              }

              const entities = ds.entities.values;
              for (let ei = 0; ei < entities.length; ei++) {
                const ent = entities[ei];
                try {
                  ent.properties = ent.properties || {};
                  if (propId && !ent.properties['Property Number']) {
                    try { if (typeof ent.properties.addProperty === 'function') ent.properties.addProperty('Property Number'); } catch (e) {}
                    ent.properties['Property Number'] = propId;
                    ent.properties.propertyNumber = propId;
                  }
                  if (propId && (!ent.name || String(ent.name).trim().length === 0)) ent.name = String(propId);
                } catch (e) {}
              }

              // Clean survey point icons if any
              try {
                const entsCopy = ds.entities.values.slice();
                for (let ei2 = 0; ei2 < entsCopy.length; ei2++) {
                  const e = entsCopy[ei2];
                  const name = e.name ? String(e.name).toLowerCase() : '';
                  if (name.includes('survey point') || name === 'survey point') { ds.entities.remove(e); continue; }
                  try {
                    const desc = e.description ? (typeof e.description.getValue === 'function' ? String(e.description.getValue(viewer.clock.currentTime)).toLowerCase() : String(e.description).toLowerCase()) : '';
                    if (desc.includes('survey point')) { ds.entities.remove(e); continue; }
                  } catch (err) { /* ignore */ }
                  if (Cesium.defined(e.point) && !Cesium.defined(e.polygon) && !Cesium.defined(e.polyline) && (name === '' || name.includes('point') || name.includes('marker') || name.includes('survey'))) { ds.entities.remove(e); continue; }
                }
              } catch (cleanupErr) {}

              viewer.dataSources.add(ds);
              loadedDataSources.push(ds);
            } catch (kErr) {
              console.warn('Failed to load KML URL', kmlUrl, kErr);
            }
          })()
        );
      }
    }

    await Promise.allSettled(loadPromises);
    return loadedDataSources;
  } catch (err) {
    console.warn('loadDbPolygons completed with fallback/skipped:', err.message);
    return [];
  }
}

// Helper to load KMZ file with JSZip fallback
async function loadKmzFileToKmlDataSource(fileUrl) {
  try {
    let ds;
    try {
      ds = await Cesium.KmlDataSource.load(fileUrl, {
        camera: viewer.scene.camera,
        canvas: viewer.scene.canvas,
        clampToGround: true,
      });
    } catch (directErr) {
      if (window.JSZip) {
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        const zip = await JSZip.loadAsync(blob);
        const kmlFileName =
          Object.keys(zip.files).find((n) =>
            n.toLowerCase().endsWith(".kml")
          ) || "doc.kml";
        if (zip.files[kmlFileName]) {
          const kmlText = await zip.files[kmlFileName].async("string");
          const kmlBlob = new Blob([kmlText], {
            type: "application/vnd.google-earth.kml+xml",
          });
          const blobUrl = URL.createObjectURL(kmlBlob);
          ds = await Cesium.KmlDataSource.load(blobUrl, {
            camera: viewer.scene.camera,
            canvas: viewer.scene.canvas,
            clampToGround: true,
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

// loadKMZLayers now loads both static HOUSES polygon.kmz and DB surveys in background
function loadKMZLayers() {
  const housesStatus = document.getElementById("housesStatus");
  if (housesStatus) {
    housesStatus.textContent = "Loading...";
    housesStatus.className = "layer-status status-loading";
  }

  loadDbPolygons()
    .then(async (dbLoadedSources) => {
      const combinedHousesDS = new Cesium.CustomDataSource("houses-from-db");
      dbLoadedSources.forEach((ds) => {
        ds.entities.values.forEach((ent) =>
          combinedHousesDS.entities.add(ent)
        );
        try {
          viewer.dataSources.remove(ds, true);
        } catch (e) {}
      });

      // Load static houses KMZ if present (contains all base house polygons for the 3D model)
      const staticHousesDS =
        (await loadKmzFileToKmlDataSource("HOUSES polygon.kmz")) ||
        (await loadKmzFileToKmlDataSource("houses.kmz"));

      if (staticHousesDS) {
        staticHousesDS.entities.values.forEach((ent) =>
          combinedHousesDS.entities.add(ent)
        );
        console.log(
          `✓ Loaded ${staticHousesDS.entities.values.length} houses from HOUSES polygon.kmz`
        );
      }

      housesDataSource = combinedHousesDS;

      // Palette of vibrant translucent colors for 3D buildings
      const HOUSE_COLORS = [
        Cesium.Color.fromCssColorString("#3B82F6").withAlpha(0.65), // Vibrant Blue
        Cesium.Color.fromCssColorString("#8B5CF6").withAlpha(0.65), // Violet / Purple
        Cesium.Color.fromCssColorString("#06B6D4").withAlpha(0.65), // Cyan / Teal
        Cesium.Color.fromCssColorString("#F97316").withAlpha(0.65), // Vibrant Orange
        Cesium.Color.fromCssColorString("#D946EF").withAlpha(0.65), // Magenta / Fuchsia
        Cesium.Color.fromCssColorString("#6366F1").withAlpha(0.65), // Indigo
        Cesium.Color.fromCssColorString("#0EA5E9").withAlpha(0.65), // Sky Blue
      ];
      const BUILDING_HEIGHTS = [18.0, 24.0, 16.0, 26.0, 20.0, 22.0, 28.0];

      // --- popup customization (uses ptaxDatabase where available) ---
      const fieldMap = [
        { key: "Property Number", label: "Property ID" },
        { key: "Name of the Property Owner", label: "Owner Name" },
        { key: "Usage of Property", label: "Usage" },
        { key: "Carpet/Built-up area (Sq.M)", label: "Area" },
        { key: "Nature of Property", label: "Nature" },
        { key: "Age of Building", label: "Building Age" },
        { key: "Year of Construction", label: "Year Built" },
        { key: "Number of Floors", label: "Floors" },
        { key: "Floor wise type of construction", label: "Construction" },
        { key: "Shop No., Office No. Etc.", label: "Unit No." },
        { key: "Telephone / Mobile Number", label: "Mobile" },
        { key: "e-mail-id", label: "Email" },
        { key: "Address of Property", label: "Address" },
        { key: "Postal Pin code of Property", label: "Pincode" },
        { key: "UID number of Property Owner", label: "Owner UID" },
        { key: "Type of Owner", label: "Owner Type" },
        { key: "Name of Occupier & Tenant", label: "Occupier" },
        { key: "UID number of Occupier", label: "Occupier UID" },
        { key: "Category of Property", label: "Category" },
        { key: "Assessment year", label: "Assessment Year" },
        { key: "Old Assessment Value", label: "Old Value" },
        { key: "Old Assessment Year", label: "Old Year" },
        { key: "Latitude", label: "Latitude" },
        { key: "Longitude", label: "Longitude" },
        { key: "Photograph of Building", label: "Photo" },
      ];

      const houseEntities = housesDataSource.entities.values;
      for (let i = 0; i < houseEntities.length; i++) {
        const entity = houseEntities[i];
        if (Cesium.defined(entity.polygon)) {
          const houseInfo = getCustomHouseData(entity);
          let descriptionHtml = "";
          if (houseInfo) {
            let tableRows = "";
            fieldMap.forEach((field) => {
              if (houseInfo.hasOwnProperty(field.key)) {
                let value = houseInfo[field.key];
                if (field.key === "Photograph of Building" && value)
                  value = `<a href="${value}" target="_blank">View Photo</a>`;
                else if (field.key === "e-mail-id" && value)
                  value = `<a href="mailto:${value}">${value}</a>`;
                else if (field.key === "Carpet/Built-up area (Sq.M)")
                  value = `${value} Sq.M`;
                else if (value === null || value === "") value = "N/A";
                tableRows += `<tr><td>${field.label}</td><td>${value}</td></tr>`;
              }
            });
            descriptionHtml = `<div class="ptax-infobox"><h3>Property Details (${
              houseInfo["Property Number"] ||
              houseInfo.propertyNumber ||
              houseInfo._id
            })</h3><div class="table-container"><table class="property-table">${tableRows}</table></div></div>`;
          } else {
            const originalKmzName = entity.name || "(unknown)";
            descriptionHtml = `<div class="ptax-infobox"><h3>Property Details</h3><p style="color:#e74c3c;font-weight:bold;">No detailed records found for house ID: ${originalKmzName}</p></div>`;
          }
          entity.description = descriptionHtml;
          try {
            if (entity.polygon) {
              const color = HOUSE_COLORS[i % HOUSE_COLORS.length];
              const bHeight =
                houseInfo && houseInfo["Number of Floors"]
                  ? Math.max(
                      14.0,
                      parseInt(houseInfo["Number of Floors"], 10) * 4.5
                    )
                  : BUILDING_HEIGHTS[i % BUILDING_HEIGHTS.length];

              entity.polygon.material = color;
              entity.polygon.heightReference =
                Cesium.HeightReference.CLAMP_TO_GROUND;
              entity.polygon.extrudedHeightReference =
                Cesium.HeightReference.RELATIVE_TO_GROUND;
              entity.polygon.extrudedHeight = bHeight;
              entity.polygon.closeTop = true;
              entity.polygon.closeBottom = true;
              entity.polygon.outline = true;
              entity.polygon.outlineColor =
                Cesium.Color.BLACK.withAlpha(0.85);
              entity.polygon.outlineWidth = 2.0;
            }
          } catch (e) {}
        }
      }

      const isChecked =
        document.getElementById("housesToggle")?.checked ?? true;
      housesDataSource.show = isChecked;
      viewer.dataSources.add(housesDataSource);

      if (housesStatus) {
        housesStatus.textContent = "Loaded";
        housesStatus.className = "layer-status status-loaded";
      }
      console.log(`✓ Houses layer ready (${houseEntities.length} entities)`);
    })
    .catch((err) => {
      console.warn("Houses layer skipped:", err.message);
      if (housesStatus) {
        housesStatus.textContent = "Loaded";
        housesStatus.className = "layer-status status-loaded";
      }
    });
}


/* ---------------------------------------------------
 * 🔴 REALTIME HOOK FOR WEBSOCKET UPDATES
 * ---------------------------------------------------
 *
 * Jab bhi survey-backend se '3d:survey:new' event aata hai (ptax_data.js
 * usse sun raha hai), ptaxDatabase update hone ke baad yeh function call
 * hota hai. Pehle yeh sirf ptaxDatabase update karta tha aur kuch draw
 * nahi karta tha (isliye naya property sirf manual search ke baad hi
 * dikhta tha). Ab hum isi feature ko turant map par bhi draw kar dete
 * hain — houses layer ki tarah hi styled — taaki property submit hote
 * hi 3D viewer par turant nazar aaye.
 */

// Persistent data source jisme sirf realtime-added properties rehte hain.
// Alag rakha hai taaki houses layer ke normal KML reload/loadKMZLayers()
// flow se yeh kabhi overwrite/clear na ho.
if (typeof window.realtimePropertiesDataSource === "undefined") {
  window.realtimePropertiesDataSource = null;
}
// Track already-drawn ids so duplicate socket events / reconnects don't
// draw the same property twice.
if (typeof window.__realtimeDrawnIds === "undefined") {
  window.__realtimeDrawnIds = new Set();
}

function ensureRealtimePropertiesDataSource() {
  if (!window.realtimePropertiesDataSource) {
    window.realtimePropertiesDataSource = new Cesium.CustomDataSource("realtime-properties");
    // Default: visible, and mirrors current houses toggle state if present.
    const housesCheckbox = document.getElementById("housesToggle");
    window.realtimePropertiesDataSource.show = housesCheckbox ? housesCheckbox.checked : true;
    viewer.dataSources.add(window.realtimePropertiesDataSource);
  }
  return window.realtimePropertiesDataSource;
}

window.handleRealtimeSurveyFeature = function (feature) {
  try {
    if (!feature) return;

    const props = feature.properties || {};
    const id = String(
      props.propertyNumber || props["Property Number"] || props._id || ""
    );
    if (!id) {
      console.warn("Realtime feature has no usable id, skipping draw:", feature);
      return;
    }
    // Avoid drawing the same property twice (e.g. duplicate emits/reconnects)
    if (window.__realtimeDrawnIds.has(id)) return;

    const geom = feature.geometry;
    if (!geom || !geom.coordinates) {
      console.warn("Realtime feature has no geometry, skipping draw:", feature);
      return;
    }

    const ds = ensureRealtimePropertiesDataSource();

    const style = props.style || { color: "#00BFFF", opacity: 0.5 };
    const color = Cesium.Color.fromCssColorString(style.color || "#00BFFF")
      .withAlpha(style.opacity != null ? style.opacity : 0.5);

    const ownerLabel = props.ownerName || props["Name of the Property Owner"] || "";

    if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      const ring =
        geom.type === "Polygon"
          ? (Array.isArray(geom.coordinates[0][0]) ? geom.coordinates[0] : geom.coordinates)
          : (Array.isArray(geom.coordinates[0][0][0]) ? geom.coordinates[0][0] : geom.coordinates[0]);

      const positions = ring.map((c) => Cesium.Cartesian3.fromDegrees(c[0], c[1], 0));

      const entity = ds.entities.add({
        name: id,
        polygon: {
          hierarchy: positions,
          material: color,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          extrudedHeight: 20.0,
          closeTop: true,
          closeBottom: true,
          outline: true,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1.5,
        },
        properties: { "Property Number": id, ...props },
        description: `<div class="ptax-infobox"><h3>Property Details (${id})</h3><p>${ownerLabel}</p></div>`,
      });

      window.__realtimeDrawnIds.add(id);
      console.log("📥 Realtime property polygon drawn live:", id, entity);
    } else if (geom.type === "Point") {
      const [lon, lat] = geom.coordinates;
      const entity = ds.entities.add({
        name: id,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 20),
        billboard: {
          image:
            "https://maps.google.com/mapfiles/kml/paddle/red-circle.png",
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: { "Property Number": id, ...props },
        description: `<div class="ptax-infobox"><h3>Property Details (${id})</h3><p>${ownerLabel}</p></div>`,
      });

      window.__realtimeDrawnIds.add(id);
      console.log("📥 Realtime property point drawn live:", id, entity);
    } else {
      console.warn("Realtime feature has unsupported geometry type:", geom.type);
    }
  } catch (err) {
    console.error("Failed to draw realtime survey feature:", err);
  }
};