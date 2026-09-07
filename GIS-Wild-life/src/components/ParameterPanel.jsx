import { FloatingPanel } from './FloatingPanel';
import { Compass } from './Compass';

export function ParameterPanel({ 
  panelState, 
  onToggleFloat, 
  onToggleExpand,
  onPointerDownDrag,
  onPointerMoveDrag,
  onPointerUpDrag,
  onPointerDownResize,
  onPointerMoveResize,
  onPointerUpResize,
  projMeta,
  syncData,
  totalPts,
  onBack
}) {
  const headerLeft = onBack ? (
    <button 
      className="back-btn" 
      onClick={(e) => {
        e.stopPropagation();
        onBack();
      }} 
      onPointerDown={(e) => e.stopPropagation()}
      title="Back to Project List"
    >
      &larr; Back
    </button>
  ) : null;

  return (
    <FloatingPanel
      id="p-params"
      title="Parameters"
      tag={`&mdash; ${syncData.idx + 1}/${totalPts || 1}`}
      panelState={panelState}
      onToggleFloat={onToggleFloat}
      onToggleExpand={onToggleExpand}
      onPointerDownDrag={onPointerDownDrag}
      onPointerMoveDrag={onPointerMoveDrag}
      onPointerUpDrag={onPointerUpDrag}
      onPointerDownResize={onPointerDownResize}
      onPointerMoveResize={onPointerMoveResize}
      onPointerUpResize={onPointerUpResize}
      headerLeft={headerLeft}
    >
      <div className="pbody">
        {projMeta && (projMeta.title || projMeta.date || projMeta.time) && (
          <div className="projmeta">
            <div className="mt">{projMeta.title || ''}</div>
            <div className="md">
              {[projMeta.date, projMeta.time].filter(Boolean).join('  ·  ')}
            </div>
          </div>
        )}

        <div className="tgrid">
          <div className="g wide"><div className="k">Latitude</div><div className="v big">{syncData.lat != null ? syncData.lat.toFixed(6) : '—'}</div></div>
          <div className="g wide"><div className="k">Longitude</div><div className="v big">{syncData.lon != null ? syncData.lon.toFixed(6) : '—'}</div></div>
          <div className="g"><div className="k">Accuracy</div><div className="v">{syncData.acc != null ? syncData.acc.toFixed(1) + ' m' : '—'}</div></div>
          <div className="g"><div className="k">Altitude</div><div className="v">{syncData.alt != null ? syncData.alt.toFixed(0) + ' m' : '—'}</div></div>
          <div className="g"><div className="k">Speed</div><div className="v">{syncData.spd != null ? (syncData.spd * 3.6).toFixed(1) + ' km/h' : '—'}</div></div>
          <div className="g"><div className="k">Elapsed</div><div className="v">{syncData.el != null ? syncData.el.toFixed(1) + ' s' : '—'}</div></div>
        </div>
        <Compass heading={syncData.head} />
      </div>
    </FloatingPanel>
  );
}
