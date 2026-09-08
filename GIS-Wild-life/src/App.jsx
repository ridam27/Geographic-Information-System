import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import MediaGallery from './components/MediaGallery';
import './index.css';

import { ZOO_CENTER, zooLocations } from './data/zooLocations';
import { geotaggedMedia } from './data/geotaggedMedia';
import { calculateDistance, calculateBearing } from './utils/distance';
import { loadPersistedGISState, savePersistedGISState } from './utils/storageUtils';

function App() {
  // 1. Load any previously saved GIS state from localStorage on startup
  const savedState = useRef(loadPersistedGISState()).current;

  const [isPinningMode, setPinningMode] = useState(false);
  const [userPin, setUserPin] = useState(savedState?.userPin || null);
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (!savedState?.selectedLocationId) return null;
    return zooLocations.find(l => l.id === savedState.selectedLocationId) || null;
  });
  const [searchRadius, setSearchRadius] = useState(savedState?.searchRadius || 100);
  
  const [matchingMedia, setMatchingMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(() => {
    if (!savedState?.selectedMediaId) return null;
    return geotaggedMedia.find(m => m.id === savedState.selectedMediaId) || null;
  });

  // Map view and layer persistent states
  const [mapCenter, setMapCenter] = useState(savedState?.mapCenter || ZOO_CENTER);
  const [mapZoom, setMapZoom] = useState(savedState?.mapZoom !== undefined ? savedState.mapZoom : 15);
  const [mapType, setMapType] = useState(savedState?.mapType || 'hybrid');
  const [showTraffic, setShowTraffic] = useState(savedState?.showTraffic || false);
  const [showStreetLabels, setShowStreetLabels] = useState(savedState?.showStreetLabels !== undefined ? savedState.showStreetLabels : true);
  const [showZooLabels, setShowZooLabels] = useState(savedState?.showZooLabels !== undefined ? savedState.showZooLabels : true);
  const [showMediaMarkers, setShowMediaMarkers] = useState(savedState?.showMediaMarkers !== undefined ? savedState.showMediaMarkers : true);

  // Live dynamic GPS tracking state for video playback & route seeking
  const [liveVideoTracking, setLiveVideoTracking] = useState(null);
  const [seekVideoRequest, setSeekVideoRequest] = useState(null);

  const handleSeekToRoutePoint = useCallback((progressRatio, closestPoint) => {
    setSeekVideoRequest({ progressRatio, closestPoint, timestamp: Date.now() });
  }, []);

  // When selectedLocation changes, update userPin and default radius
  const handleSelectLocation = useCallback((location) => {
    setSelectedLocation(location);
    if (location) {
      setUserPin({ lat: location.latitude, lng: location.longitude });
      setSearchRadius(location.radius || 100);
      setSelectedMedia(null);
    }
  }, []);

  // When pin or radius changes, find matching geotagged media
  useEffect(() => {
    if (!userPin) {
      setMatchingMedia([]);
      setSelectedMedia(null);
      return;
    }

    const matches = geotaggedMedia.map(media => {
      const distance = calculateDistance(userPin.lat, userPin.lng, media.latitude, media.longitude);
      const bearing = calculateBearing(userPin.lat, userPin.lng, media.latitude, media.longitude);
      return { ...media, distance, bearing };
    })
    .filter(media => media.distance <= searchRadius)
    .sort((a, b) => a.distance - b.distance);

    setMatchingMedia(matches);
    
    // If the currently selected media is in matches, update its distance/bearing properties
    if (selectedMedia) {
      const stillMatches = matches.find(m => m.id === selectedMedia.id);
      if (stillMatches) {
        setSelectedMedia(stillMatches);
      }
    }
  }, [userPin, searchRadius]);

  // 2. Automatically save GIS state to localStorage with debounce
  useEffect(() => {
    savePersistedGISState({
      mapCenter,
      mapZoom,
      mapType,
      showTraffic,
      showStreetLabels,
      showZooLabels,
      showMediaMarkers,
      userPin,
      selectedLocationId: selectedLocation?.id || null,
      selectedMediaId: selectedMedia?.id || null,
      searchRadius
    });
  }, [
    mapCenter,
    mapZoom,
    mapType,
    showTraffic,
    showStreetLabels,
    showZooLabels,
    showMediaMarkers,
    userPin,
    selectedLocation,
    selectedMedia,
    searchRadius
  ]);

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
      <Header />
      
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
      />
      
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
      />
    </div>
  );
}

export default App;
