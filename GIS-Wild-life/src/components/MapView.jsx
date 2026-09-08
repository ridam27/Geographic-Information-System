import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DoorOpen, Compass, Flame, Footprints, Eye, Waves, TreePine,
  Ticket, Car, Coffee, HeartPulse, Info, MapPin, Navigation, Sparkles, Bus
} from 'lucide-react';
import { TigerIcon, LeopardIcon, BearIcon, DeerIcon } from './AnimalIcons';

import { ZOO_CENTER, zooLocations, GOREWADA_MAIN_HUB } from '../data/zooLocations';
import { geotaggedMedia } from '../data/geotaggedMedia';
import { findClosestProgressOnTrack } from '../utils/gpsTrackUtils';
import MapControls from './MapControls';
import MapDetailsModal from './MapDetailsModal';
import PinLocation from './PinLocation';
import GeoMarker from './GeoMarker';

// Fix for default leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Tile Layer Configuration for different map types
const getTileLayerUrl = (mapType, showStreetLabels) => {
  switch (mapType) {
    case 'satellite':
      return 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    case 'streets':
      return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    case 'terrain':
      return 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
    case 'hybrid':
    default:
      return showStreetLabels
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
  }
};

// Helper to render accurate single-color vector icons (Tiger, Leopard, Bear, Deer, Facilities)
const renderLocationIcon = (name, size = 15) => {
  switch (name) {
    case 'Tiger': return <TigerIcon size={size} />;
    case 'Leopard': return <LeopardIcon size={size} />;
    case 'Bear': return <BearIcon size={size} />;
    case 'Deer': return <DeerIcon size={size} />;
    case 'DoorOpen': return <DoorOpen size={size} />;
    case 'Compass': return <Compass size={size} />;
    case 'Bus': return <Bus size={size} />;
    case 'TreePine': return <TreePine size={size} />;
    case 'Ticket': return <Ticket size={size} />;
    case 'Car': return <Car size={size} />;
    case 'Coffee': return <Coffee size={size} />;
    case 'HeartPulse': return <HeartPulse size={size} />;
    case 'Info': return <Info size={size} />;
    default: return <MapPin size={size} />;
  }
};

// Component to handle smooth cinematic flying to selected location or media
const PanToSelectedLocation = ({ selectedMedia, selectedLocation, userPin }) => {
  const map = useMap();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Preserve restored map position on page reload/refresh
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (selectedMedia) {
      map.closePopup();
      map.flyTo(
        [selectedMedia.latitude, selectedMedia.longitude],
        17.5,
        { duration: 1.4, easeLinearity: 0.25 }
      );
    } else if (selectedLocation) {
      map.flyTo(
        [selectedLocation.latitude, selectedLocation.longitude],
        17,
        { duration: 1.5, easeLinearity: 0.25 }
      );
    } else if (userPin) {
      map.flyTo(
        [userPin.lat, userPin.lng],
        16.5,
        { duration: 1.2, easeLinearity: 0.25 }
      );
    }
  }, [selectedMedia, selectedLocation, userPin, map]);
  return null;
};

// Component to handle recentering zoo with smooth cinematic fly
const RecenterHandler = ({ triggerRecenter }) => {
  const map = useMap();
  useEffect(() => {
    if (triggerRecenter) {
      map.flyTo(ZOO_CENTER, 15, { duration: 2.0, easeLinearity: 0.25 });
    }
  }, [triggerRecenter, map]);
  return null;
};

// Component to capture direct map clicks for Directory Pinning & GPS route seeking
const MapClickHandler = ({ isPinningMode, setUserPin, setPinningMode, setSelectedLocation, selectedMedia, onSeekToRoutePoint, liveVideoTracking }) => {
  useMapEvents({
    click(e) {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      setSelectedLocation(null);
      setUserPin({ lat: clickLat, lng: clickLng });
      if (isPinningMode) {
        setPinningMode(false);
      }

      // If a video is currently open, seeking dynamically to the pinned/clicked location along the route
      if (selectedMedia?.type === 'video' && onSeekToRoutePoint) {
        const activeTrack = (liveVideoTracking?.track && Array.isArray(liveVideoTracking.track) && liveVideoTracking.track.length > 0)
          ? liveVideoTracking.track
          : (selectedMedia?.track && Array.isArray(selectedMedia.track) && selectedMedia.track.length > 0)
            ? selectedMedia.track
            : [
                [selectedMedia.latitude || 21.1946, selectedMedia.longitude || 79.0103],
                [(selectedMedia.latitude || 21.1946) + 0.0003, (selectedMedia.longitude || 79.0103) + 0.0003],
                [(selectedMedia.latitude || 21.1946) + 0.0006, (selectedMedia.longitude || 79.0103) + 0.0002],
                [(selectedMedia.latitude || 21.1946) + 0.0008, (selectedMedia.longitude || 79.0103) + 0.0005]
              ];

        const { progressRatio, closestPoint, distanceMeters } = findClosestProgressOnTrack(activeTrack, clickLat, clickLng);
        // If clicked on or near the route (within 400m tolerance or when in pinning mode)
        if (distanceMeters < 400 || isPinningMode) {
          onSeekToRoutePoint(progressRatio, closestPoint);
        }
      }
    }
  });
  return null;
};

// Directory Pin Icon
const userPinIcon = L.divIcon({
  html: `<div class="user-pin-marker pulse" title="Directory Pin">📍</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Tracks real-time map center and zoom level from Leaflet instance
const MapStateTracker = ({ onMapChange }) => {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMapChange([center.lat, center.lng], map.getZoom());
    },
    zoomend: () => {
      const center = map.getCenter();
      onMapChange([center.lat, center.lng], map.getZoom());
    }
  });
  return null;
};

// Main Hub Marker for Zoom Level <= 10 (Single clean Gorewada Zoo view)
const createGorewadaMainHubIcon = () => {
  const iconMarkup = renderToStaticMarkup(
    <div className="gorewada-hub-marker">
      <div className="hub-radar-ping"></div>
      <div className="hub-beacon-pin">
        <span className="hub-icon-svg">
          <Compass size={22} />
        </span>
      </div>
      <div className="hub-beacon-label">
        <span className="hub-title">{GOREWADA_MAIN_HUB.name}</span>
        <span className="hub-subtitle">Click to Zoom In</span>
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-hub-beacon-container',
    iconSize: [160, 60],
    iconAnchor: [80, 30],
    popupAnchor: [0, -32]
  });
};

// Create high-precision, single-color monochrome GIS beacon icons
const createZooLocationIcon = (location, isSelected) => {
  const isEntrance = location.category === 'entrance';

  const iconMarkup = renderToStaticMarkup(
    <div className={`gis-zone-marker ${isSelected ? 'active' : ''} ${isEntrance ? 'entrance-marker' : ''} cat-${location.category || 'general'}`}>
      <div className="gis-beacon-pin">
        <span className="gis-icon-svg">
          {renderLocationIcon(location.iconName, isEntrance ? 18 : 15)}
        </span>
        {isEntrance && <div className="entrance-radar-ping" />}
      </div>
      <div className="gis-beacon-label">
        <span className="gis-label-icon">{renderLocationIcon(location.iconName, 12)}</span>
        <span className="gis-label-text">{location.shortName || location.name}</span>
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-gis-beacon-container',
    iconSize: [130, 56],
    iconAnchor: [65, 28],
    popupAnchor: [0, -30]
  });
};

// Live moving vehicle GPS beacon icon during video playback
const createLiveVehicleIcon = (lat, lng) => {
  const iconMarkup = renderToStaticMarkup(
    <div className="live-vehicle-marker-wrapper">
      <div className="vehicle-radar-ping"></div>
      <div className="vehicle-beacon-badge">
        <span className="vehicle-icon-inner">🎥</span>
      </div>
      <div className="vehicle-coords-tag">
        <span>{lat != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Live GPS'}</span>
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-live-vehicle-container',
    iconSize: [120, 60],
    iconAnchor: [60, 30],
    popupAnchor: [0, -30]
  });
};

// Dedicated Subcomponent for Dynamic Video GPS Tracking Route Progress
// Isolates frequent coordinate updates to prevent re-rendering the whole map tree
const LiveVideoRouteLayer = React.memo(({ liveVideoTracking, selectedMedia, onSeekToRoutePoint }) => {
  if (selectedMedia?.type !== 'video') return null;

  const activeTrack = (liveVideoTracking?.track && Array.isArray(liveVideoTracking.track) && liveVideoTracking.track.length > 0)
    ? liveVideoTracking.track
    : (selectedMedia?.track && Array.isArray(selectedMedia.track) && selectedMedia.track.length > 0)
      ? selectedMedia.track
      : [
          [selectedMedia.latitude || 21.1946, selectedMedia.longitude || 79.0103],
          [(selectedMedia.latitude || 21.1946) + 0.0003, (selectedMedia.longitude || 79.0103) + 0.0003],
          [(selectedMedia.latitude || 21.1946) + 0.0006, (selectedMedia.longitude || 79.0103) + 0.0002],
          [(selectedMedia.latitude || 21.1946) + 0.0008, (selectedMedia.longitude || 79.0103) + 0.0005]
        ];

  const currentPoint = (liveVideoTracking?.currentPoint && Array.isArray(liveVideoTracking.currentPoint) && Number.isFinite(liveVideoTracking.currentPoint[0]))
    ? liveVideoTracking.currentPoint
    : activeTrack[0];

  const watchedPath = (liveVideoTracking?.watchedPath && Array.isArray(liveVideoTracking.watchedPath))
    ? liveVideoTracking.watchedPath
    : [activeTrack[0]];

  const remainingPath = (liveVideoTracking?.remainingPath && Array.isArray(liveVideoTracking.remainingPath))
    ? liveVideoTracking.remainingPath
    : activeTrack;

  const startPt = activeTrack[0];
  const endPt = activeTrack[activeTrack.length - 1];

  const handleRouteClick = (e) => {
    if (e && e.latlng && onSeekToRoutePoint) {
      L.DomEvent.stopPropagation(e);
      const { progressRatio, closestPoint } = findClosestProgressOnTrack(activeTrack, e.latlng.lat, e.latlng.lng);
      onSeekToRoutePoint(progressRatio, closestPoint);
    }
  };

  return (
    <>
      {/* Invisible wider clickable hitbox for effortless clicking anywhere on route */}
      <Polyline
        positions={activeTrack}
        pathOptions={{
          color: 'transparent',
          weight: 24,
          opacity: 0,
          lineCap: 'round',
          lineJoin: 'round'
        }}
        eventHandlers={{
          click: handleRouteClick
        }}
      />

      {/* 1. Remaining GPS Track (🔴 RED): Portion of video route not yet watched */}
      {remainingPath && remainingPath.length > 1 && (
        <Polyline
          positions={remainingPath}
          pathOptions={{
            color: '#ef4444',
            weight: 5.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }}
          eventHandlers={{
            click: handleRouteClick
          }}
        >
          <Tooltip direction="top" sticky opacity={0.9}>
            <span style={{ fontSize: '11px', fontWeight: '600' }}>
              📍 Click / Pin here to start video from this GPS position
            </span>
          </Tooltip>
        </Polyline>
      )}

      {/* 2. Watched GPS Track (🟢 GREEN): Portion of video route already watched */}
      {watchedPath && watchedPath.length > 1 && (
        <Polyline
          positions={watchedPath}
          pathOptions={{
            color: '#10b981',
            weight: 6,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }}
          eventHandlers={{
            click: handleRouteClick
          }}
        >
          <Tooltip direction="top" sticky opacity={0.9}>
            <span style={{ fontSize: '11px', fontWeight: '600' }}>
              📍 Click / Pin here to jump video to this GPS position
            </span>
          </Tooltip>
        </Polyline>
      )}

      {/* Start Point Marker (🟢 Green) */}
      {startPt && Number.isFinite(startPt[0]) && Number.isFinite(startPt[1]) && (
        <CircleMarker
          center={startPt}
          radius={7}
          pathOptions={{
            color: '#ffffff',
            fillColor: '#10b981',
            fillOpacity: 1,
            weight: 2.5
          }}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (onSeekToRoutePoint) onSeekToRoutePoint(0, startPt);
            }
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>
              🎬 START (Click to restart video)
            </span>
          </Tooltip>
        </CircleMarker>
      )}

      {/* End Point Marker (🔴 Red) */}
      {endPt && Number.isFinite(endPt[0]) && Number.isFinite(endPt[1]) && activeTrack.length > 1 && (
        <CircleMarker
          center={endPt}
          radius={7}
          pathOptions={{
            color: '#ffffff',
            fillColor: '#ef4444',
            fillOpacity: 1,
            weight: 2.5
          }}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (onSeekToRoutePoint) onSeekToRoutePoint(0.999, endPt);
            }
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>
              🏁 END ({endPt[0].toFixed(5)}, {endPt[1].toFixed(5)})
            </span>
          </Tooltip>
        </CircleMarker>
      )}

      {/* 3. Live Moving Vehicle GPS Position Marker with glowing beacon & coordinates */}
      {currentPoint && Number.isFinite(currentPoint[0]) && Number.isFinite(currentPoint[1]) && (
        <Marker
          position={currentPoint}
          icon={createLiveVehicleIcon(currentPoint[0], currentPoint[1])}
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -25]}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>
              <span style={{ color: '#10b981' }}>▶ Current Video GPS</span><br />
              <span>{currentPoint[0].toFixed(6)}, {currentPoint[1].toFixed(6)}</span>
            </div>
          </Tooltip>
        </Marker>
      )}
    </>
  );
});

LiveVideoRouteLayer.displayName = 'LiveVideoRouteLayer';

// Spatial Viewport Lazy-Loading Component for Zoom 16+ Media Markers
// Culls off-screen markers to eliminate rendering overhead & memory spikes
const LazyViewportMediaMarkers = React.memo(({ showMediaMarkers, currentZoom, selectedMedia, setSelectedMedia, setUserPin }) => {
  const map = useMap();
  const [mapBounds, setMapBounds] = useState(() => {
    try {
      return map.getBounds().pad(0.3);
    } catch (e) {
      return null;
    }
  });

  useMapEvents({
    moveend: () => {
      try {
        setMapBounds(map.getBounds().pad(0.3));
      } catch (e) {}
    },
    zoomend: () => {
      try {
        setMapBounds(map.getBounds().pad(0.3));
      } catch (e) {}
    }
  });

  const visibleMarkers = React.useMemo(() => {
    if (!showMediaMarkers || currentZoom < 16) return [];
    if (!mapBounds) return geotaggedMedia;
    return geotaggedMedia.filter(media => {
      return mapBounds.contains([media.latitude, media.longitude]);
    });
  }, [showMediaMarkers, currentZoom, mapBounds]);

  if (!showMediaMarkers || currentZoom < 16 || visibleMarkers.length === 0) return null;

  return (
    <MarkerClusterGroup maxClusterRadius={30} disableClusteringAtZoom={19}>
      {visibleMarkers.map(media => (
        <GeoMarker
          key={`scatter-media-${media.id}`}
          media={media}
          isSelected={selectedMedia?.id === media.id}
          onClick={(item) => {
            setSelectedMedia(item);
            setUserPin({ lat: item.latitude, lng: item.longitude });
          }}
        />
      ))}
    </MarkerClusterGroup>
  );
});

LazyViewportMediaMarkers.displayName = 'LazyViewportMediaMarkers';

const MapView = ({
  isPinningMode, setPinningMode,
  userPin, setUserPin,
  selectedLocation, setSelectedLocation,
  matchingMedia, selectedMedia, setSelectedMedia,
  toggleFullscreen,
  mapCenter, setMapCenter,
  mapZoom, setMapZoom,
  mapType, setMapType,
  showTraffic, setShowTraffic,
  showStreetLabels, setShowStreetLabels,
  showZooLabels, setShowZooLabels,
  showMediaMarkers, setShowMediaMarkers,
  liveVideoTracking,
  onSeekToRoutePoint
}) => {
  // Normalize map center and zoom level safely
  const validCenter = Array.isArray(mapCenter) && Number.isFinite(mapCenter[0]) && Number.isFinite(mapCenter[1])
    ? mapCenter
    : (mapCenter?.lat && mapCenter?.lng ? [mapCenter.lat, mapCenter.lng] : ZOO_CENTER);

  const validZoom = typeof mapZoom === 'number' && Number.isFinite(mapZoom) ? mapZoom : 15;

  // Zoom level state (synced with mapZoom prop)
  const [currentZoom, setCurrentZoom] = useState(validZoom);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    if (mapZoom !== undefined && Number.isFinite(mapZoom)) {
      setCurrentZoom(mapZoom);
    }
  }, [mapZoom]);

  const handleZoneChipClick = (location) => {
    setSelectedLocation(location);
  };

  const handleRecenterZoo = () => {
    setRecenterTrigger(prev => prev + 1);
  };

  const activeTileUrl = getTileLayerUrl(mapType, showStreetLabels);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Top Interactive Zone Quick Bar */}
      <div className="zone-quick-bar glass-panel" role="toolbar" aria-label="Safari Zone Quick Explorer">
        <div className="quick-bar-label">
          <Navigation size={14} style={{ color: '#10b981' }} />
          <span>Gorewada Explorer:</span>
        </div>
        <div className="quick-bar-chips">
          {zooLocations.map(loc => (
            <button
              key={`quick-${loc.id}`}
              className={`zone-chip ${selectedLocation?.id === loc.id ? 'active' : ''} cat-${loc.category}`}
              onClick={() => handleZoneChipClick(loc)}
              aria-label={`Explore zone: ${loc.name}`}
            >
              <span className="chip-icon">{renderLocationIcon(loc.iconName, 13)}</span>
              <span>{loc.shortName}</span>
              {(loc.id === 'leopard-safari' || loc.id === 'bear-deer-safari' || loc.id === 'safari-bus-boarding' || loc.id === 'tiger-safari-central-gate') && (
                <span className="chip-video-indicator">🎥 Video</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Map Details / Layers Switcher Panel */}
      <MapDetailsModal
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
        mapType={mapType}
        setMapType={setMapType}
        showTraffic={showTraffic}
        setShowTraffic={setShowTraffic}
        showStreetLabels={showStreetLabels}
        setShowStreetLabels={setShowStreetLabels}
        showZooLabels={showZooLabels}
        setShowZooLabels={setShowZooLabels}
        showMediaMarkers={showMediaMarkers}
        setShowMediaMarkers={setShowMediaMarkers}
        onRecenterZoo={handleRecenterZoo}
      />

      <MapContainer
        center={validCenter}
        zoom={validZoom}
        minZoom={2}
        maxZoom={20}
        worldCopyJump={true}
        style={{ height: '100%', width: '100%', cursor: isPinningMode ? 'crosshair' : 'pointer' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Base Tile Layer */}
        <TileLayer
          key={`tile-${mapType}-${showStreetLabels}`}
          url={activeTileUrl}
          maxZoom={20}
        />

        {/* Traffic Layer Overlay */}
        {showTraffic && (
          <TileLayer
            key="traffic-layer"
            url="https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}"
            maxZoom={20}
            opacity={0.85}
          />
        )}

        <MapControls
          toggleFullscreen={toggleFullscreen}
          isLayersOpen={isLayersOpen}
          setIsLayersOpen={setIsLayersOpen}
        />

        {/* Real-time Map Center and Zoom Level Tracker for State Persistence */}
        <MapStateTracker
          onMapChange={(center, zoom) => {
            setMapCenter(center);
            setMapZoom(zoom);
            setCurrentZoom(zoom);
          }}
        />

        <RecenterHandler triggerRecenter={recenterTrigger} />

        <div style={{ position: 'absolute', top: 75, left: 20, zIndex: 1000 }}>
          <PinLocation
            isPinningMode={isPinningMode}
            setPinningMode={setPinningMode}
            userPin={userPin}
            clearPin={() => {
              setUserPin(null);
              setSelectedLocation(null);
              setSelectedMedia(null);
            }}
          />
        </div>

        <MapClickHandler
          isPinningMode={isPinningMode}
          setUserPin={setUserPin}
          setPinningMode={setPinningMode}
          setSelectedLocation={setSelectedLocation}
          selectedMedia={selectedMedia}
          onSeekToRoutePoint={onSeekToRoutePoint}
          liveVideoTracking={liveVideoTracking}
        />

        {/* Cinematic Fly-To Handler */}
        <PanToSelectedLocation
          selectedMedia={selectedMedia}
          selectedLocation={selectedLocation}
          userPin={userPin}
        />

        {/* 1. ZOOM LEVEL <= 10: Single Clean Main Gorewada Zoo Hub Marker */}
        {currentZoom <= 10 && (
          <Marker
            position={[GOREWADA_MAIN_HUB.latitude, GOREWADA_MAIN_HUB.longitude]}
            icon={createGorewadaMainHubIcon()}
            eventHandlers={{
              click: () => {
                handleRecenterZoo();
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
              <div style={{ fontWeight: '700', fontSize: '13px' }}>
                {GOREWADA_MAIN_HUB.name} (Click to explore)
              </div>
            </Tooltip>
            <Popup className="glass-popup">
              <div style={{ textAlign: 'center', padding: '4px' }}>
                <strong style={{ fontSize: '14px', color: '#10b981' }}>{GOREWADA_MAIN_HUB.name}</strong><br />
                <p style={{ fontSize: '11px', marginTop: '4px', color: '#e2e8f0' }}>
                  {GOREWADA_MAIN_HUB.description}
                </p>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
                  Click to zoom in to safari sectors
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. ZOOM LEVEL 11+: Progressive Detail for Safari Zones & Facilities */}
        {currentZoom > 10 && (showZooLabels || selectedLocation) && zooLocations
          .filter(loc => {
            if (selectedLocation?.id === loc.id) return true;
            if (currentZoom >= 16) return true;
            return (loc.minZoom || 11) <= currentZoom;
          })
          .map(location => {
            const isSelected = selectedLocation?.id === location.id;
            return (
              <Marker
                key={`zoo-loc-${location.id}`}
                position={[location.latitude, location.longitude]}
                icon={createZooLocationIcon(location, isSelected)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    setSelectedLocation(location);
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                  <div style={{ fontWeight: '600', fontSize: '12px' }}>
                    {location.name}
                  </div>
                </Tooltip>
                <Popup className="glass-popup">
                  <div style={{ padding: '4px' }}>
                    <strong style={{ fontSize: '13px', color: '#10b981' }}>{location.name}</strong><br />
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                    <p style={{ fontSize: '11px', marginTop: '5px', color: '#e2e8f0', lineHeight: 1.4 }}>
                      {location.description}
                    </p>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
                      Click to explore media ({location.radius}m tolerance)
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Render custom directory pin when dropped directly by user */}
        {userPin && !selectedLocation && (
          <Marker position={[userPin.lat, userPin.lng]} icon={userPinIcon}>
            <Popup className="glass-popup">
              <div style={{ textAlign: 'center', padding: '2px 4px' }}>
                <strong style={{ color: '#10b981' }}>📍 Custom Point</strong><br />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {userPin.lat.toFixed(6)}, {userPin.lng.toFixed(6)}
                </span><br />
                <span style={{ fontSize: '12px', fontWeight: '500', color: matchingMedia.length > 0 ? '#38bdf8' : '#f59e0b' }}>
                  {matchingMedia.length > 0
                    ? `${matchingMedia.length} Media Items Nearby`
                    : 'No geo-tagged media at this location'}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. ZOOM LEVEL 16+: Spatial Viewport Lazy-Loaded Markers across the Zoo */}
        <LazyViewportMediaMarkers
          showMediaMarkers={showMediaMarkers}
          currentZoom={currentZoom}
          selectedMedia={selectedMedia}
          setSelectedMedia={setSelectedMedia}
          setUserPin={setUserPin}
        />

        {/* Zoom < 16: Only show matching media when user explicitly selects a zone/pin */}
        {showMediaMarkers && currentZoom < 16 && currentZoom > 10 && matchingMedia.length > 0 && (
          <MarkerClusterGroup maxClusterRadius={35}>
            {matchingMedia.map(media => (
              <GeoMarker
                key={`match-media-${media.id}`}
                media={media}
                isSelected={selectedMedia?.id === media.id}
                onClick={setSelectedMedia}
              />
            ))}
          </MarkerClusterGroup>
        )}

        {/* Draw connection line between pin/location and selected media */}
        {userPin && selectedMedia && (
          <Polyline
            positions={[
              [userPin.lat, userPin.lng],
              [selectedMedia.latitude, selectedMedia.longitude]
            ]}
            color="#10b981"
            dashArray="5, 10"
            weight={3}
          />
        )}

        {/* Dynamic Video GPS Tracking Route Progress */}
        <LiveVideoRouteLayer
          liveVideoTracking={liveVideoTracking}
          selectedMedia={selectedMedia}
          onSeekToRoutePoint={onSeekToRoutePoint}
        />
      </MapContainer>
    </div>
  );
};

export default React.memo(MapView);
