// MapComponent.js (ready to paste)
import { useState, useEffect, useRef, useCallback } from 'react';
// --- NAYA IMPORT (Download icon ke liye) ---
import { MapPin, Navigation, Loader, Crosshair, CheckSquare, Download, Sun, Moon, Satellite, LogOut, ChevronDown } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// --- NAYE IMPORTS (Leaflet-Draw ke liye) ---
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import tokml from 'tokml'; // KML export ke liye
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
  lat: 21.096398,
  lng: 79.109468,
  accuracy: 5, // pretend good accuracy to avoid 'undefined' checks elsewhere
  altitude: 0,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
};

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
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const locationRequestedRef = useRef(false);
  const userMenuRef = useRef(null);

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

  // ... (fetchAccurateLocation function waisa hi hai) ...
  const fetchAccurateLocation = useCallback((onSuccess, onError) => {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by your browser');
      return;
    }
    let bestAccuracy = Infinity;
    let attempts = 0;
    const maxAttempts = 5;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++;
        const currentAccuracy = position.coords.accuracy;
        if (currentAccuracy < bestAccuracy) {
          bestAccuracy = currentAccuracy;
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          };
          onSuccess(newLocation);
        }
        if (attempts >= maxAttempts || currentAccuracy < 10) {
          navigator.geolocation.clearWatch(watchId);
        }
      },
      (error) => {
        onError(error.message);
        navigator.geolocation.clearWatch(watchId);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  /* ===========================================
     DYNAMIC: fetch live GPS on mount. If it fails or times out,
     fall back to FALLBACK_LOCATION so the map still loads.
     =========================================== */
  useEffect(() => {
    if (locationRequestedRef.current) return;
    locationRequestedRef.current = true;

    setLoading(true);

    // Safety net: if GPS doesn't respond in time, use fallback so the
    // app doesn't get stuck on the loading screen.
    const fallbackTimer = setTimeout(() => {
      setLocation((prev) => {
        if (prev) return prev; // GPS already succeeded, ignore fallback
        setUsingFallbackLocation(true);
        setLoading(false);
        setError(null);
        return FALLBACK_LOCATION;
      });
    }, 12000);

    fetchAccurateLocation(
      (newLocation) => {
        clearTimeout(fallbackTimer);
        setUsingFallbackLocation(false);
        setLocation(newLocation);
        setLoading(false);
        setError(null);
      },
      (errorMessage) => {
        clearTimeout(fallbackTimer);
        console.warn('Live GPS unavailable, using fallback location:', errorMessage);
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
    }
  }, [location]); // Dependency waisa hi hai — map only init once because mapInstanceRef blocks re-creation

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
        setLocation(newLocation);
        setLoading(false);
        setError(null);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLocation.lat, newLocation.lng], 19);
        }
      },
      (errorMessage) => {
        setError(errorMessage);
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
                  <p className="location-label" style={{ color: '#b45309', marginBottom: '8px' }}>
                    ⚠ Live GPS unavailable — showing fallback location. Tap Refresh to retry.
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
                  <p className="coord-title">Current Coordinates</p>
                  <div className="coord-values">
                    <div>
                      <p className="location-label">Latitude</p>
                      <p className="location-value">{location.lat.toFixed(6)}°</p>
                    </div>
                    <div>
                      <p className="location-label">Longitude</p>
                      <p className="location-value">{location.lng.toFixed(6)}°</p>
                    </div>
                  </div>
                  <div className="meta-row">
                    <span>Altitude: {location.altitude ? `${location.altitude.toFixed(1)}m` : 'N/A'}</span>
                    <span>Timestamp:{currentTime.toLocaleTimeString('en-GB')}</span>
                  </div>
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
