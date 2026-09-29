import React, { useRef, useCallback } from 'react';
import { 
  Map as MapIcon, Compass, ArrowLeft, Navigation, ChevronLeft, ChevronRight,
  DoorOpen, Bus, TreePine, Ticket, Car, Coffee, HeartPulse, Waves, Info, MapPin
} from 'lucide-react';
import { ZOOS } from '../data/zooRegistry';
import { TigerIcon, LeopardIcon, BearIcon, DeerIcon } from './AnimalIcons';

const renderLocationIcon = (name, size = 13) => {
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

const Header = ({ 
  activeZooId, 
  currentZoom, 
  onBackToCombinedMap,
  activeLocations = [],
  selectedLocation,
  onSelectLocation
}) => {
  const currentZoo = activeZooId ? ZOOS[activeZooId] : null;
  const scrollRef = useRef(null);

  const handleScrollLeft = useCallback((e) => {
    if (e) e.stopPropagation();
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -160, behavior: 'smooth' });
    }
  }, []);

  const handleScrollRight = useCallback((e) => {
    if (e) e.stopPropagation();
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  }, []);

  return (
    <header 
      className="app-header glass-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="header-left">
        <div className="header-brand-icon">
          <MapIcon className="header-icon" size={20} />
        </div>
        <div className="header-titles">
          <h1>
            {currentZoo ? currentZoo.name : "Nagpur Zoological GIS Dashboard"}
          </h1>
          <span className="header-subheading">
            {currentZoo 
              ? `${currentZoo.city} • Spatial GIS Explorer` 
              : "All-in-One India GIS Map • Click on any Zoo to enter"}
          </span>
        </div>
      </div>

      {currentZoo && activeLocations && activeLocations.length > 0 && (
        <div className="header-explorer-inline">
          <div className="quick-bar-divider" />
          <div className="quick-bar-label">
            <Navigation size={13} style={{ color: currentZoo.themeColor || '#10b981' }} />
            <span>{currentZoo.shortName} Explorer:</span>
          </div>

          <button 
            type="button" 
            className="quick-bar-scroll-btn left" 
            onClick={handleScrollLeft}
            title="Scroll left"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="quick-bar-chips" ref={scrollRef}>
            {activeLocations.map(loc => {
              const isGorewadaVideo = activeZooId === 'gorewada' && (
                loc.id.includes('safari') || loc.id.includes('tiger') || loc.id.includes('leopard') || loc.id.includes('bear')
              );

              return (
                <button
                  type="button"
                  key={`hdr-quick-${loc.id}`}
                  className={`zone-chip ${selectedLocation?.id === loc.id ? 'active' : ''} cat-${loc.category}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectLocation) onSelectLocation(loc);
                  }}
                  title={loc.name}
                >
                  <span className="chip-icon">{renderLocationIcon(loc.iconName, 13)}</span>
                  <span>{loc.shortName}</span>
                  {isGorewadaVideo && (
                    <span className="chip-video-indicator">🎥 Video</span>
                  )}
                </button>
              );
            })}
          </div>

          <button 
            type="button" 
            className="quick-bar-scroll-btn right" 
            onClick={handleScrollRight}
            title="Scroll right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

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

