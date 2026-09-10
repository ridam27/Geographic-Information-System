import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import { Maximize, Layers, Plus, Minus, Navigation, Globe } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { INDIA_CENTER, INDIA_DEFAULT_ZOOM, ZOOS } from '../data/zooRegistry';

const MapControls = ({ 
  toggleFullscreen, 
  isLayersOpen, 
  setIsLayersOpen,
  activeZooId,
  onFlyToIndia,
  onRecenterActiveZoo
}) => {
  const map = useMap();
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleZoomIn = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    map.zoomIn();
  };

  const handleZoomOut = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    map.zoomOut();
  };

  const handleFlyToIndia = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (onFlyToIndia) {
      onFlyToIndia();
    } else {
      map.flyTo(INDIA_CENTER, INDIA_DEFAULT_ZOOM, { duration: 1.8, easeLinearity: 0.25 });
    }
  };

  const handleRecenter = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (onRecenterActiveZoo) {
      onRecenterActiveZoo();
    } else if (activeZooId && ZOOS[activeZooId]) {
      map.flyTo(ZOOS[activeZooId].center, 15, { duration: 1.5, easeLinearity: 0.25 });
    } else {
      handleFlyToIndia(e);
    }
  };

  const handleToggleLayers = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsLayersOpen(!isLayersOpen);
  };

  const handleToggleFullscreen = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    toggleFullscreen();
  };

  return (
    <div 
      ref={containerRef}
      className="map-controls glass-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Zoom In & Out */}
      <button type="button" className="control-btn" onClick={handleZoomIn} title="Zoom In (+)">
        <Plus size={20} />
      </button>
      <button type="button" className="control-btn" onClick={handleZoomOut} title="Zoom Out (-)">
        <Minus size={20} />
      </button>
      
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />

      {/* Full India Map View */}
      <button type="button" className="control-btn" onClick={handleFlyToIndia} title="Return to India Overview">
        <Globe size={18} style={{ color: '#f59e0b' }} />
      </button>

      {/* Recenter Zoo / Active Focus */}
      <button 
        type="button"
        className="control-btn" 
        onClick={handleRecenter} 
        title={activeZooId ? `Recenter on ${ZOOS[activeZooId]?.shortName}` : "Focus Zoo"}
      >
        <Navigation size={18} style={{ color: activeZooId === 'maharajbagh' ? '#38bdf8' : '#10b981' }} />
      </button>

      {/* Map Details / Layers Switcher */}
      <button 
        type="button"
        className={`control-btn ${isLayersOpen ? 'active' : ''}`} 
        onClick={handleToggleLayers} 
        title="Map Details & Layers"
      >
        <Layers size={18} />
      </button>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />

      {/* Fullscreen Toggle */}
      <button type="button" className="control-btn" onClick={handleToggleFullscreen} title="Toggle Fullscreen">
        <Maximize size={18} />
      </button>
    </div>
  );
};

export default React.memo(MapControls);
