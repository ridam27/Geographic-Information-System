export function TransportControls({ isPlaying, togglePlay, currentTime, totalTime, onSeek, statusText }) {
  const pos = totalTime > 0 ? Math.round((currentTime / totalTime) * 1000) : 0;
  
  return (
    <div className="transport">
      <button className="bp" onClick={togglePlay}>
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div className="tw">
        <input 
          type="range" 
          className="rng" 
          min="0" 
          max="1000" 
          value={pos} 
          onChange={(e) => onSeek(parseInt(e.target.value, 10))} 
        />
        <div className="lb">
          <span>{currentTime.toFixed(1)} s</span>
          <span style={{ color: 'var(--lock)' }}>{statusText}</span>
          <span>{totalTime.toFixed(1)} s</span>
        </div>
      </div>
    </div>
  );
}
