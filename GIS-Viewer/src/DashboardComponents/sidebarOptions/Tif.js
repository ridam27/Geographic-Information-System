import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Tif.css';

import GeoRasterLayer from 'georaster-layer-for-leaflet';
import parseGeoraster from 'georaster';
import { usePersistentState } from '../../hooks/usePersistentState';
import { uploadGisFile, fetchGisFile } from '../../services/gisFileApi';

const position = [21.1458, 79.0882]; // Centered on India
const zoom = 5;

// Note: `georaster` already parses the GeoTIFF in its own internal Web
// Worker (see its package source) whenever window.Worker is available, so
// the heavy decode step is already off the main thread. What was actually
// hurting perf here was that a previously-added raster layer was never
// removed on re-upload, so layers piled up and kept rendering forever.
const GeoTiffLayer = ({ file, onLoadStart, onLoadEnd }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (file) {
      onLoadStart?.();
      const reader = new FileReader();

      reader.onload = async function () {
        try {
          const arrayBuffer = reader.result;
          const georaster = await parseGeoraster(arrayBuffer);
          if (cancelled) return;

          // Remove the previous raster layer before adding the new one.
          if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
          }

          const layer = new GeoRasterLayer({
            georaster,
            opacity: 0.7,
            resolution: 256, // or adjust for quality/performance
          });

          layer.addTo(map);
          layerRef.current = layer;
          map.fitBounds(layer.getBounds());

          // Wait for the currently-visible tiles to actually finish
          // painting before clearing the loading state.
          if (layer.once) {
            layer.once('load', () => onLoadEnd?.());
          } else {
            onLoadEnd?.();
          }
        } catch (error) {
          console.error('Error loading GeoTIFF:', error);
          alert('Error processing TIF file: ' + error.message);
          onLoadEnd?.();
        }
      };
      reader.onerror = () => {
        console.error('Error reading TIF file');
        onLoadEnd?.();
      };
      reader.readAsArrayBuffer(file);
    }

    return () => {
      cancelled = true;
    };
  }, [file, map, onLoadStart, onLoadEnd]);

  // Clean up the raster layer when this component unmounts (e.g. leaving the TIF tab).
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
};

const FileUploadArea = ({ onFileChange, selectedFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
        onFileChange({ target: { files: [file] } });
      }
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h3>Upload file</h3>
      </div>
      
      <p className="upload-description">
        Upload your <strong>TIF file</strong> to Visualise
        the detailed information of the location.
      </p>
      
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="file-upload"
          type="file"
          accept=".tif,.tiff"
          onChange={onFileChange}
          className="file-input"
        />
        <label htmlFor="file-upload" className="upload-label">
          Click here or drag file to upload
        </label>
      </div>
      
      {selectedFile && (
        <div className="selected-file">
          <div className="file-icon">
            <span className="file-type">TIF</span>
          </div>
          <span className="file-name">{selectedFile.name}</span>
        </div>
      )}
      
      <div className="upload-instructions">
        <p>Note: Only .tif files are allowed</p>
      </div>
    </div>
  );
};

const MapUI = () => {
  const [orthophotoFile, setOrthophotoFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Only the small fileId/metadata is persisted — the actual TIF bytes live
  // on the backend (see gisFileApi/gisFileRoutes) and get fetched back here.
  const [tifFileMeta, setTifFileMeta] = usePersistentState('tif-file-meta', null);
  const restoreAttempted = useRef(false);

  // On first mount, if a previous upload's fileId was persisted, pull the
  // original file back from the backend and re-run the normal parse flow.
  useEffect(() => {
    if (restoreAttempted.current || !tifFileMeta?.fileId) return;
    restoreAttempted.current = true;

    setIsRestoring(true);
    fetchGisFile(tifFileMeta.fileId).then((blob) => {
      if (blob) {
        const restoredFile = new File([blob], tifFileMeta.originalName, {
          type: tifFileMeta.mimeType || blob.type,
        });
        setOrthophotoFile(restoredFile);
      } else {
        // Backend copy is gone or unreachable — drop the stale reference
        // rather than retrying forever on every mount.
        setTifFileMeta(null);
      }
      setIsRestoring(false);
    });
  }, [tifFileMeta, setTifFileMeta]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOrthophotoFile(file);

    // Save the original file to the backend so it survives a refresh. This
    // runs alongside the local tile rendering (see GeoTiffLayer above), and
    // `isSaving` keeps the loading overlay up until it's actually done —
    // otherwise a refresh right after the tiles finish rendering (but before
    // the upload completes) would silently lose the fileId and nothing
    // would be there to restore next time.
    setIsSaving(true);
    uploadGisFile(file).then((result) => {
      if (result) {
        setTifFileMeta({
          fileId: result.fileId,
          originalName: result.originalName,
          mimeType: file.type,
        });
      } else {
        console.warn('Could not save this TIF to the backend — it will need to be re-uploaded after a refresh.');
      }
      setIsSaving(false);
    });
  };

  return (
    <div className="map-ui-container">
      <div className="sidebar">
        <FileUploadArea
          onFileChange={handleFileChange}
          selectedFile={orthophotoFile}
        />
      </div>

      <div className="map-container" style={{ position: 'relative' }}>
        {(isLoading || isRestoring || isSaving) && (
          <div className="tif-loading-overlay">
            <span className="tif-spinner" />
            <span>
              {isRestoring
                ? 'Restoring your last TIF…'
                : isLoading
                ? 'Loading TIF…'
                : 'Saving to server… (safe to refresh once this finishes)'}
            </span>
          </div>
        )}
        <MapContainer center={position} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          {/* Satellite imagery layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            maxZoom={18}
          />
          {/* Labels layer for hybrid effect */}
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='© <a href="https://www.esri.com/">Esri</a> | Labels'
            maxZoom={18}
            opacity={0.8} // Slightly transparent to let satellite imagery show through
          />
          {orthophotoFile && (
            <GeoTiffLayer
              file={orthophotoFile}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapUI;