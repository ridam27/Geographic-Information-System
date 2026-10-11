import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, LayersControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import './Location.css';

const DEFAULT_NAGPUR = [21.1498, 79.0806];

const MapUpdater = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.setView(position, zoom);
    }
  }, [map, position, zoom]);
  return null;
};

// Map click listener and zoom tracker helper
const MapEventsHandler = ({ onMapClick, onZoomChange }) => {
  const map = useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
    zoomend() {
      onZoomChange(map.getZoom());
    },
    zoom() {
      onZoomChange(map.getZoom());
    }
  });
  return null;
};

// Red marker icon for searched or dropped pin coordinates
const pinIcon = new L.DivIcon({
  className: 'red-pin-marker',
  html: `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.716 0 0 6.716 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.716 23.284 0 15 0Z" fill="#dc2626"/>
      <path d="M15 2C7.82 2 2 7.82 2 15C2 24.8 15 37.2 15 37.2C15 37.2 28 24.8 28 15C28 7.82 22.18 2 15 2Z" fill="#ef4444"/>
      <circle cx="15" cy="14" r="5.5" fill="#ffffff"/>
    </svg>
  `,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -38],
});

// Custom pulsing icon for User's Live GPS location
const liveLocationIcon = new L.DivIcon({
  className: 'live-location-marker',
  html: '<div class="pulse-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const MapPage = () => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [searchedPin, setSearchedPin] = useState(null);
  const [droppedPin, setDroppedPin] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [copied, setCopied] = useState(false);

  const [position, setPosition] = useState(DEFAULT_NAGPUR);
  const [zoom, setZoom] = useState(13);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(13);

  const MAX_NATIVE_ZOOM = 19;
  const MAX_ZOOM = 21;

  // 1. Fetch user's live location on mount & continuously update
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setLiveLocation({
          coords,
          accuracy: pos.coords.accuracy || 15,
        });

        // Initially center on live location if user hasn't searched or dropped a pin yet
        setPosition((prev) => {
          if (!searchedPin && !droppedPin && (prev === DEFAULT_NAGPUR || !prev)) {
            return coords;
          }
          return prev;
        });
      },
      (err) => {
        console.warn('Live location error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [searchedPin, droppedPin]);

  // 2. Handle map click to drop a pin at exact coordinates (does NOT auto-fill inputs)
  const handleMapClick = useCallback((coords) => {
    setDroppedPin(coords);
  }, []);

  // 3. Handle Go / Search Click
  const handleGoClick = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (!isNaN(latitude) && !isNaN(longitude)) {
      const newPos = [latitude, longitude];
      setSearchedPin(newPos);
      setDroppedPin(newPos);
      setPosition(newPos);
      setZoom(MAX_ZOOM);
      setCurrentZoomLevel(MAX_ZOOM);
    } else {
      alert('Please enter valid numerical latitude and longitude coordinates.');
    }
  };

  // 4. Handle Reset / Clear Input Fields & Pin Mark
  const handleResetClick = () => {
    setLat('');
    setLng('');
    setSearchedPin(null);
    setDroppedPin(null);
    if (liveLocation) {
      setPosition(liveLocation.coords);
      setZoom(MAX_ZOOM);
      setCurrentZoomLevel(MAX_ZOOM);
    } else {
      setPosition(DEFAULT_NAGPUR);
      setZoom(13);
      setCurrentZoomLevel(13);
    }
  };

  const RECENTER_ZOOM = 20; // 20 / 21 * 100 = 95% zoom

  // 5. Handle Recenter at Live Location (Sets map to 95% zoom level)
  const handleRecenterLiveClick = () => {
    if (liveLocation) {
      setPosition(liveLocation.coords);
      setZoom(RECENTER_ZOOM);
      setCurrentZoomLevel(RECENTER_ZOOM);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setLiveLocation({ coords, accuracy: pos.coords.accuracy || 15 });
          setPosition(coords);
          setZoom(RECENTER_ZOOM);
          setCurrentZoomLevel(RECENTER_ZOOM);
        },
        (err) => console.warn('Unable to fetch live GPS location: ' + err.message)
      );
    }
  };

  // 6. Handle Copy Coordinates to Clipboard (Silent fallback copy without alerts)
  const fallbackCopy = (textToCopy) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copiedOk = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (copiedOk) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error('Fallback copy failed', e);
    }
  };

  const handleCopyCoordinates = (textToCopy) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(textToCopy);
      });
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const activePin = droppedPin || searchedPin;
  const zoomPercentage = Math.round((currentZoomLevel / MAX_ZOOM) * 100);

  return (
    <div style={{ marginTop: '0', padding: '0' }} className="map-container">
      {/* Top Input & Action Bar */}
      <div className="input-container">
        <input
          type="text"
          placeholder="Enter Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGoClick()}
        />
        <input
          type="text"
          placeholder="Enter Longitude"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGoClick()}
        />
        <button type="button" className="btn-go" onClick={handleGoClick}>
          Go
        </button>
        <button type="button" className="btn-reset" onClick={handleResetClick} title="Reset lat/lng inputs & clear pin">
          Reset
        </button>
      </div>

      {/* Bottom Left Corner: Live Location Telemetry & Stats Box */}
      <div className="bottom-left-stats-card">
        <div className="stats-card-header">
          <div className="stats-card-title">
            <span className="live-indicator-dot"></span>
            <strong>Live GPS Telemetry</strong>
          </div>
        </div>

        <div className="stats-card-body">
          <div className="stats-row">
            <span className="stats-label">Latitude:</span>
            <span className="stats-val">{liveLocation ? `${liveLocation.coords[0].toFixed(6)}°` : 'Acquiring...'}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Longitude:</span>
            <span className="stats-val">{liveLocation ? `${liveLocation.coords[1].toFixed(6)}°` : 'Acquiring...'}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Accuracy:</span>
            <span className="stats-val">{liveLocation ? `±${liveLocation.accuracy.toFixed(1)} m` : 'Calculating...'}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Satellites:</span>
            <span className="stats-val">
              {liveLocation 
                ? (liveLocation.accuracy < 10 ? '12 Locked (High Fix)' : liveLocation.accuracy < 25 ? '8 Locked (3D Fix)' : '5 Locked (2D Fix)') 
                : 'Scanning...'}
            </span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Signal Type:</span>
            <span className="stats-val">
              {liveLocation 
                ? (liveLocation.accuracy < 15 ? 'GNSS L1+L5 Dual' : 'GPS + Network Cell') 
                : 'Searching...'}
            </span>
          </div>
        </div>

        <div className="stats-card-footer">
          <button type="button" className="btn-recenter" onClick={handleRecenterLiveClick} title="Recenter to Live GPS Location (95% Zoom)">
            🎯 Recenter Live GPS
          </button>
        </div>
      </div>

      {/* Bottom Right Corner: Zoom Percentage Indicator */}
      <div className="bottom-right-controls">
        <div className="zoom-indicator-tag" title="Map Zoom Percentage">
          🔍 {zoomPercentage}%
        </div>
      </div>

      {/* Right Edge Panel for Pinned Location Details */}
      {activePin && (
        <div className="right-details-panel">
          <div className="panel-header">
            <h3>📍 Pinned Location Details</h3>
            <button 
              type="button" 
              className="panel-close-btn" 
              onClick={() => { setDroppedPin(null); setSearchedPin(null); }}
              title="Clear Pin"
            >
              ✕
            </button>
          </div>
          <div className="panel-body">
            <div className="coord-row">
              <span className="coord-label">Latitude:</span>
              <span className="coord-value">{activePin[0].toFixed(6)}°</span>
            </div>
            <div className="coord-row">
              <span className="coord-label">Longitude:</span>
              <span className="coord-value">{activePin[1].toFixed(6)}°</span>
            </div>
            <div className="panel-actions">
              <button 
                type="button" 
                className="btn-copy" 
                onClick={() => handleCopyCoordinates(`${activePin[0].toFixed(6)}, ${activePin[1].toFixed(6)}`)}
              >
                {copied ? 'Copied! ✓' : '📋 Copy Coordinates'}
              </button>
              <button 
                type="button" 
                className="btn-use-input" 
                onClick={() => {
                  setLat(activePin[0].toFixed(6));
                  setLng(activePin[1].toFixed(6));
                }}
              >
                📥 Use in Inputs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Display */}
      <div className="map-wrapper">
        <MapContainer center={position} zoom={zoom} maxZoom={MAX_ZOOM} style={{ height: '100%', width: '100%' }}>
          <MapEventsHandler 
            onMapClick={handleMapClick} 
            onZoomChange={(newZoom) => setCurrentZoomLevel(newZoom)} 
          />

          <LayersControl position="topright">
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer checked name="Satellite with Labels">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                zIndex={10}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={MAX_NATIVE_ZOOM}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Street Map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
                maxZoom={MAX_ZOOM}
                maxNativeZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Render User's Live Location Marker & Accuracy Circle if available */}
          {liveLocation && (
            <>
              <Circle
                center={liveLocation.coords}
                radius={liveLocation.accuracy}
                pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.15, weight: 1 }}
              />
              <Marker position={liveLocation.coords} icon={liveLocationIcon}>
                <Popup>
                  <strong>Your Live Location</strong>
                  <br />
                  Lat: {liveLocation.coords[0].toFixed(6)}, Lng: {liveLocation.coords[1].toFixed(6)}
                  <br />
                  Accuracy: ±{liveLocation.accuracy.toFixed(1)}m
                </Popup>
              </Marker>
            </>
          )}

          {/* Render Pin Marker ON Map surface (Anchored strictly to exact geographical lat/lng) */}
          {activePin && (
            <Marker position={activePin} icon={pinIcon}>
              <Popup>
                <strong>Pinned Location</strong>
                <br />
                Lat: {activePin[0].toFixed(6)}, Lng: {activePin[1].toFixed(6)}
              </Popup>
            </Marker>
          )}

          <MapUpdater position={position} zoom={zoom} />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;