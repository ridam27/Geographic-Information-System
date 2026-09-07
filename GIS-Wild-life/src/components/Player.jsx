import { useEffect, useState, useCallback } from 'react';
import { ParameterPanel } from './ParameterPanel';
import { VideoPanel } from './VideoPanel';
import { MapPanel } from './MapPanel';
import { useVideoSync } from '../hooks/useVideoSync';
import { useFloatingPanels } from '../hooks/useFloatingPanels';

export function Player({ cfg, onClose }) {
  const { 
    pts, 
    meta, 
    currentSyncData, 
    loadJson, 
    loadGpx, 
    total, 
    interp, 
    updateAt, 
    seekToLatLng 
  } = useVideoSync();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoName, setVideoName] = useState('Video');
  const [totalTime, setTotalTime] = useState(0);
  
  const {
    panelStates,
    toggleExpand,
    toggleFloat,
    toggleOpacity,
    handlePointerDownDrag,
    handlePointerMoveDrag,
    handlePointerUpDrag,
    handlePointerDownResize,
    handlePointerMoveResize,
    handlePointerUpResize
  } = useFloatingPanels();

  // Load project media
  useEffect(() => {
    if (!cfg) return;

    if (cfg.video) {
      setVideoUrl(cfg.video);
      setVideoName(cfg.title || 'Video');
    }

    if (cfg.jsonData) {
      loadJson(cfg.jsonData);
    } else if (cfg.json) {
      fetch(cfg.json).then(r => r.json()).then(loadJson).catch(() => {});
    }

    if (!cfg.jsonData) {
      if (cfg.gpxData) {
        loadGpx(cfg.gpxData, pts, meta);
      } else if (cfg.gpx) {
        fetch(cfg.gpx).then(r => r.text()).then(t => loadGpx(t, pts, meta)).catch(() => {});
      }
    }
  }, [cfg]); // Need to run on cfg change, omitting pts/meta to avoid infinite loop

  // Initialize drive timer for purely GPS-based playback (no video)
  useEffect(() => {
    let animationFrameId;
    let lastTime = 0;

    const tick = (now) => {
      if (!lastTime) lastTime = now;
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying && !videoUrl) {
        setCurrentTime(prev => {
          let next = prev + delta;
          const tot = total();
          if (next >= tot) {
            next = tot;
            setIsPlaying(false);
          }
          return next;
        });
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isPlaying && !videoUrl) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, videoUrl, total]);

  // Sync updateAt whenever currentTime changes
  useEffect(() => {
    updateAt(currentTime);
    setTotalTime(total(null)); // will be overridden by real video duration later if available
  }, [currentTime, updateAt, total]);

  // Handle keyboard spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSeek = (t) => {
    setCurrentTime(t);
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const statusText = pts.length > 0 
    ? `${cfg?.jsonData ? 'JSON' : 'GPX'} · ${pts.length} fixes` 
    : 'no track';

  return (
    <div id="stage">
      <ParameterPanel 
        panelState={panelStates['p-params'] || {}}
        onToggleFloat={toggleFloat}
        onToggleExpand={toggleExpand}
        onPointerDownDrag={handlePointerDownDrag}
        onPointerMoveDrag={handlePointerMoveDrag}
        onPointerUpDrag={handlePointerUpDrag}
        onPointerDownResize={handlePointerDownResize}
        onPointerMoveResize={handlePointerMoveResize}
        onPointerUpResize={handlePointerUpResize}
        projMeta={cfg}
        syncData={currentSyncData}
        totalPts={pts.length}
        onBack={handleBack}
      />
      
      <VideoPanel 
        panelState={panelStates['p-video'] || {}}
        onToggleFloat={toggleFloat}
        onToggleExpand={toggleExpand}
        onToggleOpacity={toggleOpacity}
        onPointerDownDrag={handlePointerDownDrag}
        onPointerMoveDrag={handlePointerMoveDrag}
        onPointerUpDrag={handlePointerUpDrag}
        onPointerDownResize={handlePointerDownResize}
        onPointerMoveResize={handlePointerMoveResize}
        onPointerUpResize={handlePointerUpResize}
        videoUrl={videoUrl}
        videoName={videoName}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalTime={totalTime}
        onTimeUpdate={(t) => {
          setCurrentTime(t);
          setTotalTime(total(document.getElementById('vid')?.duration));
        }}
        onSeek={handleSeek}
        togglePlay={() => setIsPlaying(p => !p)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <MapPanel 
        panelState={panelStates['p-map'] || {}}
        onToggleFloat={toggleFloat}
        onToggleExpand={toggleExpand}
        onPointerDownDrag={handlePointerDownDrag}
        onPointerMoveDrag={handlePointerMoveDrag}
        onPointerUpDrag={handlePointerUpDrag}
        onPointerDownResize={handlePointerDownResize}
        onPointerMoveResize={handlePointerMoveResize}
        onPointerUpResize={handlePointerUpResize}
        pts={pts}
        syncData={currentSyncData}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalTime={totalTime}
        onSeek={handleSeek}
        togglePlay={() => setIsPlaying(p => !p)}
        statusText={statusText}
      />
    </div>
  );
}
