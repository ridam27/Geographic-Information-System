import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import MediaGallery from './components/MediaGallery';
import './index.css';

import { 
  NAGPUR_REGION_CENTER, 
  NAGPUR_REGION_ZOOM, 
  INDIA_CENTER, 
  INDIA_DEFAULT_ZOOM, 
  ZOOS, 
  detectActiveZoo 
} from './data/zooRegistry';
import { calculateDistance, calculateBearing } from './utils/distance';

// Helper to read initial state from URL hash, query param, or localStorage
const getInitialState = () => {
  try {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const zooFromParam = urlParams.get('zoo');
    
    let savedState = null;
    try {
      const raw = localStorage.getItem('zooAppState');
      if (raw) savedState = JSON.parse(raw);
    } catch (err) {}

    const zooCandidate = hash || zooFromParam || savedState?.activeZooId;
    if (zooCandidate === 'gorewada' || zooCandidate === 'maharajbagh') {
      const zoo = ZOOS[zooCandidate];
      if (zoo) {
        const savedLocation = savedState?.selectedLocationId 
          ? zoo.locations.find(l => l.id === savedState.selectedLocationId)
          : null;

        const savedMedia = savedState?.selectedMediaId
          ? zoo.media.find(m => m.id === savedState.selectedMediaId)
          : null;

        let userPin = savedState?.userPin || null;
        if (!userPin && savedLocation) {
          userPin = { lat: savedLocation.latitude, lng: savedLocation.longitude };
        } else if (!userPin && savedMedia) {
          userPin = { lat: savedMedia.latitude, lng: savedMedia.longitude };
        }

        return {
          zooId: zooCandidate,
          center: savedState?.mapCenter || (savedMedia ? [savedMedia.latitude, savedMedia.longitude] : (savedLocation ? [savedLocation.latitude, savedLocation.longitude] : zoo.center)),
          zoom: savedState?.mapZoom || 16,
          mapType: savedState?.mapType || 'hybrid',
          selectedLocation: savedLocation,
          userPin,
          selectedMedia: savedMedia,
          searchRadius: savedState?.searchRadius || 100
        };
      }
    }
  } catch (e) {
    console.warn('Error reading initial state:', e);
  }
  return {
    zooId: null,
    center: NAGPUR_REGION_CENTER,
    zoom: NAGPUR_REGION_ZOOM,
    mapType: 'hybrid',
    selectedLocation: null,
    userPin: null,
    selectedMedia: null,
    searchRadius: 100
  };
};

function App() {
  const initial = useMemo(() => getInitialState(), []);

  // 1. Primary Zoo State: null = Combined Starting Map, 'gorewada' = Gorewada GIS, 'maharajbagh' = Maharajbagh GIS
  const [activeZooId, setActiveZooId] = useState(initial.zooId);

  // Map view persistent coordinates (retains exact position on page refresh)
  const [mapCenter, setMapCenter] = useState(initial.center);
  const [mapZoom, setMapZoom] = useState(initial.zoom);

  const [mapType, setMapType] = useState(initial.mapType || 'hybrid');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showStreetLabels, setShowStreetLabels] = useState(true);
  const [showZooLabels, setShowZooLabels] = useState(true);
  const [showMediaMarkers, setShowMediaMarkers] = useState(true);

  const activeZoo = activeZooId ? ZOOS[activeZooId] : null;
  const activeLocations = activeZoo ? activeZoo.locations : [];
  const activeMedia = activeZoo ? activeZoo.media : [];

  const [isPinningMode, setPinningMode] = useState(false);
  const [userPin, setUserPin] = useState(initial.userPin);
  const [selectedLocation, setSelectedLocation] = useState(initial.selectedLocation);
  const [searchRadius, setSearchRadius] = useState(initial.searchRadius);
  
  const [matchingMedia, setMatchingMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(initial.selectedMedia);

  // Sync complete application & sidebar media state to localStorage across refreshes
  useEffect(() => {
    try {
      if (activeZooId) {
        const appState = {
          activeZooId,
          mapCenter,
          mapZoom,
          mapType,
          selectedLocationId: selectedLocation?.id || null,
          userPin: userPin ? { lat: userPin.lat, lng: userPin.lng } : null,
          selectedMediaId: selectedMedia?.id || null,
          searchRadius
        };
        localStorage.setItem('zooAppState', JSON.stringify(appState));
        localStorage.setItem('activeZooId', activeZooId);
        window.history.replaceState(null, '', '#' + activeZooId);
      } else {
        localStorage.removeItem('zooAppState');
        localStorage.removeItem('activeZooId');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) {
      console.warn('Error syncing state:', e);
    }
  }, [activeZooId, mapCenter, mapZoom, mapType, selectedLocation, userPin, selectedMedia, searchRadius]);

  // Handle browser back/forward buttons (hash navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      if (hash === 'gorewada' || hash === 'maharajbagh') {
        const zoo = ZOOS[hash];
        if (zoo) {
          setActiveZooId(hash);
          setMapCenter(zoo.center);
          setMapZoom(16);
        }
      } else if (!hash) {
        setActiveZooId(null);
        setMapCenter(NAGPUR_REGION_CENTER);
        setMapZoom(NAGPUR_REGION_ZOOM);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Live dynamic GPS tracking state for video playback
  const [liveVideoTracking, setLiveVideoTracking] = useState(null);
  const [seekVideoRequest, setSeekVideoRequest] = useState(null);

  const handleSeekToRoutePoint = useCallback((progressRatio, closestPoint) => {
    setSeekVideoRequest({ progressRatio, closestPoint, timestamp: Date.now() });
  }, []);

  // 2. Explicit Zoo-Specific Navigation Handlers
  const handleEnterZoo = useCallback((zooId) => {
    const targetZoo = ZOOS[zooId];
    if (!targetZoo) return;

    setActiveZooId(zooId);
    setUserPin(null);
    setSelectedLocation(null);
    setSelectedMedia(null);
    setLiveVideoTracking(null);
    setMapCenter(targetZoo.center);
    setMapZoom(16);
  }, []);

  const handleBackToCombinedMap = useCallback(() => {
    setActiveZooId(null);
    setUserPin(null);
    setSelectedLocation(null);
    setSelectedMedia(null);
    setLiveVideoTracking(null);
    setMapCenter(NAGPUR_REGION_CENTER);
    setMapZoom(NAGPUR_REGION_ZOOM);
  }, []);

  // 3. Sync map zoom / pan state: Return to combined map when user zooms out below threshold
  const handleMapChange = useCallback((newCenter, newZoom) => {
    setMapCenter(newCenter);
    setMapZoom(newZoom);

    // Zoom-out threshold: smoothly return to overview map when zoomed out
    if (newZoom < 11.5) {
      if (activeZooId !== null) {
        setActiveZooId(null);
        setUserPin(null);
        setSelectedLocation(null);
        setSelectedMedia(null);
        setLiveVideoTracking(null);
      }
    } else if (newZoom >= 14 && activeZooId === null) {
      const detected = detectActiveZoo(newCenter[0], newCenter[1], newZoom);
      if (detected) {
        setActiveZooId(detected);
      }
    }
  }, [activeZooId]);

  // When selectedLocation changes, update userPin and default radius
  const handleSelectLocation = useCallback((location) => {
    setSelectedLocation(location);
    if (location) {
      setUserPin({ lat: location.latitude, lng: location.longitude });
      setSearchRadius(location.radius || 100);
      setSelectedMedia(null);
    }
  }, []);

  // When pin or radius changes, find matching geotagged media strictly for the active zoo dataset
  useEffect(() => {
    if (!userPin || !activeMedia || activeMedia.length === 0) {
      setMatchingMedia([]);
      return;
    }

    const matches = activeMedia.map(media => {
      const distance = calculateDistance(userPin.lat, userPin.lng, media.latitude, media.longitude);
      const bearing = calculateBearing(userPin.lat, userPin.lng, media.latitude, media.longitude);
      return { ...media, distance, bearing };
    })
    .filter(media => media.distance <= searchRadius)
    .sort((a, b) => a.distance - b.distance);

    setMatchingMedia(matches);
    
    if (selectedMedia) {
      const stillMatches = matches.find(m => m.id === selectedMedia.id);
      if (stillMatches) {
        setSelectedMedia(stillMatches);
      }
    }
  }, [userPin, searchRadius, activeMedia]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleGetDirections = useCallback((media) => {
    if (!media) return;
    setSelectedMedia(media);
  }, []);

  const handleCloseGallery = useCallback(() => {
    setUserPin(null);
    setSelectedLocation(null);
    setSelectedMedia(null);
    setLiveVideoTracking(null);
  }, []);

  return (
    <div className="dashboard-container">
      <Header 
        activeZooId={activeZooId} 
        currentZoom={mapZoom}
        onBackToCombinedMap={handleBackToCombinedMap} 
      />
      
      <MapView 
        isPinningMode={isPinningMode}
        setPinningMode={setPinningMode}
        userPin={userPin}
        setUserPin={setUserPin}
        selectedLocation={selectedLocation}
        setSelectedLocation={handleSelectLocation}
        matchingMedia={matchingMedia}
        selectedMedia={selectedMedia}
        setSelectedMedia={setSelectedMedia}
        toggleFullscreen={toggleFullscreen}
        mapCenter={mapCenter}
        setMapCenter={setMapCenter}
        mapZoom={mapZoom}
        setMapZoom={setMapZoom}
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
        liveVideoTracking={liveVideoTracking}
        onSeekToRoutePoint={handleSeekToRoutePoint}
        activeZooId={activeZooId}
        activeZoo={activeZoo}
        activeLocations={activeLocations}
        activeMedia={activeMedia}
        onEnterZoo={handleEnterZoo}
        onBackToCombinedMap={handleBackToCombinedMap}
        onMapStateChange={handleMapChange}
      />
      
      {activeZooId !== null && (
        <MediaGallery 
          userPin={userPin}
          selectedLocation={selectedLocation}
          matchingMedia={matchingMedia}
          searchRadius={searchRadius}
          setSearchRadius={setSearchRadius}
          selectedMedia={selectedMedia}
          setSelectedMedia={setSelectedMedia}
          onGetDirections={handleGetDirections}
          onClose={handleCloseGallery}
          onLiveVideoProgress={setLiveVideoTracking}
          seekVideoRequest={seekVideoRequest}
          activeZoo={activeZoo}
        />
      )}
    </div>
  );
}

export default App;
