import { useState, useCallback, useRef } from 'react';
import { parseGpx } from '../utils/helpers';

export function useVideoSync() {
  const [pts, setPts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [currentSyncData, setCurrentSyncData] = useState({
    lat: null, lon: null, acc: null, alt: null, spd: null, el: 0, head: null, idx: 0
  });

  const loadJson = useCallback((t) => {
    const p = (t.points || []).slice().sort((a, b) => a.t - b.t);
    if (!p.length) return false;
    setPts(p);
    setMeta(t);
    return true;
  }, []);

  const loadGpx = useCallback((text, existingPts, existingMeta) => {
    const p = parseGpx(text);
    if (!p.length) return false;
    
    if (existingPts && existingPts.length && existingMeta && existingMeta.points) {
      // JSON drives sync; GPX kept as reference.
      return false; 
    }
    setPts(p);
    setMeta({ durationSec: p[p.length - 1].t });
    return true;
  }, []);

  const total = useCallback((videoDuration) => {
    if (videoDuration && isFinite(videoDuration)) return videoDuration;
    if (meta && meta.durationSec) return meta.durationSec;
    return pts.length ? pts[pts.length - 1].t : 1;
  }, [meta, pts]);

  const lower = useCallback((t) => {
    let lo = 0, hi = pts.length - 1, a = 0;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (pts[m].t <= t) {
        a = m;
        lo = m + 1;
      } else {
        hi = m - 1;
      }
    }
    return a;
  }, [pts]);

  const mix = (p, i) => {
    return { lat: p.lat, lon: p.lon, acc: p.acc, alt: p.alt, spd: p.spd, head: p.head, idx: i };
  };

  const interp = useCallback((t) => {
    if (!pts.length) return null;
    if (t <= pts[0].t) return mix(pts[0], 0);
    
    const L2 = pts[pts.length - 1];
    if (t >= L2.t) return mix(L2, pts.length - 1);
    
    const i = lower(t);
    const a = pts[i];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const sp = (b.t - a.t) || 1;
    const f = (t - a.t) / sp;
    
    return {
      lat: a.lat + (b.lat - a.lat) * f,
      lon: a.lon + (b.lon - a.lon) * f,
      acc: a.acc,
      alt: a.alt,
      spd: a.spd,
      head: a.head,
      idx: i
    };
  }, [pts, lower]);

  const updateAt = useCallback((t) => {
    if (!pts.length) return null;
    const p = interp(t);
    if (!p) return null;
    
    setCurrentSyncData({
      lat: p.lat,
      lon: p.lon,
      acc: p.acc,
      alt: p.alt,
      spd: p.spd,
      el: t,
      head: p.head,
      idx: p.idx
    });
    return p;
  }, [pts, interp]);

  const seekToLatLng = useCallback((ll) => {
    if (!pts.length) return null;
    let best = 0, bd = 1e18;
    for (let i = 0; i < pts.length; i++) {
      const dy = pts[i].lat - ll.lat;
      const dx = pts[i].lon - ll.lng;
      const d = dy * dy + dx * dx;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return pts[best].t;
  }, [pts]);

  return {
    pts,
    meta,
    currentSyncData,
    loadJson,
    loadGpx,
    total,
    interp,
    updateAt,
    seekToLatLng
  };
}
