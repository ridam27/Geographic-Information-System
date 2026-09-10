import React from 'react';
import { Map as MapIcon, Compass, Sparkles, ArrowLeft } from 'lucide-react';
import { ZOOS } from '../data/zooRegistry';

const Header = ({ activeZooId, currentZoom, onBackToCombinedMap }) => {
  const currentZoo = activeZooId ? ZOOS[activeZooId] : null;

  return (
    <header 
      className="app-header glass-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="header-left">
        <div className="header-brand-icon">
          <MapIcon className="header-icon" size={22} />
        </div>
        <div className="header-titles">
          <h1>
            {currentZoo ? currentZoo.name : "Nagpur Zoological GIS Dashboard"}
          </h1>
          <span className="header-subheading">
            {currentZoo 
              ? `${currentZoo.city} • Detailed Spatial GIS Explorer` 
              : "All-in-One India GIS Map • Click on any Zoo to enter"}
          </span>
        </div>
      </div>

      <div className="header-right">
        {currentZoo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              className="header-back-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onBackToCombinedMap();
              }}
              title="Return to Combined Map"
            >
              <ArrowLeft size={14} />
              <span>Combined Map</span>
            </button>
            <div className={`zoo-status-badge active zoo-${currentZoo.id}`}>
              <span className="status-dot-pulse"></span>
              <Compass size={14} />
              <span>{currentZoo.shortName} Active</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default React.memo(Header);

