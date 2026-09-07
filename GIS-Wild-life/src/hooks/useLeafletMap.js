import { useEffect, useRef, useCallback } from 'react';

const bases = {
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Esri World Imagery" },
  topo: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "OpenTopoMap" },
  street: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "OpenStreetMap" },
  dark: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap &copy; CARTO" },
  light: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap &copy; CARTO" }
};

export function useLeafletMap(mapId, onMapClick, theme = 'dark') {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const trackLineRef = useRef(null);
  const doneLineRef = useRef(null);
  const markerRef = useRef(null);
  const userSelectedBaseRef = useRef(null);

  const setBaseMap = useCallback((k) => {
    if (!mapRef.current || !window.L || !bases[k]) return;
    userSelectedBaseRef.current = k;
    if (layerRef.current) mapRef.current.removeLayer(layerRef.current);
    
    layerRef.current = window.L.tileLayer(bases[k].url, { maxZoom: 19, attribution: bases[k].attr }).addTo(mapRef.current);
    if (layerRef.current.bringToBack) layerRef.current.bringToBack();
  }, []);

  useEffect(() => {
    if (!mapRef.current && window.L) {
      mapRef.current = window.L.map(mapId, { zoomControl: true, attributionControl: true }).setView([19.69, 80.46], 13);
      const defaultBase = theme === 'light' ? 'light' : 'sat';
      setBaseMap(defaultBase);
      userSelectedBaseRef.current = null;
      
      mapRef.current.on('click', (e) => {
        if (onMapClick) onMapClick(e.latlng);
      });
    }
  }, [mapId, onMapClick, setBaseMap, theme]);

  // When theme changes, update tile if user hasn't explicitly locked a custom basemap like topo
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    if (!userSelectedBaseRef.current || userSelectedBaseRef.current === 'sat' || userSelectedBaseRef.current === 'light' || userSelectedBaseRef.current === 'dark') {
      const targetBase = theme === 'light' ? 'light' : 'sat';
      if (layerRef.current) mapRef.current.removeLayer(layerRef.current);
      layerRef.current = window.L.tileLayer(bases[targetBase].url, { maxZoom: 19, attribution: bases[targetBase].attr }).addTo(mapRef.current);
      if (layerRef.current.bringToBack) layerRef.current.bringToBack();
    }
  }, [theme]);

  const drawTrack = useCallback((pts) => {
    if (!mapRef.current || !window.L) return;
    
    if (trackLineRef.current) mapRef.current.removeLayer(trackLineRef.current);
    if (doneLineRef.current) mapRef.current.removeLayer(doneLineRef.current);
    if (markerRef.current) mapRef.current.removeLayer(markerRef.current);

    const ll = pts.map(p => [p.lat, p.lon]);
    
    trackLineRef.current = window.L.polyline(ll, { color: "#FF4D5E", weight: 3.5, opacity: 0.75 }).addTo(mapRef.current);
    doneLineRef.current = window.L.polyline([], { color: "#38E1A0", weight: 5, opacity: 0.95 }).addTo(mapRef.current);
    
    markerRef.current = window.L.marker(ll[0], {
      icon: window.L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#FF4D5E;border:2px solid #fff;box-shadow:0 0 0 5px rgba(255,77,94,.28),0 0 14px rgba(255,77,94,.6)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(trackLineRef.current.getBounds(), { padding: [50, 50] });

    trackLineRef.current.on('click', (e) => {
      if (onMapClick) onMapClick(e.latlng);
    });
  }, [onMapClick]);

  const updateMapProgress = useCallback((pts, pIndex, currentLat, currentLon) => {
    if (!markerRef.current || !doneLineRef.current) return;
    
    markerRef.current.setLatLng([currentLat, currentLon]);
    const up = [];
    for (let i = 0; i <= pIndex; i++) up.push([pts[i].lat, pts[i].lon]);
    up.push([currentLat, currentLon]);
    doneLineRef.current.setLatLngs(up);
  }, []);

  const invalidateSize = useCallback(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 80);
    }
  }, []);

  return { setBaseMap, drawTrack, updateMapProgress, invalidateSize, mapRef };
}
