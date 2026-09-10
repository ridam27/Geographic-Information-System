import React, { useState, useEffect, useRef } from 'react';
import { bearingToArrow } from '../utils/distance';
import { getMediaCaptureTime } from '../utils/geoUtils';

const MediaCard = ({ media, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const captureTime = getMediaCaptureTime(media);

  // IntersectionObserver Lazy Loading Algorithm:
  // Only mount high-overhead <img> and <video> elements when card is near viewport
  useEffect(() => {
    if (!cardRef.current) return;

    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: '120px' } // Pre-load 120px before entering viewport
      );

      observer.observe(cardRef.current);
      return () => observer.disconnect();
    } else {
      // Fallback for environments without IntersectionObserver
      setIsVisible(true);
    }
  }, []);

  return (
    <div ref={cardRef} className="media-card glass-panel" onClick={() => onClick(media)}>
      <div className="media-thumbnail">
        {isVisible ? (
          media.type === 'video' ? (
            <video 
              src={media.videoUrl} 
              muted 
              preload="none" 
              className="thumbnail-media" 
            />
          ) : (
            <img 
              src={media.imageUrl} 
              alt={media.title} 
              className="thumbnail-media" 
              loading="lazy" 
            />
          )
        ) : (
          <div className="thumbnail-media lazy-media-placeholder" />
        )}
        <div className="media-type-badge">
          {media.type === 'video' ? '🎥' : '📷'}
        </div>
      </div>
      
      <div className="media-info">
        <h4>{media.title}</h4>
        {media.zone && (
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
            {media.zone}
          </div>
        )}
        
        <div className="media-geo-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {media.distance !== undefined && (
            <span className="distance-badge">
              {bearingToArrow(media.bearing)} {media.distance.toFixed(1)} m
            </span>
          )}
          {captureTime && (
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              {captureTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MediaCard);

