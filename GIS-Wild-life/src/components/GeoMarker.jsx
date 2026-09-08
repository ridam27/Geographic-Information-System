import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Image, Video } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

const createMediaIcon = (type, isActive) => {
  const iconMarkup = renderToStaticMarkup(
    <div className={`custom-marker ${isActive ? 'pulse' : ''}`}>
      <div className={`marker-icon media-marker ${type} ${isActive ? 'active' : ''}`}>
        {type === 'video' ? <Video size={16} /> : <Image size={16} />}
      </div>
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const GeoMarker = ({ media, isSelected, onClick }) => {
  return (
    <Marker 
      position={[media.latitude, media.longitude]} 
      icon={createMediaIcon(media.type, isSelected)}
      eventHandlers={{
        click: () => onClick(media)
      }}
    >
      <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
        <div style={{ fontWeight: '600', fontSize: '12px' }}>
          {media.type === 'video' ? '🎥 ' : '📷 '}{media.title}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default GeoMarker;

