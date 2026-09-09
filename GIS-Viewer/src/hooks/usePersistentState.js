import { useState, useEffect, useRef } from "react";

/**
 * Drop-in replacement for useState that persists the value to
 * localStorage under `key`, so it survives a full page refresh.
 *
 * Usage: const [tab, setTab] = usePersistentState("kmz-active-tab", "upload");
 */
export function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (err) {
      console.warn(`usePersistentState: could not read "${key}"`, err);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`usePersistentState: could not write "${key}"`, err);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Restores the scroll position of `containerRef` (or window, if no ref
 * is passed) after a refresh, and keeps saving it as the user scrolls.
 * Call once per scrollable view, with a unique `key`.
 */
export function useScrollRestoration(key, containerRef) {
  const restored = useRef(false);

  useEffect(() => {
    const el = containerRef?.current || window;
    const isWindow = el === window;

    // Restore
    if (!restored.current) {
      try {
        const stored = window.sessionStorage.getItem(`scroll:${key}`);
        if (stored !== null) {
          const { x, y } = JSON.parse(stored);
          requestAnimationFrame(() => {
            if (isWindow) {
              window.scrollTo(x, y);
            } else if (containerRef.current) {
              containerRef.current.scrollLeft = x;
              containerRef.current.scrollTop = y;
            }
          });
        }
      } catch (err) {
        console.warn(`useScrollRestoration: could not restore "${key}"`, err);
      }
      restored.current = true;
    }

    // Save on scroll (throttled via rAF)
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          const x = isWindow ? window.scrollX : containerRef.current.scrollLeft;
          const y = isWindow ? window.scrollY : containerRef.current.scrollTop;
          window.sessionStorage.setItem(`scroll:${key}`, JSON.stringify({ x, y }));
        } catch (err) {
          // ignore quota errors
        }
        ticking = false;
      });
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [key, containerRef]);
}
