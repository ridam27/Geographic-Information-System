import React from 'react';
import { MapPin, Trash2 } from 'lucide-react';

const PinLocation = ({ isPinningMode, setPinningMode, userPin, clearPin }) => {
  return (
    <div className="pin-location-control glass-panel">
      <button 
        className={`control-btn pin-btn ${isPinningMode ? 'active pulse' : ''}`}
        onClick={() => setPinningMode(!isPinningMode)}
        title="Pin Location"
      >
        <MapPin size={20} />
      </button>
      
      {userPin && (
        <div className="pin-details">
          <div className="pin-coords">
            <span>Lat: {userPin.lat.toFixed(6)}</span>
            <span>Lon: {userPin.lng.toFixed(6)}</span>
          </div>
          <button 
            className="control-btn remove-pin-btn"
            onClick={clearPin}
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

