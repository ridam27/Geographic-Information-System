import { useRef } from 'react';

export function FloatingPanel({ 
  id, 
  title, 
  tag, 
  panelState = {}, 
  onToggleFloat, 
  onToggleExpand, 
  onToggleOpacity,
  onPointerDownDrag,
  onPointerMoveDrag,
  onPointerUpDrag,
  onPointerDownResize,
  onPointerMoveResize,
  onPointerUpResize,
  children,
  headerLeft,
  headerExtras
}) {
  const panelRef = useRef(null);

  const isFloating = !!panelState.floating;
  const isExpanded = !!panelState.expanded;
  
  let className = "panel";
  if (isExpanded) className += " expanded";
  if (isFloating) className += " floating";

  const style = {};
  if (isFloating) {
    if (panelState.left !== undefined) style.left = panelState.left + 'px';
    if (panelState.top !== undefined) style.top = panelState.top + 'px';
    if (panelState.width !== undefined) style.width = panelState.width + 'px';
    if (panelState.height !== undefined) style.height = panelState.height + 'px';
  }
  if (panelState.opacity !== undefined) {
    style.opacity = panelState.opacity;
  }

  const isOpacityOn = panelState.opacity !== undefined && panelState.opacity < 1;

  return (
    <section 
      className={className} 
      id={id} 
      ref={panelRef} 
      style={style}
    >
      <div 
        className="phead" 
        onPointerDown={(e) => onPointerDownDrag(e, id)}
        onPointerMove={(e) => onPointerMoveDrag(e, id)}
        onPointerUp={(e) => onPointerUpDrag(e, id)}
      >
        {headerLeft}
        <span className="pt">{title}</span>
        {tag && <span className="tag" dangerouslySetInnerHTML={{ __html: tag }}></span>}
        <div className="pbtns">
          {headerExtras}
          {onToggleOpacity && (
            <button className={`ib ${isOpacityOn ? 'on' : ''}`} onClick={() => onToggleOpacity(id)} title="Opacity">&#9686;</button>
          )}
          <button className={`ib ${isFloating ? 'on' : ''}`} onClick={() => onToggleFloat(id, panelRef)} title="Float">&#9635;</button>
          <button className={`ib ${isExpanded ? 'on' : ''}`} onClick={() => onToggleExpand(id)} title="Expand">&#9974;</button>
        </div>
      </div>
      
      {children}
      
      <div 
        className="grip" 
        onPointerDown={(e) => onPointerDownResize(e, id)}
        onPointerMove={(e) => onPointerMoveResize(e, id)}
        onPointerUp={(e) => onPointerUpResize(e, id)}
      ></div>
    </section>
  );
}
