import { useEffect } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { TransportControls } from './TransportControls';
import { useLeafletMap } from '../hooks/useLeafletMap';
import { useTheme } from '../context/ThemeContext';

export function MapPanel({
  panelState,
  onToggleFloat,
  onToggleExpand,
  onPointerDownDrag,
  onPointerMoveDrag,
  onPointerUpDrag,
  onPointerDownResize,
  onPointerMoveResize,
  onPointerUpResize,
  pts,
  syncData,
  isPlaying,
  currentTime,
  totalTime,
  onSeek,
  togglePlay,
  statusText
}) {
  const { theme } = useTheme();

  const { setBaseMap, drawTrack, updateMapProgress, invalidateSize } = useLeafletMap("map", (latlng) => {
    // Map click seek logic is bubbled up to parent, but requires mapping latlng to time.
  }, theme);

  // Because useLeafletMap needs to draw track when points arrive
  useEffect(() => {
    if (pts && pts.length > 0) {
      drawTrack(pts);
    }
  }, [pts, drawTrack]);

  // Because useLeafletMap needs to update progress when syncData changes
  useEffect(() => {
    if (pts && pts.length > 0 && syncData.lat != null) {
      updateMapProgress(pts, syncData.idx, syncData.lat, syncData.lon);
    }
  }, [syncData, pts, updateMapProgress]);

  // Notify map when resized
  useEffect(() => {
    invalidateSize();
  }, [panelState.expanded, panelState.floating, panelState.width, panelState.height, invalidateSize]);

  const headerExtras = (
    <select className="basemap-sel" onChange={e => setBaseMap(e.target.value)} onPointerDown={e => e.stopPropagation()}>
      <option value="sat">Satellite</option>
      <option value="street">Street</option>
      <option value="topo">Topographic</option>
      <option value="dark">Dark Matter</option>
      <option value="light">Positron Light</option>
    </select>
  );

  return (
    <FloatingPanel
      id="p-map"
      title="Map View"
      panelState={panelState}
      onToggleFloat={onToggleFloat}
      onToggleExpand={onToggleExpand}
      onPointerDownDrag={onPointerDownDrag}
      onPointerMoveDrag={onPointerMoveDrag}
      onPointerUpDrag={onPointerUpDrag}
      onPointerDownResize={onPointerDownResize}
      onPointerMoveResize={onPointerMoveResize}
      onPointerUpResize={onPointerUpResize}
      headerExtras={headerExtras}
    >
      <div className="pbody">
        <div id="map"></div>
        <TransportControls
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          currentTime={currentTime}
          totalTime={totalTime}
          onSeek={(pos1000) => onSeek((pos1000 / 1000) * totalTime)}
          statusText={statusText}
        />
      </div>
    </FloatingPanel>
  );
}
