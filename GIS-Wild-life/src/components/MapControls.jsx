import React from 'react';
import { Maximize, Layers, Plus, Minus, Navigation } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { ZOO_CENTER } from '../data/zooLocations';

const MapControls = ({ toggleFullscreen, isLayersOpen, setIsLayersOpen }) => {
  const map = useMap();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleRecenter = () => {
    map.flyTo(ZOO_CENTER, 15, { duration: 1.2, easeLinearity: 0.25 });
  };

  return (
    <div className="map-controls glass-panel">
      {/* Zoom In & Out */}
      <button className="control-btn" onClick={handleZoomIn} title="Zoom In (+)">
        <Plus size={20} />
      </button>
      <button className="control-btn" onClick={handleZoomOut} title="Zoom Out (-)">
        <Minus size={20} />
      </button>
      
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />

      {/* Recenter Zoo Button */}
      <button className="control-btn" onClick={handleRecenter} title="Recenter on Gorewada Zoo">
        <Navigation size={18} />
      </button>

      {/* Map Details / Layers Switcher */}
      <button 
        className={`control-btn ${isLayersOpen ? 'active' : ''}`} 
        onClick={() => setIsLayersOpen(!isLayersOpen)} 
        title="Map Details & Layers"
      >
        <Layers size={18} />
      </button>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />

      {/* Fullscreen Toggle */}
      <button className="control-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
        <Maximize size={18} />
      </button>
    </div>
  );
};

export default MapControls;

