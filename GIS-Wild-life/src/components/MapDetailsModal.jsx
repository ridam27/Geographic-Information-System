import React from 'react';
import { X, Layers, Navigation, Compass, MapPin, Check, TrafficCone, Eye, EyeOff, Tag, Image as ImageIcon } from 'lucide-react';
import { ZOO_CENTER } from '../data/zooLocations';

const MAP_TYPES = [
  {
    id: 'hybrid',
    name: 'Hybrid',
    subtitle: 'Satellite + Roads & Labels',
    previewImg: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/14354/23472'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    subtitle: 'Pure High-Res Imagery',
    previewImg: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/14354/23472'
  },
  {
    id: 'streets',
    name: 'Default / Streets',
    subtitle: 'Vector Road & City Map',
    previewImg: 'https://a.tile.openstreetmap.org/15/23472/14354.png'
  },
  {
    id: 'terrain',
    name: 'Terrain',
    subtitle: 'Topographical Elevation',
    previewImg: 'https://a.tile.opentopomap.org/15/23472/14354.png'
  }
];

const MapDetailsModal = ({ 
  isOpen, 
  onClose, 
  mapType, 
  setMapType, 
  showTraffic, 
  setShowTraffic,
  showStreetLabels,
  setShowStreetLabels,
  showZooLabels,
  setShowZooLabels,
  showMediaMarkers,
  setShowMediaMarkers,
  onRecenterZoo
}) => {
  if (!isOpen) return null;

  return (
    <div className="map-details-card glass-panel">
      {/* Header */}
      <div className="map-details-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#10b981' }} />
          <h3>Map details & layers</h3>
        </div>
        <button className="map-details-close" onClick={onClose} aria-label="Close map details">
          <X size={18} />
        </button>
      </div>

      <div className="map-details-body">
        {/* Map Type Section */}
        <div className="details-section">
          <span className="section-title">Base Map type</span>
          <div className="map-type-grid">
            {MAP_TYPES.map(type => {
              const isSelected = mapType === type.id;
              return (
                <button
                  key={type.id}
                  className={`map-type-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setMapType(type.id)}
                >
                  <div className={`map-type-thumb type-${type.id}`}>
                    {isSelected && (
                      <div className="selected-check">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                  <span className="type-name">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Layers & Overlays Section */}
        <div className="details-section">
          <span className="section-title">Map Layers & Overlays</span>
          
          <div className="overlay-toggle-list">
            {/* Zoo Custom Labels Layer */}
            <div 
              className={`overlay-toggle-item ${showZooLabels ? 'active' : ''}`}
              onClick={() => setShowZooLabels(!showZooLabels)}
            >
              <div className="overlay-icon-wrapper zoo-layer">
                <Tag size={17} />
              </div>
              <div className="overlay-info">
                <span className="overlay-name">Safari Zones & Location Labels</span>
                <span className="overlay-sub">Gorewada Zoo custom sector beacons</span>
              </div>
              <input 
                type="checkbox" 
                checked={showZooLabels} 
                onChange={() => setShowZooLabels(!showZooLabels)}
                className="overlay-switch"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Google Road/Street Labels Toggle */}
            <div 
              className={`overlay-toggle-item ${showStreetLabels ? 'active' : ''}`}
              onClick={() => setShowStreetLabels(!showStreetLabels)}
            >
              <div className="overlay-icon-wrapper labels">
                {showStreetLabels ? <Eye size={17} /> : <EyeOff size={17} />}
              </div>
              <div className="overlay-info">
                <span className="overlay-name">Road & Place Labels</span>
                <span className="overlay-sub">Public road names & city landmarks</span>
              </div>
              <input 
                type="checkbox" 
                checked={showStreetLabels} 
                onChange={() => setShowStreetLabels(!showStreetLabels)}
                className="overlay-switch"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Geotagged Media Markers Layer */}
            <div 
              className={`overlay-toggle-item ${showMediaMarkers ? 'active' : ''}`}
              onClick={() => setShowMediaMarkers(!showMediaMarkers)}
            >
              <div className="overlay-icon-wrapper media-layer">
                <ImageIcon size={17} />
              </div>
              <div className="overlay-info">
                <span className="overlay-name">Field Media Points</span>
                <span className="overlay-sub">Geotagged photos & video clusters</span>
              </div>
              <input 
                type="checkbox" 
                checked={showMediaMarkers} 
                onChange={() => setShowMediaMarkers(!showMediaMarkers)}
                className="overlay-switch"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Traffic Overlay Toggle */}
            <div 
              className={`overlay-toggle-item ${showTraffic ? 'active' : ''}`}
              onClick={() => setShowTraffic(!showTraffic)}
            >
              <div className="overlay-icon-wrapper traffic">
                <TrafficCone size={17} />
              </div>
              <div className="overlay-info">
                <span className="overlay-name">Traffic Layer</span>
                <span className="overlay-sub">Live road traffic flow colors</span>
              </div>
              <input 
                type="checkbox" 
                checked={showTraffic} 
                onChange={() => setShowTraffic(!showTraffic)}
                className="overlay-switch"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="details-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span className="section-title">Map navigation</span>
          <button className="recenter-zoo-btn" onClick={onRecenterZoo}>
            <Navigation size={16} />
            <span>Focus on Gorewada Zoo (Center)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapDetailsModal;
