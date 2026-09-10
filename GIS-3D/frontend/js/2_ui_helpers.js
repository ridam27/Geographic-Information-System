// File: js/2_ui_helpers.js
// Logic bilkul change nahi kiya hai.

// Show loading overlay (kept non-blocking so 3D terrain directly opens)
function showLoading(message) {
  const loadingText = document.getElementById("loading-text");
  if (loadingText) loadingText.textContent = message;
}

// Hide loading overlay
function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
}

// Update progress bar
function updateProgress(percent) {
  document.getElementById("progress-fill").style.width = `${percent}%`;
}

// Optimize memory by clearing cached data
function optimizeMemory() {
  for (const url in textureUrlCache) {
    URL.revokeObjectURL(textureUrlCache[url]);
  }
  textureUrlCache = {};
  uploadedFiles = {};

  if (currentModelUrl) {
    URL.revokeObjectURL(currentModelUrl);
    currentModelUrl = null;
  }

  // Pin ko bhi remove karo
  if (searchPinEntity) {
    viewer.entities.remove(searchPinEntity);
    searchPinEntity = null;
  }

  document.getElementById("debug-text").innerHTML = "";
  document.getElementById("status-text").innerHTML = "Memory optimized";
  console.log("Memory optimized");
}

// Debug logging function
function debugLog(message, data = null) {
  if (debugMode) {
    console.log(message, data || "");
    updateDebugInfo();
  }
}

function updateDebugInfo() {
  const debugElement = document.getElementById("debug-info");
  const debugText = document.getElementById("debug-text");

  let info = `Uploaded files: ${Object.keys(uploadedFiles).length}<br>`;
  info += `Texture cache: ${Object.keys(textureUrlCache).length}<br>`;
  info += `Available textures: ${Object.keys(uploadedFiles)
    .filter((name) => /\.(jpg|jpeg|png|bmp|tga|tif|tiff)$/i.test(name))
    .join(", ")}<br>`;

  debugText.innerHTML = info;
  debugElement.style.display = "block";
}

function updateFileStatus() {
  const statusElement = document.getElementById("status-text");
  const fileNames = Object.keys(uploadedFiles);

  if (fileNames.length === 0) {
    statusElement.innerHTML = "No files uploaded";
    return;
  }

  let statusHtml = `<strong>Uploaded (${fileNames.length} files):</strong><br>`;

  const objFiles = fileNames.filter((name) =>
    name.toLowerCase().endsWith(".obj")
  );
  const mtlFiles = fileNames.filter((name) =>
    name.toLowerCase().endsWith(".mtl")
  );
  const glbFiles = fileNames.filter((name) =>
    name.toLowerCase().endsWith(".glb")
  );
  const gltfFiles = fileNames.filter((name) =>
    name.toLowerCase().endsWith(".gltf")
  );
  const textureFiles = fileNames.filter((name) =>
    /\.(jpg|jpeg|png|bmp|tga|tif|tiff)$/i.test(name)
  );

  if (glbFiles.length > 0) {
    statusHtml += `<span class="file-found">✓ ${glbFiles.length} GLB file(s)</span><br>`;
  }

  if (gltfFiles.length > 0) {
    statusHtml += `<span class="file-found">✓ ${gltfFiles.length} GLTF file(s)</span><br>`;
  }

  if (objFiles.length > 0) {
    statusHtml += `<span class="file-found">✓ ${objFiles.length} OBJ file(s)</span><br>`;

    objFiles.forEach((objFile) => {
      const mtlFile = findMtlForObj(objFile, uploadedFiles);
      if (mtlFile) {
        statusHtml += `<span class="file-found">✓ MTL found: ${mtlFile}</span><br>`;
      } else {
        statusHtml += `<span class="file-missing">✗ No MTL for: ${objFile}</span><br>`;
      }
    });
  }

  if (mtlFiles.length > 0) {
    statusHtml += `<span class="file-found">✓ ${mtlFiles.length} MTL file(s)</span><br>`;
  }

  if (textureFiles.length > 0) {
    statusHtml += `<span class="file-found">✓ ${textureFiles.length} texture(s)</span><br>`;

    textureFiles.forEach((fileName) => {
      const materialMatch = fileName.match(/material(\d+)/i);
      if (materialMatch) {
        statusHtml += `<small>- Material ${materialMatch[1]}: ${fileName}</small><br>`;
      }
    });
  }

  statusHtml += "<br><small>Files: " + fileNames.join(", ") + "</small>";

  statusElement.innerHTML = statusHtml;
}

function updateMeasurePanel(type, value) {
  document.getElementById("measureType").innerText = type;
  document.getElementById("measureValue").innerText = value;
}

function clearMeasurePanel() {
  updateMeasurePanel("-", "-");
}
