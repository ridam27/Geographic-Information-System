import React from 'react';
import { ImageIcon } from 'lucide-react';

const PhotoGallery = ({ photos }) => {
  if (!photos || photos.length === 0) {
    return (
      <div className="photo-gallery">
        <h3>Photos</h3>
        <div className="no-media">
          <ImageIcon size={32} />
          <p>No photos available for this location.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      <h3>Photos</h3>
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div key={index} className="photo-item">
            <img src={photo} alt={`Location photo ${index + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoGallery;
