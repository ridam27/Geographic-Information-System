import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Compass, Maximize2, Image as ImageIcon, Video as VideoIcon, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { geotaggedMedia } from '../data/geotaggedMedia';
import { calculateDistance } from '../utils/distance';
import { generateDescription } from '../utils/mockDescriptions';
import { getMediaCaptureTime } from '../utils/geoUtils';
import { getTrackProgress, formatVideoTime } from '../utils/gpsTrackUtils';

const RADIUS_OPTIONS = [25, 50, 75, 100, 150, 250, 500];

const MediaGallery = ({ 
  userPin, 
  selectedLocation,
  matchingMedia, 
  searchRadius, 
  setSearchRadius, 
  selectedMedia, 
  setSelectedMedia,
  onGetDirections,
  onClose,
  onLiveVideoProgress,
  seekVideoRequest,
  activeZoo
}) => {
  const isOpen = userPin !== null || selectedLocation !== null || selectedMedia !== null;
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [nearestPhoto, setNearestPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'photos', 'videos'
  const [lightboxImage, setLightboxImage] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  // Live video tracking state
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [liveGps, setLiveGps] = useState(null);

  // Group matching media by type
  const photos = matchingMedia.filter(m => m.type === 'photo');
  const videos = matchingMedia.filter(m => m.type === 'video');

  // Strict separation for Previous / Next navigation:
  // When viewing a Photo -> navigate ONLY through photos in this location
  // When viewing a Video -> navigate ONLY through videos in this location
  const relevantMediaList = selectedMedia
    ? (selectedMedia.type === 'video' ? videos : photos)
    : [];

  const currentIndex = selectedMedia
    ? relevantMediaList.findIndex(m => m.id === selectedMedia.id)
    : -1;

  const totalItems = relevantMediaList.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < totalItems - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      setMediaLoading(true);
      setMediaError(false);
      setSelectedMedia(relevantMediaList[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, relevantMediaList, setSelectedMedia]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      setMediaLoading(true);
      setMediaError(false);
      setSelectedMedia(relevantMediaList[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, relevantMediaList, setSelectedMedia]);

  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef(null);

  const displayedMedia = activeTab === 'photos' 
    ? photos 
    : activeTab === 'videos' 
      ? videos 
      : matchingMedia;

  // Reset lazy list count when filter, radius, or selected point changes
  useEffect(() => {
    setVisibleCount(12);
  }, [activeTab, selectedLocation, userPin, searchRadius]);

  // Lazy loading algorithm: Load additional cards smoothly as user scrolls down
  useEffect(() => {
    if (!loadMoreRef.current) return;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 12, displayedMedia.length));
          }
        },
        { rootMargin: '100px' }
      );
      observer.observe(loadMoreRef.current);
      return () => observer.disconnect();
    }
  }, [displayedMedia.length, visibleCount]);

  // Helper to extract or fallback track for a video
  const getVideoTrack = (media) => {
    if (!media || media.type !== 'video') return null;
    if (media.track && Array.isArray(media.track) && media.track.length > 0) {
      return media.track;
    }
    // Fallback if no multi-point track exists: subtle micro-path around location
    return [
      [media.latitude, media.longitude],
      [media.latitude + 0.0003, media.longitude + 0.0003],
      [media.latitude + 0.0006, media.longitude + 0.0002],
      [media.latitude + 0.0008, media.longitude + 0.0005]
    ];
  };

  // Sync GPS progress when video time changes
  const handleVideoProgressUpdate = (currentTime, duration) => {
    if (!selectedMedia || selectedMedia.type !== 'video') return;
    const track = getVideoTrack(selectedMedia);
    const progress = getTrackProgress(track, currentTime, duration);
    
    setVideoTime(currentTime);
    if (duration > 0) setVideoDuration(duration);
    setLiveGps(progress);

    if (onLiveVideoProgress) {
      onLiveVideoProgress({
        mediaId: selectedMedia.id,
        track,
        ...progress,
        currentTime,
        duration: duration || videoDuration
      });
    }
  };

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || videoDuration || 1;
      handleVideoProgressUpdate(cur, dur);
    }
  };

  const handleLoadedMetadata = () => {
    setMediaLoading(false);
    setMediaError(false);
    if (videoRef.current) {
      const dur = videoRef.current.duration || 1;
      setVideoDuration(dur);
      handleVideoProgressUpdate(0, dur);
    }
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || videoDuration || 1;
      handleVideoProgressUpdate(cur, dur);
    }
  };

  // Dynamic Route Seek: When the user pins or clicks anywhere on the route on the map
  useEffect(() => {
    if (!seekVideoRequest || !selectedMedia || selectedMedia.type !== 'video') return;
    const { progressRatio } = seekVideoRequest;
    if (typeof progressRatio === 'number') {
      const video = videoRef.current;
      const dur = video?.duration && !isNaN(video.duration) && video.duration > 0
        ? video.duration
        : (videoDuration > 0 ? videoDuration : 1);
      
      const targetTime = Math.max(0, Math.min(dur, progressRatio * dur));

      if (video) {
        video.currentTime = targetTime;
        video.play().catch(() => {});
        setIsPlaying(true);
      }
      handleVideoProgressUpdate(targetTime, dur);
    }
  }, [seekVideoRequest]);

  // Reset play state and find nearest photo when selected media changes
  useEffect(() => {
    setIsPlaying(true);
    setVideoTime(0);
    setMediaLoading(true);
    setMediaError(false);

    if (selectedMedia && selectedMedia.type === 'video') {
      const track = getVideoTrack(selectedMedia);
      const initialProgress = getTrackProgress(track, 0, 1);
      setLiveGps(initialProgress);
      if (onLiveVideoProgress) {
        onLiveVideoProgress({
          mediaId: selectedMedia.id,
          track,
          ...initialProgress,
          currentTime: 0,
          duration: 1
        });
      }

      const allPhotos = (activeZoo?.media || geotaggedMedia).filter(m => m.type === 'photo');
      let closest = null;
      let minDistance = Infinity;
      allPhotos.forEach(photo => {
        const dist = calculateDistance(selectedMedia.latitude, selectedMedia.longitude, photo.latitude, photo.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { ...photo, distance: dist };
        }
      });
      setNearestPhoto(closest);
    } else {
      setNearestPhoto(null);
      setLiveGps(null);
      if (onLiveVideoProgress) {
        onLiveVideoProgress(null);
      }
    }

    // Clean up previous video element memory
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) {}
      }
    };
  }, [selectedMedia]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  // Lightbox Photo Navigation (Previous / Next)
  const currentPhotoIndex = lightboxImage
    ? photos.findIndex(p => p.imageUrl === lightboxImage)
    : -1;
  const hasLightboxPrev = currentPhotoIndex > 0;
  const hasLightboxNext = currentPhotoIndex >= 0 && currentPhotoIndex < photos.length - 1;

  const handleLightboxPrev = (e) => {
    if (e) e.stopPropagation();
    if (hasLightboxPrev) {
      const prevPhoto = photos[currentPhotoIndex - 1];
      setLightboxImage(prevPhoto.imageUrl);
      setSelectedMedia(prevPhoto);
    }
  };

  const handleLightboxNext = (e) => {
    if (e) e.stopPropagation();
    if (hasLightboxNext) {
      const nextPhoto = photos[currentPhotoIndex + 1];
      setLightboxImage(nextPhoto.imageUrl);
      setSelectedMedia(nextPhoto);
    }
  };

  // Keyboard navigation for panel and lightbox
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Lightbox keyboard controls
      if (lightboxImage) {
        if (e.key === 'ArrowRight' && hasLightboxNext) {
          handleLightboxNext();
        } else if (e.key === 'ArrowLeft' && hasLightboxPrev) {
          handleLightboxPrev();
        } else if (e.key === 'Escape') {
          setLightboxImage(null);
        }
        return;
      }

      // Detail view keyboard controls
      if (selectedMedia) {
        if (e.key === 'ArrowRight' && hasNext) {
          handleNext();
        } else if (e.key === 'ArrowLeft' && hasPrev) {
          handlePrev();
        } else if (e.key === 'Escape') {
          setSelectedMedia(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImage, selectedMedia, hasNext, hasPrev, hasLightboxNext, hasLightboxPrev, handleNext, handlePrev]);

  if (!isOpen) return null;

  const title = selectedLocation 
    ? selectedLocation.name
    : 'Pinned Location';

  const latitude = selectedLocation ? selectedLocation.latitude : userPin?.lat;
  const longitude = selectedLocation ? selectedLocation.longitude : userPin?.lng;

  // Calculate current display Lat / Lng for media
  const currentDisplayLat = (selectedMedia?.type === 'video' && liveGps?.currentLat != null)
    ? liveGps.currentLat
    : selectedMedia?.latitude;

  const currentDisplayLng = (selectedMedia?.type === 'video' && liveGps?.currentLng != null)
    ? liveGps.currentLng
    : selectedMedia?.longitude;

  return (
    <>
      <div 
        className="media-panel media-gallery glass-panel open"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-title-container">
            <h2>{title}</h2>
            {selectedLocation?.description && (
              <p className="location-subtitle">{selectedLocation.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pin-coords-small">
              Lat: {latitude?.toFixed(6)}<br/>
              Lon: {longitude?.toFixed(6)}
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close panel" style={{ marginLeft: '8px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {!selectedMedia ? (
          <div className="panel-content gallery-view">
            {/* Radius & Location Tolerance Selector */}
            <div className="radius-selector">
              <label>Location Proximity Radius:</label>
              <div className="radius-pills">
                {RADIUS_OPTIONS.map(r => (
                  <button 
                    key={r}
                    className={`radius-pill ${searchRadius === r ? 'active' : ''}`}
                    onClick={() => setSearchRadius(r)}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>

            {/* Media Count Badges & Category Tabs */}
            <div className="media-category-tabs">
              <button 
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({matchingMedia.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                <ImageIcon size={14} /> Photos ({photos.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
                onClick={() => setActiveTab('videos')}
              >
                <VideoIcon size={14} /> Videos ({videos.length})
              </button>
            </div>

            {/* Gallery Results */}
            <div className="gallery-results">
              {displayedMedia.length > 0 ? (
                <>
                  <div className="media-list">
                    {displayedMedia.slice(0, visibleCount).map(media => (
                      <MediaCard 
                        key={media.id} 
                        media={media} 
                        onClick={setSelectedMedia} 
                      />
                    ))}
                  </div>
                  {visibleCount < displayedMedia.length && (
                    <div ref={loadMoreRef} style={{ height: '24px', margin: '10px 0', opacity: 0 }} />
                  )}
                </>
              ) : (
                <div className="no-media" style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <Info size={36} style={{ color: '#f59e0b', marginBottom: '8px', opacity: 0.8 }} />
                  <p style={{ fontWeight: '600', color: '#f59e0b', fontSize: '0.95rem' }}>
                    No geo-tagged media available at this location.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                    Try increasing the proximity radius above or click another labeled zone.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Detail View for Single Photo / Video with Previous/Next Navigation */
          <div className="panel-content detail-view">
            <div className="media-navigation-header">
              <button className="back-btn control-btn" onClick={() => setSelectedMedia(null)}>
                ← Back to {selectedLocation ? selectedLocation.shortName || 'Location' : 'Results'}
              </button>

              {/* Prev / Next Media Navigation Controls */}
              <div className="media-nav-controls">
                <button 
                  className="nav-btn prev-btn" 
                  onClick={handlePrev} 
                  disabled={!hasPrev}
                  title="Previous item"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span className="media-pagination-counter">
                  {selectedMedia.type === 'video' ? 'Video' : 'Photo'} {currentIndex >= 0 ? currentIndex + 1 : 1} of {totalItems || 1}
                </span>

                <button 
                  className="nav-btn next-btn" 
                  onClick={handleNext} 
                  disabled={!hasNext}
                  title="Next item"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="detail-media-container" style={{ position: 'relative' }}>
              {/* Media Skeleton Loader */}
              {mediaLoading && !mediaError && (
                <div className="detail-media-skeleton">
                  <div className="skeleton-shimmer" />
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', zIndex: 2 }}>Loading {selectedMedia.type === 'video' ? 'video stream' : 'photo'}...</span>
                </div>
              )}

              {/* Media Error State */}
              {mediaError ? (
                <div className="detail-media-error glass-panel">
                  <p style={{ fontWeight: '600', color: '#f87171', fontSize: '0.9rem', marginBottom: '6px' }}>
                    Unable to load this {selectedMedia.type === 'video' ? 'video' : 'photo'}.
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                    The media file may be temporarily unavailable.
                  </p>
                  <button 
                    className="control-btn"
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', background: 'var(--accent)', color: '#0f172a', fontWeight: '600' }}
                    onClick={() => {
                      setMediaError(false);
                      setMediaLoading(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                  >
                    Retry Loading
                  </button>
                </div>
              ) : selectedMedia.type === 'video' ? (
                <>
                  <video 
                    ref={videoRef}
                    src={selectedMedia.videoUrl} 
                    autoPlay 
                    loop 
                    muted 
                    defaultMuted
                    playsInline 
                    controls
                    controlsList="nodownload noplaybackrate novolume"
                    disableRemotePlayback
                    onVolumeChange={(e) => {
                      if (e.target) {
                        e.target.muted = true;
                        e.target.volume = 0;
                      }
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={(e) => {
                      if (e.target) {
                        e.target.muted = true;
                        e.target.volume = 0;
                      }
                      handleLoadedMetadata();
                    }}
                    onCanPlay={() => {
                      setMediaLoading(false);
                      setMediaError(false);
                    }}
                    onError={() => {
                      setMediaError(true);
                      setMediaLoading(false);
                    }}
                    onDurationChange={handleLoadedMetadata}
                    onSeeked={handleSeeked}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className={`full-media permanently-muted-video ${mediaLoading ? 'loading' : 'loaded'}`}
                    title="Permanently Muted Field Video with GPS Tracking"
                  />
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={selectedMedia.imageUrl} 
                    alt={selectedMedia.title} 
                    className={`full-media ${mediaLoading ? 'loading' : 'loaded'}`}
                    onLoad={() => {
                      setMediaLoading(false);
                      setMediaError(false);
                    }}
                    onError={() => {
                      setMediaError(true);
                      setMediaLoading(false);
                    }}
                  />
                  <button 
                    className="lightbox-trigger-btn"
                    onClick={() => setLightboxImage(selectedMedia.imageUrl)}
                    title="View Fullscreen Photo"
                    aria-label="View Fullscreen Photo"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="location-details">
              <h3>{selectedMedia.title}</h3>
              
              {/* Dynamic Live GPS Telemetry Card for Video Playback */}
              {selectedMedia.type === 'video' ? (
                <div className="live-telemetry-panel">
                  <div className="telemetry-header">
                    <div className="telemetry-badge">
                      <span className="live-dot-indicator"></span>
                      <span>LIVE GPS POSITION</span>
                    </div>
                    <div className="telemetry-time">
                      ▶ {formatVideoTime(videoTime)} / {formatVideoTime(videoDuration)}
                    </div>
                  </div>

                  <div className="telemetry-coords-grid">
                    <div className="coord-box">
                      <span className="coord-label">Latitude</span>
                      <span className="coord-value">{currentDisplayLat != null ? currentDisplayLat.toFixed(6) : '---'}</span>
                    </div>
                    <div className="coord-box">
                      <span className="coord-label">Longitude</span>
                      <span className="coord-value">{currentDisplayLng != null ? currentDisplayLng.toFixed(6) : '---'}</span>
                    </div>
                  </div>

                  {/* Route progress visual bar (Green watched vs Red remaining) */}
                  <div className="telemetry-route-status">
                    <div className="route-status-labels">
                      <span className="route-label-green">🟢 Watched: {Math.round((liveGps?.progressRatio || 0) * 100)}%</span>
                      <span className="route-label-red">🔴 Remaining: {Math.round((1 - (liveGps?.progressRatio || 0)) * 100)}%</span>
                    </div>
                    <div className="telemetry-route-bar">
                      <div 
                        className="route-bar-watched" 
                        style={{ width: `${(liveGps?.progressRatio || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Exact GPS Location</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Latitude:</span>
                    <span className="detail-value">{Number.isFinite(selectedMedia?.latitude) ? selectedMedia.latitude.toFixed(6) : '---'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Longitude:</span>
                    <span className="detail-value">{Number.isFinite(selectedMedia?.longitude) ? selectedMedia.longitude.toFixed(6) : '---'}</span>
                  </div>
                </>
              )}
              
              {selectedMedia.zone && (
                <div className="detail-row">
                  <span className="detail-label">Zone / Area:</span>
                  <span className="detail-value">{selectedMedia.zone}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Capture Date/Time:</span>
                <span className="detail-value">{getMediaCaptureTime(selectedMedia)}</span>
              </div>

              {selectedMedia.distance !== undefined && Number.isFinite(selectedMedia.distance) && (
                <div className="detail-row">
                  <span className="detail-label">Distance from center:</span>
                  <span className="detail-value">{selectedMedia.distance.toFixed(1)} meters</span>
                </div>
              )}

              {selectedMedia.description && (
                <div className="description">
                  {generateDescription(selectedMedia)}
                </div>
              )}
              
              {selectedMedia.type === 'video' && nearestPhoto && (
                <div className="nearest-photo-section" style={{ marginTop: '20px', borderTop: '1px solid var(--panel-border)', paddingTop: '15px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Nearest Field Photo ({nearestPhoto.distance.toFixed(1)}m away)
                  </h4>
                  <div 
                    style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--panel-border)', cursor: 'pointer' }}
                    onClick={() => setLightboxImage(nearestPhoto.imageUrl)}
                  >
                    <img src={nearestPhoto.imageUrl} alt="Nearest photo" style={{ width: '100%', display: 'block' }} />
                  </div>
                </div>
              )}
              
              <button className="directions-btn" onClick={() => onGetDirections(selectedMedia)}>
                <Compass size={18} /> Focus on Map
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Fullscreen Image Viewing with Previous / Next Navigation */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          {/* Top Bar with Title, Counter and Close Button */}
          <div className="lightbox-top-bar" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header-info">
              <span className="lightbox-counter">
                Photo {currentPhotoIndex >= 0 ? currentPhotoIndex + 1 : 1} of {photos.length || 1}
              </span>
              {currentPhotoIndex >= 0 && photos[currentPhotoIndex]?.title && (
                <span className="lightbox-title">{photos[currentPhotoIndex].title}</span>
              )}
            </div>
            <button className="lightbox-close-btn" onClick={() => setLightboxImage(null)} title="Close (Esc)">
              <X size={24} />
            </button>
          </div>

          {/* Left / Previous Photo Button */}
          {photos.length > 1 && (
            <button 
              className={`lightbox-nav-btn lightbox-prev-btn ${!hasLightboxPrev ? 'disabled' : ''}`}
              onClick={handleLightboxPrev}
              disabled={!hasLightboxPrev}
              title="Previous Photo (←)"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Center Image View */}
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Full resolution view" className="lightbox-img" />
          </div>

          {/* Right / Next Photo Button */}
          {photos.length > 1 && (
            <button 
              className={`lightbox-nav-btn lightbox-next-btn ${!hasLightboxNext ? 'disabled' : ''}`}
              onClick={handleLightboxNext}
              disabled={!hasLightboxNext}
              title="Next Photo (→)"
            >
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default MediaGallery;
