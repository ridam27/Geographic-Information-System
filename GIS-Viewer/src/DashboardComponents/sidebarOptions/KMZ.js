import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import JSZip from 'jszip';
import proj4 from 'proj4';
import { usePersistentState } from '../../hooks/usePersistentState';
import { uploadGisFile, fetchGisFile } from '../../services/gisFileApi';
import './KMZ.css';

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
    <line x1="8" y1="2" x2="8" y2="18"></line>
    <line x1="16" y1="6" x2="16" y2="22"></line>
  </svg>
);

const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

// Styles
const styles = {
  container: {
    display: 'flex',
    height: '100%',
    position: 'relative',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
    overflowY: 'auto',
    height: '100%',
    zIndex: 1000,
  },
  mapContainer: {
    flex: 1,
    height: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    padding: '20px',
    borderBottom: '1px solid #eaeaea',
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionContent: {
    padding: '20px',
  },
  layerItem: {
    marginBottom: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '15px',
    transition: 'all 0.2s ease',
  },
  layerItemActive: {
    backgroundColor: '#e9f7fe',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
  },
  layerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  layerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '48px',
    height: '24px',
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '0.4s',
    borderRadius: '24px',
  },
  toggleSliderActive: {
    backgroundColor: '#2196F3',
  },
  toggleSliderBefore: {
    position: 'absolute',
    content: '""',
    height: '18px',
    width: '18px',
    left: '3px',
    bottom: '3px',
    backgroundColor: 'white',
    transition: '0.4s',
    borderRadius: '50%',
  },
  toggleSliderBeforeActive: {
    transform: 'translateX(24px)',
  },
  uploadButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    border: '1px dashed #ccc',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    color: '#666',
  },
  uploadButtonHover: {
    backgroundColor: '#e8e8e8',
    borderColor: '#aaa',
  },
  fileInput: {
    display: 'none',
  },
  badge: {
    fontSize: '12px',
    padding: '3px 8px',
    borderRadius: '12px',
    backgroundColor: '#e6f7ff',
    color: '#0073cf',
    marginLeft: 'auto',
  },
  badgeSuccess: {
    backgroundColor: '#e6fff2',
    color: '#00b371',
  },
  logoContainer: {
    padding: '20px',
    borderBottom: '1px solid #eaeaea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2196F3',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrapper: {
    display: 'inline-flex',
    marginRight: '8px',
    verticalAlign: 'middle',
  },
  tabButton: {
    flex: 1,
    padding: '15px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  }
};

// Setup UTM projections
const setupProjections = () => {
  // Add UTM zone definitions (1-60 for both north and south)
  for (let zone = 1; zone <= 60; zone++) {
    proj4.defs(`UTM${zone}N`, `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`);
    proj4.defs(`UTM${zone}S`, `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`);
  }
};

setupProjections();

// Helper function to normalize file paths
const normalizePath = (baseDir, relativePath) => {
  if (!relativePath) return '';
  
  // Remove leading slashes and handle backslashes
  relativePath = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  
  if (relativePath.startsWith('../')) {
    const baseSegments = baseDir.split('/').filter(Boolean);
    const relativeSegments = relativePath.split('/');
    
    let segments = [...baseSegments];
    for (const segment of relativeSegments) {
      if (segment === '..') {
        segments.pop();
      } else if (segment !== '.') {
        segments.push(segment);
      }
    }
    return segments.join('/');
  }
  
  if (baseDir && !relativePath.includes('/')) {
    return `${baseDir}/${relativePath}`;
  }
  
  return relativePath;
};

// Function to detect coordinate system from KML
const detectCoordinateSystem = (xmlDoc) => {
  // Check for explicit coordinate system definition
  const hint = xmlDoc.querySelector('coordinates')?.getAttribute('coordSystem') ||
               xmlDoc.querySelector('LatLonBox') ? 'EPSG:4326' : null;
  
  if (hint) return hint;
  
  // Try to detect UTM from coordinate values
  const coords = xmlDoc.querySelector('coordinates')?.textContent;
  if (coords) {
    const [x, y] = coords.trim().split(/\s+/)[0].split(',').map(Number);
    if (x > 100000 && y > 100000) {
      // Likely UTM coordinates
      const utmZone = Math.floor((x + 180) / 6) + 1;
      return y > 0 ? `UTM${utmZone}N` : `UTM${utmZone}S`;
    }
  }
  
  return 'EPSG:4326'; // Default to lat/lon
};

// Function to load image from various possible locations in ZIP
const loadImageFromZip = async (zip, imagePath, baseDir = '') => {
  const possiblePaths = [
    imagePath,
    `${baseDir}/${imagePath}`,
    `files/${imagePath}`,
    `images/${imagePath}`,
    imagePath.split('/').pop(),
    `doc.files/${imagePath}`,
    `doc.files/files/${imagePath}`,
  ].map(path => path.replace(/^[/\\]+/, ''));
  
  for (const path of possiblePaths) {
    const imageFile = zip.file(path);
    if (imageFile) {
      try {
        const imageBlob = await imageFile.async('blob');
        return URL.createObjectURL(imageBlob);
      } catch (error) {
        console.warn(`Failed to load image from ${path}:`, error);
      }
    }
  }
  
  console.warn('Image not found in any expected location:', imagePath);
  return null;
};

// Function to load and parse KML files recursively.
// The XML is parsed once here and the resulting xmlDoc is carried along with
// the result, so callers (GroundOverlay processing) don't have to re-parse
// the same KML text a second time.
const loadKmlFiles = async (zip, filePath, baseDir = '', loadedFiles = new Set()) => {
  const normalizedPath = normalizePath(baseDir, filePath);

  if (loadedFiles.has(normalizedPath)) {
    return [];
  }
  loadedFiles.add(normalizedPath);

  const kmlFile = zip.file(normalizedPath);
  if (!kmlFile) {
    console.warn('KML file not found:', normalizedPath);
    return [];
  }

  const kmlText = await kmlFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'application/xml');

  const currentDir = normalizedPath.split('/').slice(0, -1).join('/');

  // Handle NetworkLinks
  const networkLinks = Array.from(
    xmlDoc.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "NetworkLink") ||
    xmlDoc.getElementsByTagName("NetworkLink")
  );

  const linkedKmlPromises = networkLinks.map(async (link) => {
    const href = link.querySelector('href')?.textContent ||
                link.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "href")[0]?.textContent;

    if (href) {
      return loadKmlFiles(zip, href, currentDir, loadedFiles);
    }
    return [];
  });

  const linkedResults = await Promise.all(linkedKmlPromises);

  return [{
    kmlText,
    xmlDoc,
    basePath: currentDir,
    coordSystem: detectCoordinateSystem(xmlDoc)
  }].concat(linkedResults.flat());
};

// KmlMap Component
const KmlMap = ({ kmlContent, isActive, zip, baseDir }) => {
  const map = useMap();
  const [, setOverlays] = useState([]);

  const processGroundOverlay = useCallback(async (groundOverlay, baseDir, coordSystem) => {
    const icon = groundOverlay.querySelector('Icon') ||
                groundOverlay.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "Icon")[0];
    if (!icon) return null;
  
    const href = icon.querySelector('href')?.textContent ||
                icon.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "href")[0]?.textContent;
    if (!href) return null;
  
    const imageUrl = zip ? await loadImageFromZip(zip, href, baseDir) : href;
    if (!imageUrl) return null;
  
    // Check for LatLonBox
    const latLonBox = groundOverlay.querySelector('LatLonBox') ||
                     groundOverlay.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "LatLonBox")[0];
    
    // Check for gx:LatLonQuad
    const latLonQuad = groundOverlay.querySelector('gx\\:LatLonQuad') ||
                       groundOverlay.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "LatLonQuad")[0];
  
    let bounds;
  
    if (latLonBox) {
      // Handle LatLonBox
      const getCoord = (tag) => {
        const element = latLonBox.querySelector(tag) ||
                       latLonBox.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", tag)[0];
        return parseFloat(element?.textContent);
      };
  
      const north = getCoord("north");
      const south = getCoord("south");
      const east = getCoord("east");
      const west = getCoord("west");
  
      if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
        return null;
      }
  
      if (coordSystem !== 'EPSG:4326') {
        const sw = proj4(coordSystem, 'EPSG:4326', [west, south]);
        const ne = proj4(coordSystem, 'EPSG:4326', [east, north]);
        bounds = L.latLngBounds([sw[1], sw[0]], [ne[1], ne[0]]);
      } else {
        bounds = L.latLngBounds([[south, west], [north, east]]);
      }
    } else if (latLonQuad) {
      // Handle gx:LatLonQuad
      const coordinates = latLonQuad.querySelector('coordinates')?.textContent ||
                         latLonQuad.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "coordinates")[0]?.textContent;
      
      if (!coordinates) return null;
  
      // Parse coordinates (format: lon,lat,alt lon,lat,alt lon,lat,alt lon,lat,alt)
      const coords = coordinates.trim().split(/\s+/).map(coord => {
        const [lon, lat] = coord.split(',').map(parseFloat);
        return [lat, lon]; // Leaflet uses [lat, lon] format
      });
  
      if (coords.length !== 4) return null;
  
      if (coordSystem !== 'EPSG:4326') {
        // Transform coordinates if not in EPSG:4326
        const transformedCoords = coords.map(([lat, lon]) => {
          const [newLon, newLat] = proj4(coordSystem, 'EPSG:4326', [lon, lat]);
          return [newLat, newLon];
        });
        bounds = L.latLngBounds(transformedCoords);
      } else {
        bounds = L.latLngBounds(coords);
      }
    } else {
      return null;
    }
  
    return { bounds, imageUrl };
  }, [zip]);

  const updateOverlays = useCallback(async () => {
    // Clear existing overlays regardless of isActive state
    setOverlays(prev => {
      prev.forEach(overlay => {
        if (overlay.leafletOverlay) {
          map.removeLayer(overlay.leafletOverlay);
        }
        URL.revokeObjectURL(overlay.imageUrl);
      });
      return [];
    });

    // Only add new overlays if the layer is active
    if (!isActive || !kmlContent || (!zip && !kmlContent.includes('<kml'))) return;

    try {
      let kmlFiles;
      if (zip) {
        kmlFiles = await loadKmlFiles(zip, 'doc.kml', '', new Set());
      } else {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlContent, 'application/xml');
        kmlFiles = [{
          kmlText: kmlContent,
          xmlDoc,
          basePath: '',
          coordSystem: detectCoordinateSystem(xmlDoc)
        }];
      }

      const allOverlayPromises = kmlFiles.flatMap(({ xmlDoc, basePath, coordSystem }) => {
        const groundOverlays = Array.from(
          xmlDoc.getElementsByTagNameNS("http://www.opengis.net/kml/2.2", "GroundOverlay") ||
          xmlDoc.getElementsByTagName("GroundOverlay")
        );
        
        return groundOverlays.map(overlay => processGroundOverlay(overlay, basePath, coordSystem));
      });

      const newOverlays = (await Promise.all(allOverlayPromises))
        .filter(overlay => overlay !== null);

      setOverlays(newOverlays.map(overlay => {
        const leafletOverlay = L.imageOverlay(overlay.imageUrl, overlay.bounds).addTo(map);
        return { ...overlay, leafletOverlay };
      }));

      if (newOverlays.length > 0) {
        const allBounds = L.latLngBounds(newOverlays.map(o => o.bounds));
        map.fitBounds(allBounds);
      }

    } catch (error) {
      console.error('Error updating overlays:', error);
    }
  }, [map, kmlContent, isActive, zip, processGroundOverlay]);

  // Effect to update overlays when isActive changes or when component mounts/unmounts
  useEffect(() => {
    updateOverlays();
    
    return () => {
      setOverlays(prev => {
        prev.forEach(overlay => {
          if (overlay.leafletOverlay) {
            map.removeLayer(overlay.leafletOverlay);
          }
          URL.revokeObjectURL(overlay.imageUrl);
        });
        return [];
      });
    };
  }, [updateOverlays, map]);

  return null;
};

// LayerItem Component
const LayerItem = ({ name, isActive, fileUploaded, isLoading, onToggle, onFileUpload }) => {
  const [hover, setHover] = useState(false);
  const fileInputRef = React.createRef();

  const handleFileInputClick = () => {
    fileInputRef.current.click();
  };

  const getLayerIcon = () => {
    if (name === 'Orthophotos') return <MapIcon />;
    return <LayersIcon />;
  };

  return (
    <div 
      style={{
        ...styles.layerItem,
        ...(isActive ? styles.layerItemActive : {})
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.layerHeader}>
        <h3 style={styles.layerTitle}>
          <span style={styles.iconWrapper}>{getLayerIcon()}</span>
          {name}
          
          {fileUploaded && (
            <span style={{
              ...styles.badge,
              ...(isActive ? styles.badgeSuccess : {})
            }}>
              {isActive ? 'Active' : 'Loaded'}
            </span>
          )}
        </h3>
        
        <label style={styles.toggleSwitch}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={onToggle}
            style={styles.toggleInput}
          />
          <span style={{
            ...styles.toggleSlider,
            ...(isActive ? styles.toggleSliderActive : {})
          }}>
            <span style={{
              ...styles.toggleSliderBefore,
              ...(isActive ? styles.toggleSliderBeforeActive : {})
            }}></span>
          </span>
        </label>
      </div>
      
      {isActive && !fileUploaded && (
        <div>
          <div
            style={{
              ...styles.uploadButton,
              ...(hover ? styles.uploadButtonHover : {}),
              ...(isLoading ? { cursor: 'wait', opacity: 0.7 } : {}),
            }}
            onClick={isLoading ? undefined : handleFileInputClick}
          >
            {isLoading ? (
              <>
                <span className="kmz-spinner" /> Processing file…
              </>
            ) : (
              <>
                <span style={styles.iconWrapper}><UploadIcon /></span> Upload KML/KMZ File
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={onFileUpload}
            accept=".kmz,.kml"
            style={styles.fileInput}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
};
// Main Map Component
const Map = () => {
  // `layers` holds the parsed-in-memory result (zip/kmlContent) and cannot
  // survive a refresh on its own. `layersMeta` holds only small, string-safe
  // data — the backend fileId for each layer's original upload plus the
  // toggle state — and IS persisted, so it can drive re-fetching the file
  // from the backend and re-running the exact same parse below.
  const [layers, setLayers] = useState({
    Orthophotos: { kmlContent: null, isActive: false, zip: null, baseDir: '', fileUploaded: false },
    DTM: { kmlContent: null, isActive: false, zip: null, baseDir: '', fileUploaded: false },
    DSM: { kmlContent: null, isActive: false, zip: null, baseDir: '', fileUploaded: false },
  });
  const [layersMeta, setLayersMeta] = usePersistentState('kmz-layers-meta', {});
  const [activeTab, setActiveTab] = usePersistentState('kmz-active-tab', 'upload'); // 'upload' or 'active'
  const [loadingLayer, setLoadingLayer] = useState(null); // name of layer currently being processed
  const restoreAttempted = useRef(false);

  // Shared parse path for both a freshly-picked file and a file fetched
  // back from the backend on restore. `persist: false` is used for the
  // restore path so we don't re-upload the file we just downloaded.
  const processFile = async (file, layerName, { persist = true, isActive = true } = {}) => {
    if (!file || (!file.name.endsWith('.kmz') && !file.name.endsWith('.kml'))) {
      if (persist) alert('Please upload a valid KMZ or KML file.');
      return;
    }

    setLoadingLayer(layerName);
    // Kick the backend save off in parallel with the local parse below,
    // rather than after it — for a large file this roughly halves the time
    // the loading indicator has to stay up.
    const uploadPromise = persist ? uploadGisFile(file) : null;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (file.name.endsWith('.kmz')) {
          const zip = await JSZip.loadAsync(event.target.result);
          const kmlFiles = await loadKmlFiles(zip, 'doc.kml');

          if (kmlFiles.length === 0) {
            throw new Error('No valid KML files found in KMZ');
          }

          setLayers(prev => ({
            ...prev,
            [layerName]: {
              kmlContent: kmlFiles[0].kmlText,
              isActive,
              zip: zip,
              baseDir: kmlFiles[0].basePath,
              fileUploaded: true
            },
          }));
        } else {
          // Handle direct KML file
          const kmlContent = new TextDecoder().decode(event.target.result);
          setLayers(prev => ({
            ...prev,
            [layerName]: {
              kmlContent: kmlContent,
              isActive,
              zip: null,
              baseDir: '',
              fileUploaded: true
            },
          }));
        }

        if (persist) {
          // Wait for the backend save to actually finish (not just the
          // local parse) before clearing the loading state below — this is
          // what makes it safe for the user to refresh once the spinner
          // stops, instead of the save silently still being in flight.
          const result = await uploadPromise;
          if (result) {
            setLayersMeta(prev => ({
              ...prev,
              [layerName]: {
                fileId: result.fileId,
                originalName: result.originalName,
                mimeType: file.type,
                isActive: true,
              },
            }));
          } else {
            console.warn(
              `Could not save "${layerName}" to the backend — it will need to be re-uploaded after a refresh.`
            );
          }
        }
      } catch (error) {
        console.error('Error processing file:', error);
        if (persist) alert('Error loading file: ' + error.message);
      } finally {
        setLoadingLayer(null);
      }
    };
    reader.onerror = () => setLoadingLayer(null);

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e, layerName) => {
    processFile(e.target.files[0], layerName);
  };

  // On first mount, restore any layers that have a saved fileId by
  // re-fetching the original file from the backend and re-running the same
  // parse used for a fresh upload.
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;

    Object.entries(layersMeta).forEach(([layerName, meta]) => {
      if (!meta?.fileId) return;
      fetchGisFile(meta.fileId).then((blob) => {
        if (blob) {
          const restoredFile = new File([blob], meta.originalName, {
            type: meta.mimeType || blob.type,
          });
          processFile(restoredFile, layerName, { persist: false, isActive: meta.isActive !== false });
        } else {
          // Backend copy is gone/unreachable — drop the stale reference.
          setLayersMeta(prev => {
            const next = { ...prev };
            delete next[layerName];
            return next;
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLayer = (layerName) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        isActive: !prev[layerName].isActive,
      },
    }));
    setLayersMeta(prev => (
      prev[layerName]
        ? { ...prev, [layerName]: { ...prev[layerName], isActive: !prev[layerName].isActive } }
        : prev
    ));
  };

  // Count active layers
  const activeLayersCount = Object.values(layers).filter(layer => layer.fileUploaded && layer.isActive).length;
  const loadedLayersCount = Object.values(layers).filter(layer => layer.fileUploaded).length;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>
            <span style={styles.iconWrapper}><MapIcon /></span> KMZ Viewer
          </div>
        </div>

        <div style={{
          display: 'flex',
          borderBottom: '1px solid #eaeaea',
        }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              ...styles.tabButton,
              backgroundColor: activeTab === 'upload' ? '#f8f9fa' : 'transparent',
              borderBottom: activeTab === 'upload' ? '2px solid #2196F3' : 'none',
              fontWeight: activeTab === 'upload' ? '600' : '400',
              color: activeTab === 'upload' ? '#2196F3' : '#666',
            }}
          >
            <span style={styles.iconWrapper}><UploadIcon /></span> Upload Layers
          </button>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              ...styles.tabButton,
              backgroundColor: activeTab === 'active' ? '#f8f9fa' : 'transparent',
              borderBottom: activeTab === 'active' ? '2px solid #2196F3' : 'none',
              fontWeight: activeTab === 'active' ? '600' : '400',
              color: activeTab === 'active' ? '#2196F3' : '#666',
            }}
          >
            <span style={styles.iconWrapper}><LayersIcon /></span> Active Layers
            {loadedLayersCount > 0 && (
              <span style={{
                ...styles.badge,
                marginLeft: '8px',
              }}>
                {activeLayersCount}/{loadedLayersCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'upload' && (
          <div style={styles.sectionContent}>
            {Object.keys(layers).map((layerName) => (
              <LayerItem
                key={layerName}
                name={layerName}
                isActive={layers[layerName].isActive}
                fileUploaded={layers[layerName].fileUploaded}
                isLoading={loadingLayer === layerName}
                onToggle={() => toggleLayer(layerName)}
                onFileUpload={(e) => handleFileUpload(e, layerName)}
              />
            ))}
          </div>
        )}

        {activeTab === 'active' && (
          <div style={styles.sectionContent}>
            {loadedLayersCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#666' }}>
                <div style={{ marginBottom: '15px', opacity: 0.5 }}>
                  <UploadIcon />
                </div>
                <p>No layers uploaded yet.</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  style={styles.actionButton}
                >
                  Upload Layers
                </button>
              </div>
            ) : (
              Object.keys(layers).map((layerName) => (
                layers[layerName].fileUploaded && (
                  <LayerItem
                    key={`active-${layerName}`}
                    name={layerName}
                    isActive={layers[layerName].isActive}
                    fileUploaded={layers[layerName].fileUploaded}
                    onToggle={() => toggleLayer(layerName)}
                    onFileUpload={(e) => handleFileUpload(e, layerName)}
                  />
                )
              ))
            )}
          </div>)}
      </div>

      <div style={styles.mapContainer}>
        <MapContainer
          center={[20.5937, 77.9629]}
          zoom={5}
          minZoom={3}
          maxZoom={18}
          style={styles.map}
        >
          {/* Satellite imagery layer */}
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='© <a href="https://www.esri.com/">Esri</a> | Satellite Imagery'
            maxZoom={18}
          />
          {/* Labels layer for hybrid effect */}
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='© <a href="https://www.esri.com/">Esri</a> | Labels'
            maxZoom={18}
            opacity={0.8} // Slightly transparent to let satellite imagery show through
          />
          {Object.entries(layers).map(([layerName, { kmlContent, isActive, zip, baseDir }]) => (
            <KmlMap
              key={layerName}
              kmlContent={kmlContent}
              isActive={isActive}
              zip={zip}
              baseDir={baseDir}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

// Main App Component
const KMZViewer = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)' }}>
      <Map />

    </div>
  );
};

export default KMZViewer;
