import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import { MapPin, Trash2 } from 'lucide-react';

const PinLocation = ({ isPinningMode, setPinningMode, userPin, clearPin }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="pin-location-control glass-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button 
        type="button"
        className={`control-btn pin-btn ${isPinningMode ? 'active pulse' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setPinningMode(!isPinningMode);
        }}
        title="Pin Location"
      >
        <MapPin size={20} />
      </button>
      
      {userPin && (
        <div className="pin-details" onClick={(e) => e.stopPropagation()}>
          <div className="pin-coords">
            <span>Lat: {userPin.lat.toFixed(6)}</span>
            <span>Lon: {userPin.lng.toFixed(6)}</span>
          </div>
          <button 
            type="button"
            className="control-btn remove-pin-btn"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              clearPin();
            }}
            title="Remove Pin"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PinLocation;


