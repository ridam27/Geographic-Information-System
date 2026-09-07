import { useEffect, useRef, useState } from 'react';
import { FloatingPanel } from './FloatingPanel';

export function VideoPanel({
  panelState,
  onToggleFloat,
  onToggleExpand,
  onToggleOpacity,
  onPointerDownDrag,
  onPointerMoveDrag,
  onPointerUpDrag,
  onPointerDownResize,
  onPointerMoveResize,
  onPointerUpResize,
  videoUrl,
  videoName,
  isPlaying,
  currentTime,
  totalTime,
  onTimeUpdate,
  onSeek,
  togglePlay,
  onEnded,
  onPlay,
  onPause
}) {
  const videoRef = useRef(null);
  const bodyRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  
  useEffect(() => {
    if (videoUrl) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      // Just let it sync
    }
  };

  // Video Scrubbing logic
  const dragRef = useRef({ active: false, sx: 0, st: 0, moved: false });
  
  const handleBodyPointerDown = (e) => {
    if (!videoUrl) return;
    dragRef.current = {
      active: true,
      sx: e.clientX,
      st: currentTime,
      moved: false
    };
    if (bodyRef.current) bodyRef.current.setPointerCapture(e.pointerId);
  };

  const handleBodyPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = e.clientX - drag.sx;
    if (Math.abs(dx) > 4) drag.moved = true;
    
    const w = bodyRef.current ? (bodyRef.current.clientWidth || 1) : 1;
    let t = drag.st + (dx / w) * totalTime;
    t = Math.max(0, Math.min(totalTime, t));
    
    if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
    onSeek(t);
  };

  const handleBodyPointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    try {
      if (bodyRef.current) bodyRef.current.releasePointerCapture(e.pointerId);
    } catch(err){}
    
    if (!drag.moved) {
      togglePlay();
    }
  };

  const pos = totalTime > 0 ? Math.round((currentTime / totalTime) * 1000) : 0;

  return (
    <FloatingPanel
      id="p-video"
      title={videoName || "Video"}
      tag={videoUrl ? "SYNC" : null}
      panelState={panelState}
      onToggleFloat={onToggleFloat}
      onToggleExpand={onToggleExpand}
      onToggleOpacity={onToggleOpacity}
      onPointerDownDrag={onPointerDownDrag}
      onPointerMoveDrag={onPointerMoveDrag}
      onPointerUpDrag={onPointerUpDrag}
      onPointerDownResize={onPointerDownResize}
      onPointerMoveResize={onPointerMoveResize}
      onPointerUpResize={onPointerUpResize}
    >
      <div 
        className="pbody" 
        id="vbody" 
        ref={bodyRef}
        onPointerDown={handleBodyPointerDown}
        onPointerMove={handleBodyPointerMove}
        onPointerUp={handleBodyPointerUp}
      >
        <video 
          id="vid" 
          ref={videoRef}
          src={videoUrl}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        ></video>
        {!videoUrl && <div className="novid"><div>No video</div></div>}
        <div className="scrubhint" style={{ display: videoUrl ? 'block' : 'none', opacity: showHint ? 1 : 0 }}>
          drag across video to scrub
        </div>
      </div>
      
      <div className="vfoot">
        <button className="play" onClick={() => { if(videoUrl) togglePlay(); }}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <input 
          type="range" 
          className="rng" 
          min="0" 
          max="1000" 
          value={pos} 
          onChange={e => onSeek((parseInt(e.target.value, 10) / 1000) * totalTime)} 
        />
        <span className="tc">{currentTime.toFixed(1)}/{totalTime.toFixed(1)}</span>
      </div>
    </FloatingPanel>
  );
}
