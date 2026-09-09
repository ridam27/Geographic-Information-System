// src/services/gisFileApi.js
//
// Thin client for the backend's persistent GIS file storage
// (backend/routes/gisFileRoutes.js). Uploads the original KMZ/TIF/KML file
// once, gets back a small `fileId`, and that id — not the file itself — is
// what gets persisted in localStorage so a refresh can fetch the bytes back
// and re-run the existing parsing pipeline.
//
// Every call is wrapped so a network/backend failure degrades gracefully:
// callers get `null`/`false` back instead of a thrown error, so the rest of
// the upload flow can just carry on working locally (as it did before this
// existed) if the backend isn't reachable.

const API_URL = process.env.REACT_APP_API_URL || '';

/**
 * Upload a File/Blob to persistent storage.
 * @returns {Promise<{fileId: string, fileType: string, originalName: string, size: number} | null>}
 */
export async function uploadGisFile(file) {
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await fetch(`${API_URL}/api/gis-files/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      console.warn('gisFileApi.upload failed:', response.status, await safeText(response));
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('gisFileApi.upload error (continuing without persistence):', error.message);
    return null;
  }
}

/**
 * Fetch a previously-uploaded file's bytes back as a Blob.
 * @returns {Promise<Blob | null>}
 */
export async function fetchGisFile(fileId) {
  if (!fileId) return null;
  try {
    const response = await fetch(`${API_URL}/api/gis-files/${fileId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('gisFileApi.fetch failed:', response.status, await safeText(response));
      return null;
    }

    return await response.blob();
  } catch (error) {
    console.warn('gisFileApi.fetch error:', error.message);
    return null;
  }
}

/** Delete a previously-uploaded file (best-effort; failures are logged only). */
export async function deleteGisFile(fileId) {
  if (!fileId) return false;
  try {
    const response = await fetch(`${API_URL}/api/gis-files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    console.warn('gisFileApi.delete error:', error.message);
    return false;
  }
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
