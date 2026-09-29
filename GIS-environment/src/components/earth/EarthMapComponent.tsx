import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { EarthquakeData, WildfireData, VolcanoData } from '../../services/earthServices';

interface EarthMapComponentProps {
  earthquakes: EarthquakeData[];
  wildfires: WildfireData[];
  volcanoes: VolcanoData[];
  layers: {
    earthquakes: boolean;
    wildfires: boolean;
    volcanoes: boolean;
    wildfireRisk?: boolean;
    floodRisk?: boolean;
    tempAnomaly?: boolean;
    extremeWeatherRisk?: boolean;
  };
  opacities?: {
    earthquakes: number;
    wildfires: number;
    volcanoes: number;
    wildfireRisk?: number;
    floodRisk?: number;
    tempAnomaly?: number;
    extremeWeatherRisk?: number;
  };
  selectedPoint?: { lat: number; lng: number; zoom?: number } | null;
  onSelectEvent?: (type: 'earthquake' | 'wildfire' | 'volcano' | 'risk', data: any) => void;
}

export default function EarthMapComponent({
  earthquakes,
  wildfires,
  volcanoes,
  layers,
  opacities = { 
    earthquakes: 0.9, 
    wildfires: 0.9, 
    volcanoes: 0.9,
    wildfireRisk: 0.7,
    floodRisk: 0.7,
    tempAnomaly: 0.7,
    extremeWeatherRisk: 0.7
  },
  selectedPoint,
  onSelectEvent,
}: EarthMapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'carto-dark': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: '&copy; Esri &copy; OpenStreetMap',
              maxzoom: 18,
            },
          },
          layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 20 }],
        },
        center: [20, 20],
        zoom: 2.2,
        maxZoom: 18,
        minZoom: 1.5,
      });
    } catch (e) {
      console.error('Failed to initialize Earth Services map:', e);
      return;
    }

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      // 1. Earthquakes GeoJSON Source with Native MapLibre Clustering
      map.addSource('earthquakes-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 45,
      });

      // Earthquakes Cluster Circles Layer
      map.addLayer({
        id: 'earthquakes-clusters',
        type: 'circle',
        source: 'earthquakes-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#0284c7', 5,
            '#eab308', 15,
            '#ef4444'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16, 5,
            22, 15,
            30
          ],
          'circle-opacity': opacities.earthquakes,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        },
        layout: { visibility: layers.earthquakes ? 'visible' : 'none' },
      });

      // Earthquakes Cluster Text Count Layer
      map.addLayer({
        id: 'earthquakes-cluster-count',
        type: 'symbol',
        source: 'earthquakes-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          visibility: layers.earthquakes ? 'visible' : 'none'
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Earthquakes Individual Unclustered Layer
      map.addLayer({
        id: 'earthquakes-unclustered-layer',
        type: 'circle',
        source: 'earthquakes-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'magnitude'],
            1, 4,
            3, 7,
            5, 12,
            7, 18,
          ],
          'circle-color': [
            'step',
            ['get', 'magnitude'],
            '#22c55e', 3.0,
            '#eab308', 4.5,
            '#f97316', 6.0,
            '#ef4444'
          ],
          'circle-opacity': opacities.earthquakes,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
        layout: { visibility: layers.earthquakes ? 'visible' : 'none' },
      });

      // 2. NASA Active Wildfires GeoJSON Source with Native MapLibre Clustering
      map.addSource('wildfires-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Wildfires Cluster Circles Layer
      map.addLayer({
        id: 'wildfires-clusters',
        type: 'circle',
        source: 'wildfires-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#f97316', 10,
            '#ea580c', 50,
            '#dc2626'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18, 10,
            24, 50,
            32
          ],
          'circle-opacity': opacities.wildfires,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fef08a'
        },
        layout: { visibility: layers.wildfires ? 'visible' : 'none' },
      });

      // Wildfires Cluster Text Count Layer
      map.addLayer({
        id: 'wildfires-cluster-count',
        type: 'symbol',
        source: 'wildfires-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          visibility: layers.wildfires ? 'visible' : 'none'
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Wildfires Individual Unclustered Layer
      map.addLayer({
        id: 'wildfires-unclustered-layer',
        type: 'circle',
        source: 'wildfires-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 7,
          'circle-color': '#f97316',
          'circle-opacity': opacities.wildfires,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ef4444',
        },
        layout: { visibility: layers.wildfires ? 'visible' : 'none' },
      });

      // 3. Volcanoes GeoJSON Source & Layer
      map.addSource('volcanoes-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'volcanoes-layer',
        type: 'circle',
        source: 'volcanoes-source',
        paint: {
          'circle-radius': 10,
          'circle-color': [
            'match',
            ['get', 'alertLevel'],
            'RED', '#ef4444',
            'ORANGE', '#f97316',
            'YELLOW', '#eab308',
            '#22c55e', // GREEN / default
          ],
          'circle-opacity': opacities.volcanoes,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
        layout: { visibility: layers.volcanoes ? 'visible' : 'none' },
      });

      // 4. Phase 2 GIS Risk Overlays (Rendered as MapLibre Heatmaps)
      map.addSource('wildfire-risk-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { name: 'Bay of Bengal Coastal Zone', score: 78, level: 'HIGH', weight: 0.8 }, geometry: { type: 'Point', coordinates: [88.36, 22.57] } },
            { type: 'Feature', properties: { name: 'Western Ghats Forest Grid', score: 84, level: 'EXTREME', weight: 0.9 }, geometry: { type: 'Point', coordinates: [73.85, 18.52] } },
            { type: 'Feature', properties: { name: 'California Scrubland Corridor', score: 92, level: 'EXTREME', weight: 1.0 }, geometry: { type: 'Point', coordinates: [-118.24, 34.05] } },
            { type: 'Feature', properties: { name: 'Australian Bushland Sector', score: 81, level: 'HIGH', weight: 0.85 }, geometry: { type: 'Point', coordinates: [151.20, -33.86] } },
          ]
        }
      });
      map.addLayer({
        id: 'wildfire-risk-heatmap',
        type: 'heatmap',
        source: 'wildfire-risk-source',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#fef08a',
            0.5, '#f97316',
            0.8, '#dc2626',
            1.0, '#991b1b'
          ],
          'heatmap-radius': 45,
          'heatmap-opacity': (opacities as any).wildfireRisk ?? 0.65
        },
        layout: { visibility: layers.wildfireRisk ? 'visible' : 'none' }
      });

      map.addSource('flood-risk-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { name: 'Ganges Delta Hydro Basin', score: 68, level: 'HIGH', weight: 0.7 }, geometry: { type: 'Point', coordinates: [89.5, 22.8] } },
            { type: 'Feature', properties: { name: 'Chennai Urban Catchment', score: 74, level: 'HIGH', weight: 0.8 }, geometry: { type: 'Point', coordinates: [80.27, 13.08] } },
            { type: 'Feature', properties: { name: 'Mekong Lowland Floodplain', score: 88, level: 'EXTREME', weight: 0.95 }, geometry: { type: 'Point', coordinates: [104.92, 11.55] } },
          ]
        }
      });
      map.addLayer({
        id: 'flood-risk-heatmap',
        type: 'heatmap',
        source: 'flood-risk-source',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#e0f2fe',
            0.5, '#38bdf8',
            0.8, '#0284c7',
            1.0, '#1e3a8a'
          ],
          'heatmap-radius': 45,
          'heatmap-opacity': (opacities as any).floodRisk ?? 0.65
        },
        layout: { visibility: layers.floodRisk ? 'visible' : 'none' }
      });

      map.addSource('temp-anomaly-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { name: 'Central India Thermal Anomaly', delta: '+4.2°C', weight: 0.85 }, geometry: { type: 'Point', coordinates: [79.08, 21.14] } },
            { type: 'Feature', properties: { name: 'Mediterranean Heat Dome', delta: '+3.8°C', weight: 0.8 }, geometry: { type: 'Point', coordinates: [14.99, 37.75] } },
          ]
        }
      });
      map.addLayer({
        id: 'temp-anomaly-heatmap',
        type: 'heatmap',
        source: 'temp-anomaly-source',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.1,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.3, '#fde68a',
            0.7, '#d97706',
            1.0, '#7c2d12'
          ],
          'heatmap-radius': 50,
          'heatmap-opacity': (opacities as any).tempAnomaly ?? 0.6
        },
        layout: { visibility: layers.tempAnomaly ? 'visible' : 'none' }
      });

      map.addSource('extreme-weather-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { name: 'Bay of Bengal Severe Storm Cell', probability: 78, weight: 0.8 }, geometry: { type: 'Point', coordinates: [85.82, 20.29] } },
            { type: 'Feature', properties: { name: 'Arabian Sea Gale Front', probability: 64, weight: 0.65 }, geometry: { type: 'Point', coordinates: [72.87, 19.07] } },
          ]
        }
      });
      map.addLayer({
        id: 'extreme-weather-heatmap',
        type: 'heatmap',
        source: 'extreme-weather-source',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1.2,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.3, '#ddd6fe',
            0.7, '#7c3aed',
            1.0, '#4c1d95'
          ],
          'heatmap-radius': 45,
          'heatmap-opacity': (opacities as any).extremeWeatherRisk ?? 0.65
        },
        layout: { visibility: layers.extremeWeatherRisk ? 'visible' : 'none' }
      });

      // Click Popup Handlers for Unclustered Features
      const setupClickPopup = (layerId: string, typeName: 'earthquake' | 'wildfire' | 'volcano') => {
        map.on('click', layerId, (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const props = feat.properties || {};
          const coords = (feat.geometry as any).coordinates.slice();

          let popupHtml = '';
          if (typeName === 'earthquake') {
            popupHtml = `
              <div class="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg border border-slate-700 shadow-xl max-w-xs">
                <div class="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1">
                  <span class="font-bold text-sky-400 uppercase tracking-wider">🌎 Earthquake</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${props.magnitude >= 5 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}">M ${props.magnitude}</span>
                </div>
                <p class="font-bold text-white mb-1">${props.place}</p>
                <div class="space-y-0.5 text-[11px] text-slate-300">
                  <p><span class="text-slate-400">Depth:</span> ${props.depth} km</p>
                  <p><span class="text-slate-400">Time:</span> ${new Date(props.time || props.timestamp).toLocaleString()}</p>
                  ${props.tsunami ? '<p class="text-amber-400 font-bold">⚠️ Tsunami Warning Issued</p>' : ''}
                  <p class="text-[9px] text-slate-500 mt-1.5">${props.source || 'USGS Earthquake Hazards Program'}</p>
                </div>
              </div>
            `;
          } else if (typeName === 'wildfire') {
            popupHtml = `
              <div class="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg border border-slate-700 shadow-xl max-w-xs">
                <div class="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1">
                  <span class="font-bold text-orange-400 uppercase tracking-wider">🔥 Active Fire Detection</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">${props.confidence}% Conf</span>
                </div>
                <p class="font-bold text-white mb-1">${props.title || props.place}</p>
                <div class="space-y-0.5 text-[11px] text-slate-300">
                  <p><span class="text-slate-400">FRP (Power):</span> ${props.intensity || props.frp} MW</p>
                  <p><span class="text-slate-400">Acquisition:</span> ${props.acquisitionTime || 'Recent Satellite Pass'}</p>
                  <p><span class="text-slate-400">Satellite:</span> ${props.satellite || 'VIIRS / MODIS'}</p>
                  <p class="text-[9px] text-slate-500 mt-1.5">${props.source || 'NASA FIRMS / EONET'}</p>
                </div>
              </div>
            `;
          } else if (typeName === 'volcano') {
            popupHtml = `
              <div class="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg border border-slate-700 shadow-xl max-w-xs">
                <div class="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1">
                  <span class="font-bold text-red-400 uppercase tracking-wider">🌋 Volcano Monitoring</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${props.alertLevel === 'RED' ? 'bg-red-500 text-white' : props.alertLevel === 'ORANGE' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-slate-950'}">${props.alertLevel}</span>
                </div>
                <p class="font-bold text-white mb-1">${props.name || props.title}</p>
                <div class="space-y-0.5 text-[11px] text-slate-300">
                  <p><span class="text-slate-400">Country:</span> ${props.country || 'Global'}</p>
                  <p><span class="text-slate-400">Status:</span> ${props.status || 'Active / Unrest'}</p>
                  <p><span class="text-slate-400">Last Updated:</span> ${new Date(props.updatedAt).toLocaleDateString()}</p>
                  <p class="text-[9px] text-slate-500 mt-1.5">${props.source || 'Smithsonian GVP / NASA EONET'}</p>
                </div>
              </div>
            `;
          }

          new maplibregl.Popup({ closeButton: true, className: 'earth-map-popup' })
            .setLngLat(coords)
            .setHTML(popupHtml)
            .addTo(map);

          if (onSelectEvent) {
            onSelectEvent(typeName, props);
          }
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      };

      setupClickPopup('earthquakes-unclustered-layer', 'earthquake');
      setupClickPopup('wildfires-unclustered-layer', 'wildfire');
      setupClickPopup('volcanoes-layer', 'volcano');

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update Earthquakes GeoJSON data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (!map.isStyleLoaded()) return;
      const src = map.getSource('earthquakes-source') as maplibregl.GeoJSONSource;
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: earthquakes.map((eq) => ({
            type: 'Feature',
            properties: { ...eq },
            geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] },
          })),
        });
      }

      if (map.getLayer('earthquakes-clusters')) {
        map.setLayoutProperty('earthquakes-clusters', 'visibility', layers.earthquakes ? 'visible' : 'none');
        map.setLayoutProperty('earthquakes-cluster-count', 'visibility', layers.earthquakes ? 'visible' : 'none');
        map.setLayoutProperty('earthquakes-unclustered-layer', 'visibility', layers.earthquakes ? 'visible' : 'none');
        map.setPaintProperty('earthquakes-clusters', 'circle-opacity', opacities.earthquakes);
        map.setPaintProperty('earthquakes-unclustered-layer', 'circle-opacity', opacities.earthquakes);
      }
    } catch (e) {}
  }, [earthquakes, layers.earthquakes, opacities.earthquakes, mapReady]);

  // Update Wildfires GeoJSON data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (!map.isStyleLoaded()) return;
      const src = map.getSource('wildfires-source') as maplibregl.GeoJSONSource;
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: wildfires.map((wf) => ({
            type: 'Feature',
            properties: { ...wf },
            geometry: { type: 'Point', coordinates: [wf.lng, wf.lat] },
          })),
        });
      }

      if (map.getLayer('wildfires-clusters')) {
        map.setLayoutProperty('wildfires-clusters', 'visibility', layers.wildfires ? 'visible' : 'none');
        map.setLayoutProperty('wildfires-cluster-count', 'visibility', layers.wildfires ? 'visible' : 'none');
        map.setLayoutProperty('wildfires-unclustered-layer', 'visibility', layers.wildfires ? 'visible' : 'none');
        map.setPaintProperty('wildfires-clusters', 'circle-opacity', opacities.wildfires);
        map.setPaintProperty('wildfires-unclustered-layer', 'circle-opacity', opacities.wildfires);
      }
    } catch (e) {}
  }, [wildfires, layers.wildfires, opacities.wildfires, mapReady]);

  // Update Volcanoes GeoJSON data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (!map.isStyleLoaded()) return;
      const src = map.getSource('volcanoes-source') as maplibregl.GeoJSONSource;
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: volcanoes.map((vc) => ({
            type: 'Feature',
            properties: { ...vc },
            geometry: { type: 'Point', coordinates: [vc.lng, vc.lat] },
          })),
        });
      }

      if (map.getLayer('volcanoes-layer')) {
        map.setLayoutProperty('volcanoes-layer', 'visibility', layers.volcanoes ? 'visible' : 'none');
        map.setPaintProperty('volcanoes-layer', 'circle-opacity', opacities.volcanoes);
      }
    } catch (e) {}
  }, [volcanoes, layers.volcanoes, opacities.volcanoes, mapReady]);

  // Update Risk Layers visibility and opacities
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (!map.isStyleLoaded()) return;
      if (map.getLayer('wildfire-risk-heatmap')) {
        map.setLayoutProperty('wildfire-risk-heatmap', 'visibility', layers.wildfireRisk ? 'visible' : 'none');
        map.setPaintProperty('wildfire-risk-heatmap', 'heatmap-opacity', (opacities as any).wildfireRisk ?? 0.65);
      }
      if (map.getLayer('flood-risk-heatmap')) {
        map.setLayoutProperty('flood-risk-heatmap', 'visibility', layers.floodRisk ? 'visible' : 'none');
        map.setPaintProperty('flood-risk-heatmap', 'heatmap-opacity', (opacities as any).floodRisk ?? 0.65);
      }
      if (map.getLayer('temp-anomaly-heatmap')) {
        map.setLayoutProperty('temp-anomaly-heatmap', 'visibility', layers.tempAnomaly ? 'visible' : 'none');
        map.setPaintProperty('temp-anomaly-heatmap', 'heatmap-opacity', (opacities as any).tempAnomaly ?? 0.6);
      }
      if (map.getLayer('extreme-weather-heatmap')) {
        map.setLayoutProperty('extreme-weather-heatmap', 'visibility', layers.extremeWeatherRisk ? 'visible' : 'none');
        map.setPaintProperty('extreme-weather-heatmap', 'heatmap-opacity', (opacities as any).extremeWeatherRisk ?? 0.65);
      }
    } catch (e) {}
  }, [layers.wildfireRisk, layers.floodRisk, layers.tempAnomaly, layers.extremeWeatherRisk, opacities, mapReady]);

  // Fly to selected point when camera trigger changes
  useEffect(() => {
    if (selectedPoint && mapRef.current) {
      try {
        mapRef.current.flyTo({
          center: [selectedPoint.lng, selectedPoint.lat],
          zoom: selectedPoint.zoom || 6,
          essential: true,
          speed: 1.2,
        });
      } catch (e) {}
    }
  }, [selectedPoint]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* On-Map Explicit GIS Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-slate-950/85 border border-slate-800/90 backdrop-blur-md font-mono text-[11px] text-slate-200 shadow-xl space-y-1.5 max-w-[210px]">
        <div className="font-bold text-sky-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">
          🗺️ GIS Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shrink-0" />
          <span>🔴 Earthquake (Scaled)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-amber-200 shrink-0" />
          <span>🟠 Active Wildfire</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-white shrink-0" />
          <span>🌋 Volcano Alert</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-2 rounded bg-gradient-to-r from-yellow-400 to-red-600 shrink-0" />
          <span>🔥 Wildfire Risk Heatmap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-2 rounded bg-gradient-to-r from-sky-300 to-blue-800 shrink-0" />
          <span>🌊 Flood Risk Heatmap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-2 rounded bg-gradient-to-r from-purple-300 to-indigo-900 shrink-0" />
          <span>🌩 Storm Risk Heatmap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-2 rounded bg-gradient-to-r from-amber-300 to-amber-800 shrink-0" />
          <span>🌡 Climate Anomaly Grid</span>
        </div>
      </div>
    </div>
  );
}
