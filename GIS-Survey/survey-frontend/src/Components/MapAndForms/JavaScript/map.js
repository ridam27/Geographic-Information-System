// MapComponent.js (ready to paste)
import { useState, useEffect, useRef, useCallback } from 'react';
// --- NAYA IMPORT (Download icon ke liye) ---
import { MapPin, Navigation, Loader, Crosshair, CheckSquare, Download, Upload, Sun, Moon, Satellite, LogOut, ChevronDown, Search, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// --- NAYE IMPORTS (Leaflet-Draw ke liye) ---
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import tokml from 'tokml'; // KML export ke liye
import JSZip from 'jszip'; // KMZ unzip karne ke liye (KMZ = zipped KML)
import { kml as kmlToGeoJSON } from '@tmcw/togeojson'; // KML -> GeoJSON, plot karne ke liye
import { io } from 'socket.io-client';
import '../Style/map.css';
import FormSelectionModal from './FormSelectionModal';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Authentication/JavaScript/AuthContext";

import PropertyDetailsForm from './PropertyDetailsForm';
import Notice119Form from './Notice119Form';
import HearingNoticeForm from './HearingNoticeForm';
import AppealForm from './AppealForm';
import Namuna43Form from './Namuna43Form';

// Socket.io client setup
const socket = io('https://geo-survey-backend-2fy8.onrender.com/'); // change origin in prod
  socket.on('connect', () => console.log('connected', socket.id));
  socket.on('survey:created', (data) => {
    console.log('New survey created:', data);
    // e.g. re-fetch /api/get-surveys or update map
  });
  socket.on('survey:updated', (data) => {
    console.log('Survey updated:', data);
    // update styles on map
  });
/* =========================
   FALLBACK LOCATION: used only if live GPS is unavailable or fails.
   Provide completeness (accuracy/altitude etc.) so other logic doesn't get undefined.
   ========================= */
const FALLBACK_LOCATION = {
  lat: 21.10189, 
  lng: 79.09757,
  accuracy: 5, // pretend good accuracy to avoid 'undefined' checks elsewhere
  altitude: 0,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
};

// Turn a GeolocationPositionError (or our own "unsupported" string) into a
// message that actually tells the user what to do about it. error.message
// varies by browser and is often unhelpful ("User denied Geolocation"), so
// we key off error.code instead.
function describeGeoError(err) {
  if (!err) return 'Unable to get your location.';
  if (typeof err === 'string') return err;
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        return 'Location needs a secure connection (HTTPS or localhost) — this page is loaded over plain HTTP from a non-local address.';
      }
      return 'Location permission is blocked. Allow location for this site in the browser, and check that Location Services is turned on in your OS settings.';
    case 2: // POSITION_UNAVAILABLE
      return "Your device/browser couldn't determine a location. Check that Location Services is turned on.";
    case 3: // TIMEOUT
      return 'Getting your location took too long — your network-based location lookup may be slow or unreachable.';
    default:
      return err.message || 'Unable to get your location.';
  }
}

// Runs one navigator.geolocation.watchPosition attempt with the given
// options and reports back via onSuccess/onFail.
function watchOnce(options, onSuccess, onFail) {
  let bestAccuracy = Infinity;
  let attempts = 0;
  const maxAttempts = 5;
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      attempts++;
      const currentAccuracy = position.coords.accuracy;
      if (currentAccuracy < bestAccuracy) {
        bestAccuracy = currentAccuracy;
        onSuccess({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      }
      if (attempts >= maxAttempts || currentAccuracy < 10) {
        navigator.geolocation.clearWatch(watchId);
      }
    },
    (error) => {
      navigator.geolocation.clearWatch(watchId);
      onFail(error);
    },
    options
  );
}

export default function MapComponent() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formSelectorOpen, setFormSelectorOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [polygonLocation, setPolygonLocation] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [usingFallbackLocation, setUsingFallbackLocation] = useState(false);
  const [geoErrorReason, setGeoErrorReason] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // --- Location search + click-to-pin state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null); // { lat, lng, label, timestamp } | null

  // --- KMZ/KML import (plot reference boundaries/roads on the map) ---
  const [kmzLoading, setKmzLoading] = useState(false);
  const [kmzError, setKmzError] = useState(null);
  const [kmzFileName, setKmzFileName] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const locationRequestedRef = useRef(false);
  const userMenuRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchAbortRef = useRef(null);
  const kmzInputRef = useRef(null);
  const kmzLayerRef = useRef(null);

  const { isAuthenticated, authLoading, logout, user } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('geosurvey-theme') === 'dark');
  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      const nextTheme = next ? 'dark' : 'light';
      localStorage.setItem('geosurvey-theme', nextTheme);
      document.body.classList.toggle('theme-dark', next);
      document.body.classList.toggle('theme-light', !next);
      window.dispatchEvent(new CustomEvent('geosurvey-theme-change', { detail: nextTheme }));
      return next;
    });
  };

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const displayName = user?.fullName || user?.email || "Survey User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SU";

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  function collectPolygonsGeoJSON() {
    if (!drawnItemsRef.current) return null;
    const fc = drawnItemsRef.current.toGeoJSON();

    fc.features.forEach((feature) => {
      feature.properties = feature.properties || {};
      feature.properties.usageOfProperty = feature.properties.usageOfProperty || 'default';

      if (!feature.properties.surveyPoint) {
        if (location) {
          feature.properties.surveyPoint = [location.lng, location.lat];
        } else {
          feature.properties.surveyPoint = [FALLBACK_LOCATION.lng, FALLBACK_LOCATION.lat];
        }
      }
    });

    return fc;
  }

  function getPolygonCentroid(coords) {
  let sumLng = 0;
  let sumLat = 0;

  coords.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });

  return {
    lat: sumLat / coords.length,
    lng: sumLng / coords.length
  };
}

  // Most desktops/laptops have no GPS chip, so a GPS-preferring
  // (enableHighAccuracy) request routinely fails or times out on them.
  // Try that first for the best possible fix, then fall back to a
  // network/Wi-Fi based request (which desktops resolve far more
  // reliably) before giving up and reporting an error.
  const fetchAccurateLocation = useCallback((onSuccess, onError) => {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by your browser');
      return;
    }

    watchOnce(
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      onSuccess,
      (firstError) => {
        if (firstError.code === firstError.PERMISSION_DENIED) {
          onError(firstError);
          return;
        }
        watchOnce(
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
          onSuccess,
          (secondError) => onError(secondError)
        );
      }
    );
  }, []);

  // Jumps the map + "Current Coordinates" card to an exact point, whether it
  // came from a Nominatim place-name match or from directly-typed "lat, lng".
  const applySelectedLocation = useCallback((lat, lng, label) => {
    setSelectedPoint({ lat, lng, label, timestamp: new Date() });
    setSearchResults([]);
    setSearchError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 19);
    }
  }, []);

  /* ===========================================
     LOCATION SEARCH: query OpenStreetMap's free Nominatim geocoder for place
     names — but a directly-typed "lat, lng" pair (e.g. "21.0964, 79.1095")
     jumps straight there instead, since Nominatim's free-text search doesn't
     reliably treat raw numbers as coordinates (it can match an unrelated
     real place whose name happens to look like the input). Debounced while
     typing; Enter key searches immediately.
     =========================================== */
  const searchLocation = useCallback(async (query) => {
    const trimmed = query.trim();

    const coordMatch = trimmed.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      let lat = parseFloat(coordMatch[1]);
      let lng = parseFloat(coordMatch[2]);
      // Expected order is "lat, lng" (same order the app itself displays
      // coordinates in). If the first number can't possibly be a latitude
      // (>90°) but the second one can, it was likely typed as "lng, lat"
      // instead — swap rather than reject.
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        if (searchAbortRef.current) searchAbortRef.current.abort();
        setSearchLoading(false);
        applySelectedLocation(lat, lng, `Coordinates: ${lat.toFixed(6)}°, ${lng.toFixed(6)}°`);
        return;
      }
    }

    if (trimmed.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error('Search request failed');
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Location search failed:', err);
      setSearchError('Unable to search right now. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [applySelectedLocation]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchLocation(value), 500);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchLocation(searchQuery);
    }
  };

  const handleClearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    setSearchQuery(result.display_name);
    applySelectedLocation(lat, lng, result.display_name);
  };

  // Drop back to showing the live GPS position in the Current Coordinates card
  const handleUseLiveGps = () => {
    setSelectedPoint(null);
  };

  /* ===========================================
     KMZ/KML IMPORT: plot an existing KMZ/KML file (property boundaries,
     road alignments, etc.) on the map as a read-only reference layer,
     separate from the surveyor's own drawn polygons in drawnItemsRef.
     =========================================== */
  const removeKmzLayer = useCallback(() => {
    if (kmzLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(kmzLayerRef.current);
    }
    kmzLayerRef.current = null;
  }, []);

  const handleClearKmz = () => {
    removeKmzLayer();
    setKmzFileName(null);
    setKmzError(null);
  };

  const plotKmzGeoJSON = useCallback((geojson, fileLabel) => {
    if (!mapInstanceRef.current) return;
    removeKmzLayer();

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const props = feature.properties || {};
        return {
          color: props.stroke || '#a21caf',
          weight: props['stroke-width'] || 3,
          opacity: props['stroke-opacity'] ?? 1,
          fillColor: props.fill || '#a21caf',
          fillOpacity: props['fill-opacity'] ?? 0.15,
        };
      },
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: '#a21caf',
          weight: 2,
          fillColor: '#a21caf',
          fillOpacity: 0.85,
        }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name;
        const description = feature.properties?.description;
        if (name || description) {
          layer.bindPopup(
            `<strong>${name || 'Feature'}</strong>${description ? `<br>${description}` : ''}`
          );
        }
      },
    });

    if (layer.getLayers().length === 0) {
      setKmzError('No plottable features were found in this file.');
      return;
    }

    layer.addTo(mapInstanceRef.current);
    kmzLayerRef.current = layer;
    setKmzFileName(fileLabel);

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [removeKmzLayer]);

  const handleKmzFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file again later
    if (!file) return;

    setKmzError(null);
    setKmzLoading(true);

    try {
      const lowerName = file.name.toLowerCase();
      let kmlText;

      if (lowerName.endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(file);
        const kmlEntry = Object.values(zip.files).find(
          (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.kml')
        );
        if (!kmlEntry) throw new Error('No .kml file found inside this KMZ archive.');
        kmlText = await kmlEntry.async('text');
      } else if (lowerName.endsWith('.kml')) {
        kmlText = await file.text();
      } else {
        throw new Error('Please choose a .kmz or .kml file.');
      }

      const kmlDom = new DOMParser().parseFromString(kmlText, 'text/xml');
      if (kmlDom.querySelector('parsererror')) {
        throw new Error('This file is not valid KML.');
      }

      const geojson = kmlToGeoJSON(kmlDom);
      plotKmzGeoJSON(geojson, file.name);
    } catch (err) {
      console.error('KMZ import failed:', err);
      setKmzError(err.message || 'Could not read this file.');
    } finally {
      setKmzLoading(false);
    }
  };

  /* ===========================================
     DYNAMIC: fetch live GPS on mount. If it fails or times out,
     fall back to FALLBACK_LOCATION so the map still loads.
     =========================================== */
  useEffect(() => {
    if (locationRequestedRef.current) return;
    locationRequestedRef.current = true;

    setLoading(true);

    // Safety net: if GPS doesn't respond in time, use fallback so the
    // app doesn't get stuck on the loading screen. Longer than the two
    // internal geolocation attempts combined (8s + 10s) so they get a
    // fair chance to resolve first.
    const fallbackTimer = setTimeout(() => {
      setLocation((prev) => {
        if (prev) return prev; // GPS already succeeded, ignore fallback
        setGeoErrorReason('Getting your location took too long.');
        setUsingFallbackLocation(true);
        setLoading(false);
        setError(null);
        return FALLBACK_LOCATION;
      });
    }, 20000);

    fetchAccurateLocation(
      (newLocation) => {
        clearTimeout(fallbackTimer);
        setUsingFallbackLocation(false);
        setGeoErrorReason(null);
        setLocation(newLocation);
        setLoading(false);
        setError(null);
      },
      (geoError) => {
        clearTimeout(fallbackTimer);
        const reason = describeGeoError(geoError);
        console.warn('Live GPS unavailable, using fallback location:', reason, geoError);
        setGeoErrorReason(reason);
        setUsingFallbackLocation(true);
        setLocation(FALLBACK_LOCATION);
        setLoading(false);
        setError(null);
      }
    );

    return () => clearTimeout(fallbackTimer);
  }, [fetchAccurateLocation]);

  // --- (IS useEffect MEIN BADLAV HAI) ---
  useEffect(() => {
    // Map init guarded by: location present AND mapInstanceRef not created
    if (location && mapRef.current && !mapInstanceRef.current) {
      const userPosition = [location.lat, location.lng];

      // custom pulsing icon
      const customIcon = L.divIcon({
        className: 'leaflet-pulsing-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      // create map once
      const map = L.map(mapRef.current, {
        zoomControl: true,
      }).setView(userPosition, 19);

      // Retina-aware Google Satellite (HD)
const isRetina = window.devicePixelRatio && window.devicePixelRatio > 1;
const googleScale = isRetina ? 2 : 1;

L.tileLayer(
  `https://mt1.google.com/vt/lyrs=s&scale=${googleScale}&x={x}&y={y}&z={z}`,
  {
    maxZoom: 23,
    maxNativeZoom: 20,   // prevents Leaflet from requesting too-high native tiles
    tileSize: isRetina ? 512 : 256, // use 512 when using scale=2
    zoomOffset: isRetina ? -1 : 0,  // align zoom when tileSize=512
    attribution: '© Google'
  }
).addTo(map);


      // marker + accuracy circle
      const marker = L.marker(userPosition, { icon: customIcon }).addTo(map);
      const circle = L.circle(userPosition, {
        radius: location.accuracy,
        color: '#4F46E5',
        fillColor: '#4F46E5',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);

      // store refs so we don't recreate map later
      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // --- NAYA CODE (LEAFLET-DRAW) ---
      // 1. Ek FeatureGroup banayein jahan drawn items store honge
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems; // Ref mein store karein

      // 2. Draw controls ko map par add karein
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems, // Allow editing/deleting drawn items
          remove: true,
        },
        draw: {
          polygon: true,   // Polygon drawing enable karein
          polyline: true,  // Line drawing enable karein
          rectangle: true, // Rectangle drawing enable karein
          circle: false,   // Disable circle
          marker: false,   // Disable marker (hum GPS marker use kar rahe hain)
          circlemarker: false, // Disable circle marker
        },
      });
      map.addControl(drawControl);

      // 3. Jab koi shape create ho, toh use 'drawnItems' group mein add karein
      map.on(L.Draw.Event.CREATED, function (event) {

  const layer = event.layer;

  // Add polygon to map
  drawnItems.addLayer(layer);

  // Get polygon coordinates
  const geo = layer.toGeoJSON();
  const coords = geo.geometry.coordinates[0];

  // Calculate centroid
  const centroid = getPolygonCentroid(coords);

  // Save centroid for forms
  setPolygonLocation({
    latitude: centroid.lat,
    longitude: centroid.lng,
    geometry: geo.geometry,
    coordinates: coords
  });

  console.log("Polygon centroid:", centroid);

});

      // --- NAYA CODE (LEAFLET-DRAW) KHATAM ---

      // Track whether leaflet-draw is mid-drawing/editing so a plain map
      // click (used to drop a coordinate pin below) doesn't fire while the
      // user is placing polygon/line vertices.
      map.on(L.Draw.Event.DRAWSTART, () => { isDrawingRef.current = true; });
      map.on(L.Draw.Event.DRAWSTOP, () => { isDrawingRef.current = false; });
      map.on(L.Draw.Event.EDITSTART, () => { isDrawingRef.current = true; });
      map.on(L.Draw.Event.EDITSTOP, () => { isDrawingRef.current = false; });
      map.on(L.Draw.Event.DELETESTART, () => { isDrawingRef.current = true; });
      map.on(L.Draw.Event.DELETESTOP, () => { isDrawingRef.current = false; });

      // Click-to-pin: clicking anywhere on the map shows that point's
      // coordinates in the "Current Coordinates" card.
      map.on('click', (e) => {
        if (isDrawingRef.current) return;
        const { lat, lng } = e.latlng;
        setSelectedPoint({ lat, lng, label: null, timestamp: new Date() });
      });
    }
  }, [location]); // Dependency waisa hi hai — map only init once because mapInstanceRef blocks re-creation

  // Render/move the pin dropped by a map click or a search selection.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!selectedPoint) {
      if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
      }
      return;
    }

    const pos = [selectedPoint.lat, selectedPoint.lng];

    if (!selectedMarkerRef.current) {
      const pinIcon = L.divIcon({
        className: 'leaflet-selected-pin',
        html: '<span class="selected-pin-dot"></span>',
        iconSize: [24, 32],
        iconAnchor: [12, 30],
      });
      selectedMarkerRef.current = L.marker(pos, { icon: pinIcon }).addTo(map);
    } else {
      selectedMarkerRef.current.setLatLng(pos);
    }

    if (selectedPoint.label) {
      selectedMarkerRef.current.bindPopup(selectedPoint.label).openPopup();
    } else {
      selectedMarkerRef.current.unbindPopup();
    }
  }, [selectedPoint, location]);

  // Update marker/circle when location (rarely) changes
  useEffect(() => {
    if (location && mapInstanceRef.current && markerRef.current && circleRef.current) {
      const newPos = [location.lat, location.lng];
      markerRef.current.setLatLng(newPos);
      circleRef.current.setLatLng(newPos).setRadius(location.accuracy);
    }
  }, [location]);

  // recenterMap uses current location — safe even in fallback mode
  const recenterMap = useCallback(() => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.lat, location.lng], 19);
    }
  }, [location]);

  // refreshLocation retries live GPS; falls back again if it fails
  const refreshLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAccurateLocation(
      (newLocation) => {
        setUsingFallbackLocation(false);
        setGeoErrorReason(null);
        setLocation(newLocation);
        setLoading(false);
        setError(null);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLocation.lat, newLocation.lng], 19);
        }
      },
      (geoError) => {
        const reason = describeGeoError(geoError);
        console.warn('Refresh location failed:', reason, geoError);
        setGeoErrorReason(reason);
        setError(reason);
        setLoading(false);
      }
    );
  }, [fetchAccurateLocation]);

  const handleProceedClick = () => {
    if (!location) {
      alert('Location not available. Please wait or refresh.');
      return;
    }
    if (!drawnItemsRef.current || drawnItemsRef.current.getLayers().length === 0 || !polygonLocation) {
      alert('Please draw a polygon on the map first before proceeding.');
      return;
    }
    setCapturedLocation(location);
    setFormSelectorOpen(true);
  };
  const handleFormSelect = (formType) => {
  setFormSelectorOpen(false);
  setSelectedForm(formType);
  };
  
        const handleOpenConstructionDemo = () => {
    window.open('https://geo-construction-frontend.onrender.com', '_blank', 'noopener,noreferrer');
  };

  

  // --- NAYI FUNCTION (Aapke KML.js se) ---
  // Yeh function drawn POLYGONS/LINES ko KML mein download karegi
  // modified function with styling
  const handleDownloadDrawnKML = () => {
    if (!drawnItemsRef.current) {
      alert("Draw layer abhi initialize nahin hua hai.");
      return;
    }

    // Convert drawn shapes to GeoJSON
    const allGeoJSON = drawnItemsRef.current.toGeoJSON();

    // Keep polygons / lines
    const filtered = {
      type: "FeatureCollection",
      features: allGeoJSON.features.filter((f) =>
        ["Polygon", "Rectangle", "LineString"].includes(f.geometry.type)
      ),
    };

    if (filtered.features.length === 0) {
      alert("Export karne ke liye koi Polygon ya Line draw nahin kiya gaya hai.");
      return;
    }

    // Generate base KML
    let kml = tokml(filtered);

    // ---------------------------
    // 🔵 BLUE STYLING FOR KML
    // Leaflet blue = #4F46E5
    // Fill opacity 0.1 => alpha hex = 19
    // KML format = AABBGGRR
    //
    // stroke = FF E5 46 4F  => FFE5464F
    // fill   = 19 E5 46 4F  => 19E5464F
    // ---------------------------

    const styleBlock = `
      <Style id="bluePolygon">
        <LineStyle>
          <color>FFE5464F</color>   <!-- Blue stroke -->
          <width>2</width>
        </LineStyle>
        <PolyStyle>
          <color>80E5464F</color>   <!-- Blue fill with opacity ~50% -->
          <fill>1</fill>
          <outline>1</outline>
        </PolyStyle>
      </Style>
    `;

    // Insert style inside <Document>
    kml = kml.replace(/<Document([^>]*)>/i, `<Document$1>${styleBlock}`);

    // Attach style to each Placemark
    kml = kml.replace(/<Placemark>/g, `<Placemark>\n<styleUrl>#bluePolygon</styleUrl>`);

    // Download final styled KML
    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawn_boundary.kml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

 const handleProceedPolygonSurvey = () => {
  if (!drawnItemsRef.current) {
    alert("Please draw a polygon first");
    return;
   }
   

  const polygonsGeoJSON = collectPolygonsGeoJSON();

  if (!polygonsGeoJSON || polygonsGeoJSON.features.length === 0) {
    alert("No polygon found");
    return;
  }

  const kmlString = tokml(polygonsGeoJSON);

  const payload = {
    layerType: "road",
    polygons: polygonsGeoJSON,
    kmlData: kmlString,
    hasVideo: true,
    // videoUrl: "/videos/road-survey.mp4",
    createdFrom: "digital-twin",
  };

  fetch("https://geo-survey-backend-2fy8.onrender.com//api/road-survey/save", {
  // ✅ ONLY THIS CHANGE
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    })
    .then((data) => {
      alert("Polygon survey saved successfully");
      console.log("Saved polygon:", data);
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to save polygon survey");
    });
};


   // ⛔ BLOCK UI AFTER ALL HOOKS
  if (authLoading || !isAuthenticated) {
    return null;
  }
  const signalText =
    location && location.accuracy < 10
      ? 'Excellent Signal'
      : location && location.accuracy < 30
      ? 'Good Signal'
      : 'Weak Signal';

  const signalClass =
    location && location.accuracy < 10
      ? 'accuracy-excellent'
      : location && location.accuracy < 30
      ? 'accuracy-good'
      : 'accuracy-poor';

  // What the "Current Coordinates" card shows: a pinned point (from a map
  // click or search result) takes priority over the live GPS fix.
  const pointToShow = selectedPoint
    ? { lat: selectedPoint.lat, lng: selectedPoint.lng, altitude: null, timestamp: selectedPoint.timestamp, label: selectedPoint.label }
    : location
    ? { lat: location.lat, lng: location.lng, altitude: location.altitude, timestamp: currentTime, label: null }
    : null;

  return (
    <div className={`map-container${darkMode ? ' dark' : ''}`}>
      <div className="map-content">
        <header className="survey-topbar fade-in-item">
          <div className="brand-block">
            <div className="brand-title-wrap">
              <div className="brand-mark">G</div>
              <div>
                <h1 className="brand-title">GeoSurvey</h1>
                <p className="brand-subtitle">Field Data Collection</p>
              </div>
            </div>
          </div>
          <div className="brand-actions">
            <button className="icon-btn theme-toggle" onClick={toggleTheme} title={darkMode ? 'Switch to Light' : 'Switch to Dark'}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="user-menu-shell" ref={userMenuRef}>
              <button
                type="button"
                className="topbar-user user-menu-trigger"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="user-badge">{initials}</span>
                <span className="user-name" title={displayName}>{displayName}</span>
                <ChevronDown size={14} className="user-menu-caret" />
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown" role="menu" aria-label="User menu">
                  <button type="button" className="user-menu-item" onClick={handleLogout} role="menuitem">
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="page-head fade-in-item">
          <p className="crumb">Active Survey Session</p>
          <h2 className="page-title">Location Survey</h2>
          <p className="page-subtitle">Capture precise geospatial data with real-time GPS tracking.</p>
        </section>

        <div className="main-layout-container">
          <div className="layout-left">
            {location && (
              <div className="location-card fade-in-item">
                <div className="location-card-header">
                  <h2 className="location-card-title">GPS Signal Status</h2>
                  <button
                    onClick={refreshLocation}
                    className="refresh-button"
                    disabled={loading}
                  >
                    <Crosshair className="refresh-icon" strokeWidth={1.5} />
                    Refresh
                  </button>
                </div>
                {usingFallbackLocation && (
                  <p className="gps-warning-banner">
                    ⚠ Live GPS unavailable{geoErrorReason ? ` — ${geoErrorReason}` : ''} Showing fallback location. Tap Refresh to retry.
                  </p>
                )}
                <div className="location-grid">
                  <div className={`location-item signal-banner ${signalClass}`}>
                    <p className="location-value">{signalText}</p>
                    <p className="location-label signal-caption">All systems operational</p>
                  </div>
                  <div className="location-item">
                    <p className="location-label">Accuracy</p>
                    <p className="location-value">{location.accuracy.toFixed(1)} m</p>
                  </div>
                  <div className="location-item">
                    <p className="location-label">Satellites</p>
                    <p className="location-value">12</p>
                  </div>
                </div>

                <div className="coord-card">
                  <div className="coord-card-header">
                    <p className="coord-title">Current Coordinates</p>
                    <span className={`coord-source-chip ${selectedPoint ? 'pinned' : 'live'}`}>
                      {selectedPoint ? 'Pinned Location' : 'Live GPS'}
                    </span>
                  </div>
                  {pointToShow.label && (
                    <p className="coord-address" title={pointToShow.label}>{pointToShow.label}</p>
                  )}
                  <div className="coord-values">
                    <div>
                      <p className="location-label">Latitude</p>
                      <p className="location-value">{pointToShow.lat.toFixed(6)}°</p>
                    </div>
                    <div>
                      <p className="location-label">Longitude</p>
                      <p className="location-value">{pointToShow.lng.toFixed(6)}°</p>
                    </div>
                  </div>
                  <div className="meta-row">
                    <span>Altitude: {pointToShow.altitude ? `${pointToShow.altitude.toFixed(1)}m` : 'N/A'}</span>
                    <span>Timestamp:{pointToShow.timestamp.toLocaleTimeString('en-GB')}</span>
                  </div>
                  {selectedPoint && (
                    <button type="button" className="use-live-gps-button" onClick={handleUseLiveGps}>
                      <Crosshair size={12} /> Use Live GPS Location
                    </button>
                  )}
                </div>

                <div className="proceed-button-container">
                  <button
                    onClick={handleProceedClick}
                    className="proceed-button"
                    disabled={loading || !polygonLocation}
                    title={!polygonLocation ? 'Draw a polygon on the map first' : undefined}
                  >
                    <CheckSquare size={18} /> Start Point Survey
                  </button>
                  
                  <button
                    onClick={handleProceedPolygonSurvey}
                    className="proceed-button secondary-action"
                  >
                    <Satellite size={18} /> Road Survey
                  </button>

                  <button
                    onClick={handleDownloadDrawnKML}
                    className="proceed-button secondary-action"
                  >
                    <Download size={18} /> Export Polygon Data
                  </button>

                  <input
                    type="file"
                    ref={kmzInputRef}
                    accept=".kmz,.kml"
                    onChange={handleKmzFileSelected}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => kmzInputRef.current?.click()}
                    className="proceed-button secondary-action"
                    disabled={kmzLoading}
                  >
                    <Upload size={18} /> {kmzLoading ? 'Importing KMZ…' : 'Import KMZ'}
                  </button>

                  {kmzFileName && (
                    <div className="kmz-layer-chip">
                      <MapPin size={14} />
                      <span className="kmz-layer-chip-name" title={kmzFileName}>{kmzFileName}</span>
                      <button
                        type="button"
                        onClick={handleClearKmz}
                        className="kmz-layer-chip-remove"
                        title="Remove KMZ layer"
                        aria-label="Remove KMZ layer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  {kmzError && <p className="kmz-error-text">{kmzError}</p>}


  {/* Construction Demo Button */}
  <button
    onClick={handleOpenConstructionDemo}
    className="proceed-button secondary-action"
  >
    <Download size={18} /> Construction
  </button>

                </div>

              </div>
            )}
          </div>
          <div className="layout-right">
            <div className="map-search-card fade-in-item">
              <div className="map-search-input-wrap">
                <Search size={16} className="map-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search a place, or enter 'lat, lng'…"
                  className="map-search-input"
                  aria-label="Search for a location, or enter latitude, longitude coordinates"
                />
                {searchLoading && <Loader size={14} className="map-search-spinner" />}
                {!searchLoading && searchQuery && (
                  <button
                    type="button"
                    className="map-search-clear"
                    onClick={handleClearSearch}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {searchError && <p className="map-search-error">{searchError}</p>}
              {searchResults.length > 0 && (
                <ul className="map-search-results">
                  {searchResults.map((result) => (
                    <li key={result.place_id}>
                      <button type="button" onClick={() => handleSelectSearchResult(result)}>
                        <MapPin size={14} className="map-search-result-icon" />
                        <span>{result.display_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="map-search-hint">Tip: click the map for its coordinates, or type "lat, lng" above to jump there.</p>
            </div>
            <div className="map-wrapper fade-in-item">
              <div className="map-chip-row">
                {/* <button className="map-chip active">Satellite View</button> */}
                {/* <button className="map-chip">Live Tracking</button> */}
              </div>

              {loading && (
                <div className="map-loading">
                  <div className="loading-content">
                    <Loader className="loading-spinner" strokeWidth={1.5} />
                    <p className="loading-text">Getting your location...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="map-error">
                  <div className="error-content">
                    <div className="error-icon">
                      <MapPin className="error-svg" strokeWidth={1.5} />
                    </div>
                    <h3 className="error-title">Location Access Required</h3>
                    <p className="error-message">{error}</p>
                    <button onClick={refreshLocation} className="error-button">
                      Try Again
                    </button>
                  </div>
                </div>
              )}
              <div
                ref={mapRef}
                className={`map ${!(loading || error) ? 'map-visible' : ''}`}
              ></div>

              {location && (
                <button
                  onClick={recenterMap}
                  className="recenter-map-button"
                  title="Recenter Map"
                >
                  <Navigation className="recenter-icon" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
     {/* Form Selection Modal */}
<FormSelectionModal
  isOpen={formSelectorOpen}
  onClose={() => setFormSelectorOpen(false)}
  onSelect={handleFormSelect}
/>

{/* Property Details Form */}
{selectedForm === "property" && (
  <PropertyDetailsForm
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  capturedLocation={capturedLocation}
  polygonLocation={polygonLocation}
/>
)}

{/* 119 Notice */}
{selectedForm === "notice119" && (
 <Notice119Form
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  polygonLocation={polygonLocation}
/>
)}

{/* Hearing Notice */}
{selectedForm === "hearing" && (
  <HearingNoticeForm
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  polygonLocation={polygonLocation}
/>
)}

{/* Appeal Form */}
{selectedForm === "appeal" && (
  <AppealForm
    isOpen={true}
    onClose={() => setSelectedForm(null)}
    polygonLocation={polygonLocation}
  />
)}

{/* Namuna 43 */}
{selectedForm === "namuna43" && (
<Namuna43Form
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  polygonLocation={polygonLocation}
/>
)}
      </div>
  ); 
}
