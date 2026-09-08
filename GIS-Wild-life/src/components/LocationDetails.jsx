import React from 'react';

const LocationDetails = ({ location }) => {
  if (!location) return null;
  
  return (
    <div className="location-details">
      <div className="detail-row">
        <span className="detail-label">Latitude</span>
        <span className="detail-value">{location.latitude.toFixed(6)}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Longitude</span>
        <span className="detail-value">{location.longitude.toFixed(6)}</span>
      </div>
      <p className="description">{location.description}</p>
    </div>
  );
};

export default LocationDetails;
