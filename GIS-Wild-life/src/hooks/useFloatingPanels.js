import { useState, useCallback, useRef } from 'react';

export function useFloatingPanels(onResize) {
  const [panelStates, setPanelStates] = useState({});
  const dragRefs = useRef({});

  const setPanelState = useCallback((id, updates) => {
    setPanelStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  }, []);

  const toggleExpand = useCallback((id) => {
    setPanelStates(prev => {
      const current = prev[id] || {};
      const newExpanded = !current.expanded;
      if (newExpanded && current.floating) {
        return { ...prev, [id]: { ...current, expanded: newExpanded, floating: false } };
      }
      return { ...prev, [id]: { ...current, expanded: newExpanded } };
    });
    if (onResize) onResize();
  }, [onResize]);

  const toggleFloat = useCallback((id, elementRef) => {
    setPanelStates(prev => {
      const current = prev[id] || {};
      
      if (current.floating) {
        return {
          ...prev,
          [id]: {
            ...current,
            floating: false,
            left: undefined,
            top: undefined,
            width: undefined,
            height: undefined,
            opacity: undefined
          }
        };
      } else {
        let updates = { floating: true, expanded: false };
        if (elementRef && elementRef.current) {
          const r = elementRef.current.getBoundingClientRect();
          updates.left = r.left;
          updates.top = r.top;
          updates.width = Math.max(300, r.width);
          updates.height = Math.max(220, r.height);
        }
        return { ...prev, [id]: { ...current, ...updates } };
      }
    });
    if (onResize) onResize();
  }, [onResize]);

  const toggleOpacity = useCallback((id) => {
    setPanelStates(prev => {
      const current = prev[id] || {};
      const curOp = current.opacity !== undefined ? current.opacity : 1;
      const nextOp = curOp >= 1 ? 0.7 : (curOp >= 0.7 ? 0.45 : 1);
      
      const updates = { opacity: nextOp };
      
      if (nextOp < 1 && !current.floating) {
        // Will be triggered to float in the UI side, or we can just force it here:
        updates.floating = true;
        // Ideally we need elementRef to get initial rect, 
        // but let's let the component handle the combined toggle if needed.
      }
      return { ...prev, [id]: { ...current, ...updates } };
    });
  }, []);

  const handlePointerDownDrag = useCallback((e, id) => {
    if (e.target.closest(".ib") || e.target.closest("select")) return;
    const current = panelStates[id] || {};
    if (!current.floating) return;

    const el = e.currentTarget.parentElement;
    const r = el.getBoundingClientRect();
    
    dragRefs.current[id] = {
      active: true,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      type: 'move'
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [panelStates]);

  const handlePointerMoveDrag = useCallback((e, id) => {
    const drag = dragRefs.current[id];
    if (!drag || !drag.active || drag.type !== 'move') return;

    const x = Math.max(2, Math.min(window.innerWidth - 60, e.clientX - drag.dx));
    const y = Math.max(2, Math.min(window.innerHeight - 40, e.clientY - drag.dy));
    
    setPanelState(id, { left: x, top: y });
  }, [setPanelState]);

  const handlePointerUpDrag = useCallback((e, id) => {
    const drag = dragRefs.current[id];
    if (drag) {
      drag.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  }, []);

  const handlePointerDownResize = useCallback((e, id) => {
    const el = e.currentTarget.parentElement;
    const r = el.getBoundingClientRect();
    
    dragRefs.current[id] = {
      active: true,
      rw: r.width,
      rh: r.height,
      rx: e.clientX,
      ry: e.clientY,
      type: 'resize'
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, []);

  const handlePointerMoveResize = useCallback((e, id) => {
    const drag = dragRefs.current[id];
    if (!drag || !drag.active || drag.type !== 'resize') return;

    const width = Math.max(200, drag.rw + (e.clientX - drag.rx));
    const height = Math.max(150, drag.rh + (e.clientY - drag.ry));
    
    setPanelState(id, { width, height });
    if (id === 'p-map' && onResize) {
      onResize();
    }
  }, [setPanelState, onResize]);

  const handlePointerUpResize = useCallback((e, id) => {
    const drag = dragRefs.current[id];
    if (drag) {
      drag.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (onResize) onResize();
    }
  }, [onResize]);

  return {
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
  };
}
