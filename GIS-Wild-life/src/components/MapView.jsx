import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DoorOpen, Compass, Flame, Footprints, Eye, Waves, TreePine,
  Ticket, Car, Coffee, HeartPulse, Info, MapPin, Navigation, Sparkles, Bus, Globe, ArrowLeft,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { TigerIcon, LeopardIcon, BearIcon, DeerIcon } from './AnimalIcons';

import { NAGPUR_REGION_CENTER, NAGPUR_REGION_ZOOM, ZOOS, getAllZooHubs } from '../data/zooRegistry';
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

// Helper to render accurate vector icons
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
    case 'Waves': return <Waves size={size} />;
    case 'Info': return <Info size={size} />;
    default: return <MapPin size={size} />;
  }
};

// Component to handle smooth cinematic flying to selected location or media
const PanToSelectedLocation = ({ selectedMedia, selectedLocation, userPin }) => {
  const map = useMap();
  const isInitialMount = useRef(true);

  useEffect(() => {
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

// Component to handle recentering with smooth cinematic fly
const RecenterHandler = ({ flyTarget }) => {
  const map = useMap();
  useEffect(() => {
    if (flyTarget && Array.isArray(flyTarget.center)) {
      map.flyTo(flyTarget.center, flyTarget.zoom || 16, { duration: flyTarget.duration || 3.2, easeLinearity: 0.2 });
    }
  }, [flyTarget, map]);
  return null;
};

// Main Hub Marker for Zoom Level <= 11 (Unified Starting Map)
const createZooHubIcon = (hub, isMaharajbagh = false) => {
  const themeClass = isMaharajbagh ? 'maharajbagh-hub' : 'gorewada-hub';
  const displayName = isMaharajbagh ? 'Maharajbagh Zoo' : 'Gorewada Zoo';
  const iconMarkup = renderToStaticMarkup(
    <div className={`zoo-hub-marker ${themeClass}`}>
      <div className="hub-radar-ping"></div>
      <div className="hub-beacon-pin">
        <span className="hub-icon-svg">
          <Compass size={20} />
        </span>
      </div>
      <div className="hub-beacon-label">
        <span className="hub-title">{displayName}</span>
        <span className="hub-subtitle">CLICK TO ENTER ZOO ➔</span>
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-hub-beacon-container',
    iconSize: [240, 50],
    iconAnchor: [24, 25],
    popupAnchor: [0, -25]
  });
};

// Dedicated Zoo Hub Marker Component: Clicking smoothly flies directly into the selected zoo
const ZooHubMarker = ({ zooId, isMaharajbagh, onEnterZoo }) => {
  const map = useMap();
  const zoo = ZOOS[zooId];
  const markerRef = useRef(null);

  const handleMarkerClick = useCallback((e) => {
    if (e) {
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      if (e.stopPropagation) e.stopPropagation();
    }
    if (onEnterZoo) {
      onEnterZoo(zooId, map);
    }
  }, [map, zooId, onEnterZoo]);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      const el = marker.getElement();
      if (el) {
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.disableScrollPropagation(el);

        const onTrigger = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          handleMarkerClick(e);
        };

        el.addEventListener('click', onTrigger);
        el.addEventListener('pointerdown', onTrigger);
        el.addEventListener('touchend', onTrigger);

        return () => {
          el.removeEventListener('click', onTrigger);
          el.removeEventListener('pointerdown', onTrigger);
          el.removeEventListener('touchend', onTrigger);
        };
      }
    }
  }, [handleMarkerClick]);

  return (
    <Marker
      ref={markerRef}
      position={zoo.center}
      icon={createZooHubIcon(zoo.hub, isMaharajbagh)}
      eventHandlers={{
        click: (e) => {
          handleMarkerClick(e);
        }
      }}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: isMaharajbagh ? '#38bdf8' : '#10b981' }}>
          📍 {zoo.name}
        </div>
      </Tooltip>
    </Marker>
  );
};

// Component to capture direct map clicks for Directory Pinning & GPS route seeking
const MapClickHandler = ({ isPinningMode, setUserPin, setPinningMode, setSelectedLocation, selectedMedia, onSeekToRoutePoint, liveVideoTracking, activeZooId }) => {
  useMapEvents({
    click(e) {
      // ONLY pin a location if Pin Location mode was explicitly activated by the user!
      if (!isPinningMode) {
        return;
      }

      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      setSelectedLocation(null);
      setUserPin({ lat: clickLat, lng: clickLng });
      setPinningMode(false);

      if (selectedMedia?.type === 'video' && onSeekToRoutePoint) {
        const activeTrack = (liveVideoTracking?.track && Array.isArray(liveVideoTracking.track) && liveVideoTracking.track.length > 0)
          ? liveVideoTracking.track
          : (selectedMedia?.track && Array.isArray(selectedMedia.track) && selectedMedia.track.length > 0)
            ? selectedMedia.track
            : [
                [selectedMedia.latitude, selectedMedia.longitude],
                [selectedMedia.latitude + 0.0003, selectedMedia.longitude + 0.0003],
                [selectedMedia.latitude + 0.0006, selectedMedia.longitude + 0.0002],
                [selectedMedia.latitude + 0.0008, selectedMedia.longitude + 0.0005]
              ];

        const { progressRatio, closestPoint, distanceMeters } = findClosestProgressOnTrack(activeTrack, clickLat, clickLng);
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

// Tracks real-time map center and zoom level
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

// Create high-precision GIS beacon icons for individual zoo enclosures & facilities
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

// Subcomponent for Dynamic Video GPS Tracking Route Progress
const LiveVideoRouteLayer = React.memo(({ liveVideoTracking, selectedMedia, onSeekToRoutePoint }) => {
  if (selectedMedia?.type !== 'video') return null;

  const activeTrack = (liveVideoTracking?.track && Array.isArray(liveVideoTracking.track) && liveVideoTracking.track.length > 0)
    ? liveVideoTracking.track
    : (selectedMedia?.track && Array.isArray(selectedMedia.track) && selectedMedia.track.length > 0)
      ? selectedMedia.track
      : [
          [selectedMedia.latitude, selectedMedia.longitude],
          [selectedMedia.latitude + 0.0003, selectedMedia.longitude + 0.0003],
          [selectedMedia.latitude + 0.0006, selectedMedia.longitude + 0.0002],
          [selectedMedia.latitude + 0.0008, selectedMedia.longitude + 0.0005]
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
              📍 Click / Pin here to jump video to this GPS position
            </span>
          </Tooltip>
        </Polyline>
      )}

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
const LazyViewportMediaMarkers = React.memo(({ showMediaMarkers, currentZoom, activeMedia, selectedMedia, setSelectedMedia, setUserPin }) => {
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
    if (!showMediaMarkers || currentZoom < 16 || !activeMedia || activeMedia.length === 0) return [];
    if (!mapBounds) return activeMedia;
    return activeMedia.filter(media => {
      return mapBounds.contains([media.latitude, media.longitude]);
    });
  }, [showMediaMarkers, currentZoom, activeMedia, mapBounds]);

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
  onSeekToRoutePoint,
  activeZooId,
  activeZoo,
  activeLocations = [],
  activeMedia = [],
  onEnterZoo,
  onBackToCombinedMap,
  onMapStateChange
}) => {
  const validCenter = Array.isArray(mapCenter) && Number.isFinite(mapCenter[0]) && Number.isFinite(mapCenter[1])
    ? mapCenter
    : (mapCenter?.lat && mapCenter?.lng ? [mapCenter.lat, mapCenter.lng] : NAGPUR_REGION_CENTER);

  const validZoom = typeof mapZoom === 'number' && Number.isFinite(mapZoom) ? mapZoom : NAGPUR_REGION_ZOOM;

  const [currentZoom, setCurrentZoom] = useState(validZoom);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  useEffect(() => {
    if (mapZoom !== undefined && Number.isFinite(mapZoom)) {
      setCurrentZoom(mapZoom);
    }
  }, [mapZoom]);

  const handleZoneChipClick = (location) => {
    setSelectedLocation(location);
  };

  const handleEnterZooDirect = useCallback((zooId, mapInstance) => {
    const targetZoo = ZOOS[zooId];
    if (!targetZoo) return;

    if (onEnterZoo) {
      onEnterZoo(zooId);
    }

    if (mapInstance) {
      mapInstance.flyTo(targetZoo.center, 16, {
        duration: 2.0,
        easeLinearity: 0.25
      });
    } else {
      setFlyTarget({
        center: targetZoo.center,
        zoom: 16,
        duration: 2.0,
        timestamp: Date.now()
      });
    }
  }, [onEnterZoo]);

  const handleBackToCombinedMapDirect = useCallback(() => {
    if (onBackToCombinedMap) {
      onBackToCombinedMap();
    }

    setFlyTarget({
      center: NAGPUR_REGION_CENTER,
      zoom: NAGPUR_REGION_ZOOM,
      duration: 1.8,
      timestamp: Date.now()
    });
  }, [onBackToCombinedMap]);

  const quickBarScrollRef = useRef(null);

  const handleQuickBarScrollLeft = useCallback((e) => {
    if (e) e.stopPropagation();
    if (quickBarScrollRef.current) {
      quickBarScrollRef.current.scrollBy({ left: -180, behavior: 'smooth' });
    }
  }, []);

  const handleQuickBarScrollRight = useCallback((e) => {
    if (e) e.stopPropagation();
    if (quickBarScrollRef.current) {
      quickBarScrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
    }
  }, []);

  const activeTileUrl = getTileLayerUrl(mapType, showStreetLabels);
  const isDetailedZooMode = activeZooId !== null && activeZoo !== null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>


      {/* Floating Interactive Zoo Selector on Combined Overview Map */}
      {activeZooId === null && (
        <div 
          className="overview-zoo-selector glass-panel animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button 
            type="button"
            className="overview-zoo-card gorewada-card"
            onClick={(e) => {
              e.stopPropagation();
              handleEnterZooDirect('gorewada');
            }}
            title="Explore Gorewada Zoo"
          >
            <div className="card-beacon-dot gorewada-dot" />
            <div className="card-info">
              <span className="card-title">Gorewada Zoo</span>
              <span className="card-subtitle">CLICK TO ENTER ➔</span>
            </div>
          </button>
          <div className="overview-card-divider" />
          <button 
            type="button"
            className="overview-zoo-card maharajbagh-card"
            onClick={(e) => {
              e.stopPropagation();
              handleEnterZooDirect('maharajbagh');
            }}
            title="Explore Maharajbagh Zoo"
          >
            <div className="card-beacon-dot maharajbagh-dot" />
            <div className="card-info">
              <span className="card-title">Maharajbagh Zoo</span>
              <span className="card-subtitle">CLICK TO ENTER ➔</span>
            </div>
          </button>
        </div>
      )}

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
        onRecenterZoo={handleEnterZooDirect}
        onFlyToIndia={handleBackToCombinedMapDirect}
        activeZooId={activeZooId}
      />

      <MapContainer
        center={validCenter}
        zoom={validZoom}
        minZoom={3}
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
          activeZooId={activeZooId}
          onFlyToIndia={handleBackToCombinedMapDirect}
          onRecenterActiveZoo={() => {
            if (activeZooId) {
              handleEnterZooDirect(activeZooId);
            } else {
              handleBackToCombinedMapDirect();
            }
          }}
        />

        {/* Real-time Map Center and Zoom Level Tracker */}
        <MapStateTracker
          onMapChange={(center, zoom) => {
            setCurrentZoom(zoom);
            if (onMapStateChange) {
              onMapStateChange(center, zoom);
            }
          }}
        />

        <RecenterHandler flyTarget={flyTarget} />

        {isDetailedZooMode && (
          <div 
            style={{ position: 'absolute', top: 75, left: 20, zIndex: 1000 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
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
        )}

        <MapClickHandler
          isPinningMode={isPinningMode}
          setUserPin={setUserPin}
          setPinningMode={setPinningMode}
          setSelectedLocation={setSelectedLocation}
          selectedMedia={selectedMedia}
          onSeekToRoutePoint={onSeekToRoutePoint}
          liveVideoTracking={liveVideoTracking}
          activeZooId={activeZooId}
        />

        {/* Cinematic Fly-To Handler for Selected Location / Media */}
        <PanToSelectedLocation
          selectedMedia={selectedMedia}
          selectedLocation={selectedLocation}
          userPin={userPin}
        />

        {/* 1. COMBINED OVERVIEW MAP (activeZooId === null): Show both Gorewada and Maharajbagh clickable cards */}
        {activeZooId === null && (
          <>
            <ZooHubMarker
              zooId="gorewada"
              isMaharajbagh={false}
              onEnterZoo={handleEnterZooDirect}
            />
            <ZooHubMarker
              zooId="maharajbagh"
              isMaharajbagh={true}
              onEnterZoo={handleEnterZooDirect}
            />
          </>
        )}

        {/* 2. DETAILED ZOO MODE (activeZooId !== null): Progressive Enclosures & Facilities strictly for active zoo */}
        {isDetailedZooMode && (showZooLabels || selectedLocation) && activeLocations
          .filter(loc => {
            if (selectedLocation?.id === loc.id) return true;
            if (currentZoom >= 15) return true;
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
                    <strong style={{ fontSize: '13px', color: activeZoo?.themeColor || '#10b981' }}>{location.name}</strong><br />
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

        {/* Render custom directory pin when dropped directly by user inside detailed zoo */}
        {isDetailedZooMode && userPin && !selectedLocation && (
          <Marker position={[userPin.lat, userPin.lng]} icon={userPinIcon}>
            <Popup className="glass-popup">
              <div style={{ textAlign: 'center', padding: '2px 4px' }}>
                <strong style={{ color: '#10b981' }}>📍 Custom Pin Point</strong><br />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {userPin.lat.toFixed(6)}, {userPin.lng.toFixed(6)}
                </span><br />
                <span style={{ fontSize: '12px', fontWeight: '500', color: matchingMedia.length > 0 ? '#38bdf8' : '#f59e0b' }}>
                  {matchingMedia.length > 0
                    ? `${matchingMedia.length} Photos Nearby`
                    : 'No geotagged media at this spot'}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. ZOOM LEVEL 16+: Spatial Viewport Lazy-Loaded Markers strictly across Active Zoo */}
        {isDetailedZooMode && (
          <LazyViewportMediaMarkers
            showMediaMarkers={showMediaMarkers}
            currentZoom={currentZoom}
            activeMedia={activeMedia}
            selectedMedia={selectedMedia}
            setSelectedMedia={setSelectedMedia}
            setUserPin={setUserPin}
          />
        )}

        {/* Show matching media when user selects a zone or drops a pin */}
        {isDetailedZooMode && showMediaMarkers && currentZoom < 16 && matchingMedia.length > 0 && (
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
        {isDetailedZooMode && userPin && selectedMedia && (
          <Polyline
            positions={[
              [userPin.lat, userPin.lng],
              [selectedMedia.latitude, selectedMedia.longitude]
            ]}
            color={activeZoo?.themeColor || '#10b981'}
            dashArray="5, 10"
            weight={3}
          />
        )}

        {/* Dynamic Video GPS Tracking Route Progress for Active Zoo */}
        {isDetailedZooMode && (
          <LiveVideoRouteLayer
            liveVideoTracking={liveVideoTracking}
            selectedMedia={selectedMedia}
            onSeekToRoutePoint={onSeekToRoutePoint}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default React.memo(MapView);
