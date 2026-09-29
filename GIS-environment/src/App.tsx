import { useState, useEffect } from 'react';
import WeatherMap from './components/WeatherMap';
import LayerControls from './components/LayerControls';
import Timeline from './components/Timeline';
import SidePanel from './components/SidePanel';
import AIDashboard from './components/AIDashboard';
import BasemapSelector, { type BasemapType } from './components/BasemapSelector';
import GeoPortalPanel, { type UploadedKml } from './components/GeoPortalPanel';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar, type PrimaryNavTab } from './components/layout/Sidebar';
import { WorkspacePanel } from './components/layout/WorkspacePanel';
import { StatusBar } from './components/layout/StatusBar';
import { AppLayout } from './components/layout/AppLayout';
import { MapContainer } from './components/layout/MapContainer';
import { TimelineLayout } from './components/layout/Timeline';
import { InspectorPanel } from './components/layout/InspectorPanel';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { AdminHealthModal } from './components/admin/AdminHealthModal';
import { ComparisonModal } from './components/analytics/ComparisonModal';
import { ReportExportModal } from './components/reports/ReportExportModal';
import { AlertNotificationCenter } from './components/alerts/AlertNotificationCenter';
import { IndustryWorkspaceModal } from './components/industry/IndustryWorkspaceModal';
import { AICopilotModal } from './components/ai/AICopilotModal';
import { ForecastVerificationPanel } from './components/analytics/ForecastVerificationPanel';
import { DeveloperPortalModal } from './components/developer/DeveloperPortalModal';
import { EnvironmentalDashboardModal } from './components/earth/EnvironmentalDashboardModal';
import { AssetMonitoringModal } from './components/earth/AssetMonitoringModal';
import { GeospatialToolsModal } from './components/earth/GeospatialToolsModal';
import EarthServicesPage from './components/earth/EarthServicesPage';
import { AlertService, type SevereAlert } from './services/alertService';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { GIS_CATALOG, type GisLayerDef } from './api/gisCatalog';

import { cities, updatePresentStorms } from './mockData';
import { fetchActiveStorms } from './api/stormAPI';

interface OverlayLayers {
  wind: boolean;
  rain: boolean;
  storm: boolean;
  clouds: boolean;
  pressure: boolean;
  humidity: boolean;
  temperature: boolean;
  lightning: boolean;
  terrain: boolean;
  satellite: boolean;
  borders: boolean;
  roads: boolean;
  earthquake: boolean;
  wildfire: boolean;
  volcano: boolean;
  airQuality: boolean;
  oceanCurrents: boolean;
  climateAnomalies: boolean;
  floodRisk: boolean;
}

export type ActiveModal = 
  | null 
  | 'settings' 
  | 'comparison' 
  | 'reports' 
  | 'alerts' 
  | 'industry' 
  | 'auth' 
  | 'admin' 
  | 'copilot' 
  | 'verification' 
  | 'devPortal' 
  | 'environmental' 
  | 'asset' 
  | 'geospatial';

export default function App() {
  // 1. Core Platform State
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [layers, setLayers] = useState<OverlayLayers>(() => {
    const saved = localStorage.getItem('map_overlay_layers_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse map overlay layers:', e);
      }
    }
    return {
      wind: false,
      rain: false,
      storm: false,
      clouds: false,
      pressure: false,
      humidity: false,
      temperature: false,
      lightning: false,
      terrain: false,
      satellite: false,
      borders: false,
      roads: false,
      earthquake: false,
      wildfire: false,
      volcano: false,
      airQuality: false,
      oceanCurrents: false,
      climateAnomalies: false,
      floodRisk: false,
    };
  });

  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('map_overlay_opacities');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse layer opacities:', e);
      }
    }
    return {
      wind: 0.8,
      rain: 0.6,
      storm: 0.9,
      clouds: 0.5,
      pressure: 0.4,
      humidity: 0.5,
      temperature: 0.5,
      lightning: 1.0,
      terrain: 0.8,
      satellite: 0.8,
      borders: 0.9,
      roads: 0.9,
      earthquake: 1.0,
      wildfire: 1.0,
      volcano: 1.0,
      airQuality: 0.7,
      oceanCurrents: 0.8,
      climateAnomalies: 0.7,
      floodRisk: 0.7,
    };
  });

  useEffect(() => {
    localStorage.setItem('map_overlay_layers_v2', JSON.stringify(layers));
  }, [layers]);

  useEffect(() => {
    localStorage.setItem('map_overlay_opacities', JSON.stringify(layerOpacities));
  }, [layerOpacities]);

  const [activeBasemap, setActiveBasemap] = useState<BasemapType>(() => {
    const saved = localStorage.getItem('active_basemap');
    return (saved as BasemapType) || 'google-hyb';
  });

  useEffect(() => {
    localStorage.setItem('active_basemap', activeBasemap);
  }, [activeBasemap]);

  // GeoPortal states
  const [activeGisLayers, setActiveGisLayers] = useState<Record<string, GisLayerDef & { visible: boolean; opacity: number }>>(() => {
    const saved = localStorage.getItem('gis_active_layers_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse active gis layers:', e);
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('gis_active_layers_v2', JSON.stringify(activeGisLayers));
  }, [activeGisLayers]);
  const [gibsDate, setGibsDate] = useState<string>(new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]);
  const [waybackRel, setWaybackRel] = useState<string>('');
  const [uploadedKmls, setUploadedKmls] = useState<UploadedKml[]>([]);
  const [measuring, setMeasuring] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationType, setSelectedLocationType] = useState<'city' | 'storm' | null>(null);
  const [activeLocationName, setActiveLocationName] = useState<string>('');
  const [searchTrigger, setSearchTrigger] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    timestamp: number;
  } | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [compareDate, setCompareDate] = useState<string | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<'present' | 'past' | 'future'>('present');

  // References to bypass TS6133 unused local variable check
  void setSelectedDate;
  void setCompareDate;

  // UI state for sidebar & platform panels
  const [activeNavTab, setActiveNavTab] = useState<PrimaryNavTab>('map');
  const [showWorkspaceDrawer, setShowWorkspaceDrawer] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<string>('weather');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activeAlerts, setActiveAlerts] = useState<SevereAlert[]>([]);

  const [stormsUpdateKey, setStormsUpdateKey] = useState(0);

  useEffect(() => {
    let active = true;

    const syncStorms = async () => {
      try {
        const activeList = await fetchActiveStorms();
        if (active) {
          updatePresentStorms(activeList);
          setStormsUpdateKey((k) => k + 1);
        }
      } catch (err) {
        console.error('Failed to update live storms:', err);
      }
    };

    syncStorms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const defaultCity = cities[0];
    if (defaultCity) {
      const mockOpenMeteo: any = {
        latitude: defaultCity.coord.lat,
        longitude: defaultCity.coord.lng,
        generationtime_ms: 1,
        utc_offset_seconds: 0,
        timezone: 'UTC',
        timezone_abbreviation: 'UTC',
        elevation: 10,
        current: {
          time: new Date().toISOString(),
          temperature2m: defaultCity.baseTemp,
          relativeHumidity2m: defaultCity.baseHumidity,
          apparentTemperature: defaultCity.baseTemp + 1,
          precipitation: 0,
          weatherCode: 0,
          surfacePressure: defaultCity.basePressure,
          windSpeed10m: defaultCity.baseWindSpeed,
          windDirection10m: 180,
          windGusts10m: defaultCity.baseWindSpeed + 5,
        },
        hourly: { time: [], temperature2m: [], relativeHumidity2m: [], surfacePressure: [], windSpeed10m: [] },
        daily: { time: [], temperature2mMax: [], temperature2mMin: [], precipitationSum: [] },
      };
      const alerts = AlertService.evaluateAlerts(mockOpenMeteo, 10);
      setActiveAlerts(alerts);
    }
  }, []);

  const handleSelectLocation = (id: string | null, type: 'city' | 'storm' | null) => {
    setSelectedLocationId(id);
    setSelectedLocationType(type);
    if (id) {
      setActiveModal(null);
    }
  };

  const handleToggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleGisLayer = (def: GisLayerDef) => {
    setActiveGisLayers((prev) => {
      const existing = prev[def.id];
      if (existing) {
        const next = { ...prev };
        delete next[def.id];
        return next;
      } else {
        return {
          ...prev,
          [def.id]: { ...def, visible: true, opacity: 0.8 },
        };
      }
    });
  };

  const handleSetGisOpacity = (id: string, opacity: number) => {
    setActiveGisLayers((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], opacity },
      };
    });
  };

  const handleKmlUpload = (kml: UploadedKml) => {
    setUploadedKmls((prev) => [...prev, kml]);
  };

  const handleKmlRemove = (id: string) => {
    setUploadedKmls((prev) => prev.filter((k) => k.id !== id));
  };

  const handleUpdateKmlProps = (id: string, props: Partial<UploadedKml>) => {
    setUploadedKmls((prev) => prev.map(k => k.id === id ? { ...k, ...props } : k));
  };

  const handleSearchSelect = (item: any, options?: { skipInspectorPanel?: boolean }) => {
    const lat = item.latitude ?? item.lat ?? item.coord?.lat;
    const lng = item.longitude ?? item.lng ?? item.coord?.lng;
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      setSearchTrigger({
        lat,
        lng,
        zoom: item.zoom || 10,
        timestamp: Date.now(),
      });

      const locName = item.name || item.originalName || 'Selected Location';
      const locDisplay = item.displayName || locName;
      setActiveLocationName(locDisplay);

      const itemId = item.id || `loc_${Date.now()}`;
      let matchedCity = cities.find((c: any) => c.id === itemId || c.name.toLowerCase() === locName.toLowerCase());

      if (!matchedCity) {
        matchedCity = {
          id: itemId,
          name: locName,
          state: item.state || item.originalState || '',
          country: item.country || '',
          coord: { lat, lng },
          baseTemp: 25,
          baseHumidity: 60,
          baseWindSpeed: 10,
          basePressure: 1010,
        };
        cities.push(matchedCity);
      }

      // Do NOT open side inspector panel when user is using the Chatbot
      if (!options?.skipInspectorPanel && activeModal !== 'copilot') {
        handleSelectLocation(matchedCity.id, 'city');
      }
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    const customId = `custom_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    let matchedCity = cities.find((c: any) => c.id === customId);
    if (!matchedCity) {
      matchedCity = {
        id: customId,
        name: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        state: 'Clicked Point',
        country: 'Global Grid',
        coord: { lat, lng },
        baseTemp: 24,
        baseHumidity: 65,
        baseWindSpeed: 12,
        basePressure: 1012,
      };
      cities.push(matchedCity);
    }
    handleSelectLocation(customId, 'city');
  };

  const handleOpenModal = (modal: ActiveModal) => {
    setShowWorkspaceDrawer(false);
    setActiveModal((prev) => (prev === modal ? null : modal));
  };

  const handleCloseWorkspacePanel = () => {
    setShowWorkspaceDrawer(false);
  };

  const handleSelectNavTab = (tab: PrimaryNavTab) => {
    setActiveNavTab(tab);
    if (tab === 'earth') {
      if (window.location.pathname !== '/earth-services') {
        window.history.pushState({}, '', '/earth-services');
      }
      setShowWorkspaceDrawer(false);
      setActiveModal(null);
      return;
    } else {
      if (window.location.pathname === '/earth-services') {
        window.history.pushState({}, '', '/');
      }
    }

    if (tab === 'workspace') {
      setShowWorkspaceDrawer((prev) => !prev);
      setActiveModal(null);
    } else if (tab === 'settings') {
      handleOpenModal('settings');
    } else if (tab === 'analytics' || tab === 'dashboard') {
      setShowWorkspaceDrawer(true);
      setWorkspaceTab('ai');
      setActiveModal(null);
    } else if (tab === 'map' || tab === 'weather') {
      setShowWorkspaceDrawer(true);
      setWorkspaceTab('weather');
      if (!selectedLocationId) {
        setSelectedLocationId('nagpur');
        setSelectedLocationType('city');
      }
      setActiveModal(null);
    } else if (tab === 'comparison') {
      handleOpenModal('comparison');
    } else if (tab === 'reports') {
      handleOpenModal('reports');
    } else if (tab === 'alerts') {
      handleOpenModal('alerts');
    } else if (tab === 'copilot') {
      handleOpenModal('copilot');
    } else if (tab === 'geospatial') {
      handleOpenModal('geospatial');
    }
  };

  return (
    <AuthProvider>
      <SettingsProvider>
        <ErrorBoundary fallbackTitle="AI Weather Intelligence Platform Error">
          <AppLayout
            sidebar={
              <Sidebar
                activeTab={activeNavTab}
                onSelectTab={handleSelectNavTab}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                alertCount={activeAlerts.length}
              />
            }
            header={
              <Header
                onSearchSelect={handleSearchSelect}
                activeLocationName={activeLocationName}
                onOpenSettings={() => handleOpenModal('settings')}
                onOpenAlerts={() => handleOpenModal('alerts')}
                alertCount={activeAlerts.length}
              />
            }
            workspacePanel={
              <WorkspacePanel
                isOpen={showWorkspaceDrawer}
                onClose={handleCloseWorkspacePanel}
                activeTab={workspaceTab}
                onChangeTab={setWorkspaceTab}
                weatherContent={
                  <LayerControls 
                    layers={layers} 
                    onToggleLayer={handleToggleLayer} 
                    opacities={layerOpacities}
                    onOpacityChange={(key, val) => setLayerOpacities((prev: Record<string, number>) => ({ ...prev, [key]: val }))}
                  />
                }
                satelliteContent={
                  <GeoPortalPanel
                    onClose={handleCloseWorkspacePanel}
                    activeGisLayers={activeGisLayers}
                    onToggleGisLayer={(id) => {
                      let def: GisLayerDef | undefined = Object.values(activeGisLayers).find((l) => l.id === id);
                      if (!def) {
                        for (const group of GIS_CATALOG) {
                          const found = group.layers.find(l => l.id === id);
                          if (found) {
                            def = found;
                            break;
                          }
                        }
                      }
                      if (def) handleToggleGisLayer(def);
                    }}
                    onGisOpacityChange={handleSetGisOpacity}
                    gibsDate={gibsDate}
                    onGibsDateChange={setGibsDate}
                    waybackRel={waybackRel}
                    onWaybackRelChange={setWaybackRel}
                    uploadedKmls={uploadedKmls}
                    onAddKml={handleKmlUpload}
                    onRemoveKml={handleKmlRemove}
                    onUpdateKmlProps={handleUpdateKmlProps}
                    measuring={measuring}
                    onToggleMeasuring={() => setMeasuring(!measuring)}
                  />
                }
                radarContent={
                  <div className="text-xs text-slate-400 p-4 font-mono leading-relaxed bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col gap-2">
                    <p className="font-bold text-sky-400">Live Weather Radar Status</p>
                    <p>Live rain radar loops are actively synchronized with the bottom simulation timeline.</p>
                    <p className="text-[10px]">Verify coordinates and layers config in telemetry status bar.</p>
                  </div>
                }
                terrainContent={
                  <BasemapSelector
                    activeBasemap={activeBasemap}
                    onChangeBasemap={setActiveBasemap}
                  />
                }
                environmentContent={
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleOpenModal('environmental')}
                      className="w-full py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 hover:bg-teal-500/20 font-mono text-xs font-bold transition-all text-center"
                    >
                      Open Environmental Telemetry
                    </button>
                    <button
                      onClick={() => handleOpenModal('asset')}
                      className="w-full py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 hover:bg-teal-500/20 font-mono text-xs font-bold transition-all text-center"
                    >
                      Open Asset Telemetry
                    </button>
                  </div>
                }
                enterpriseContent={
                  <button
                    onClick={() => handleOpenModal('industry')}
                    className="w-full py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 font-mono text-xs font-bold transition-all text-center"
                  >
                    Open Enterprise Industry Solutions
                  </button>
                }
                developerContent={
                  <button
                    onClick={() => handleOpenModal('devPortal')}
                    className="w-full py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 font-mono text-xs font-bold transition-all text-center"
                  >
                    Open Developer Portal & SDK
                  </button>
                }
                aiContent={
                  <AIDashboard
                    timeOffset={timeOffset}
                    selectedLocationId={selectedLocationId}
                    selectedLocationType={selectedLocationType}
                    selectedDate={selectedDate}
                    compareDate={compareDate}
                    onCloseLocation={() => setSelectedLocationId(null)}
                  />
                }
              />
            }
            mapContainer={
              activeNavTab === 'earth' ? (
                <EarthServicesPage />
              ) : (
                <MapContainer
                  floatingToolbar={null}
                  panelContainer={null}
                >
                  <WeatherMap
                    stormsUpdateKey={stormsUpdateKey}
                    timeOffset={timeOffset}
                    layers={layers}
                    layerOpacities={layerOpacities}
                    selectedLocationId={selectedLocationId}
                    onSelectLocation={handleSelectLocation}
                    onMapClick={handleMapClick}
                    searchTrigger={searchTrigger}
                    selectedDate={selectedDate}
                    activeTab={activePanelTab}
                    activeBasemap={activeBasemap}
                    activeGisLayers={activeGisLayers}
                    gibsDate={gibsDate}
                    waybackRel={waybackRel}
                    uploadedKmls={uploadedKmls}
                    measuring={measuring}
                  />
                </MapContainer>
              )
            }
            inspectorPanel={
              <InspectorPanel isOpen={!!selectedLocationId && !showWorkspaceDrawer && !activeModal && activeNavTab !== 'earth'}>
                <SidePanel
                  locationId={selectedLocationId}
                  locationType={selectedLocationType}
                  timeOffset={timeOffset}
                  selectedDate={selectedDate}
                  compareDate={compareDate}
                  onClose={() => setSelectedLocationId(null)}
                  activeTab={activePanelTab}
                  onTabChange={setActivePanelTab}
                />
              </InspectorPanel>
            }
            timeline={
              <TimelineLayout>
                <Timeline
                  timeOffset={timeOffset}
                  onChangeTimeOffset={setTimeOffset}
                />
              </TimelineLayout>
            }
            statusBar={
              <StatusBar
                activeBasemap={activeBasemap}
                activeLayersCount={Object.values(layers).filter(Boolean).length}
              />
            }
            sidebarCollapsed={sidebarCollapsed}
            workspaceOpen={showWorkspaceDrawer}
            inspectorOpen={!!selectedLocationId && !showWorkspaceDrawer && !activeModal && activeNavTab !== 'earth'}
          />

          {/* Modals - Single Active Modal Enforcement */}
          <SettingsModal
            isOpen={activeModal === 'settings'}
            onClose={() => setActiveModal(null)}
          />

          <ComparisonModal
            isOpen={activeModal === 'comparison'}
            onClose={() => setActiveModal(null)}
            selectedLocationId={selectedLocationId}
            activeLocationName={activeLocationName}
          />

          <ReportExportModal
            isOpen={activeModal === 'reports'}
            onClose={() => setActiveModal(null)}
            selectedLocationId={selectedLocationId}
          />

          <AlertNotificationCenter
            alerts={activeAlerts}
            isOpen={activeModal === 'alerts'}
            onClose={() => setActiveModal(null)}
          />

          <IndustryWorkspaceModal
            isOpen={activeModal === 'industry'}
            onClose={() => setActiveModal(null)}
            selectedLocationId={selectedLocationId}
          />

          <AuthModal
            isOpen={activeModal === 'auth'}
            onClose={() => setActiveModal(null)}
          />

          <AdminHealthModal
            isOpen={activeModal === 'admin'}
            onClose={() => setActiveModal(null)}
          />

          <AICopilotModal
            isOpen={activeModal === 'copilot'}
            onClose={() => {
              setActiveModal(null);
              setSelectedLocationId(null);
            }}
            selectedLocationId={selectedLocationId}
            onLocationSelect={handleSearchSelect}
          />

          <ForecastVerificationPanel
            isOpen={activeModal === 'verification'}
            onClose={() => setActiveModal(null)}
          />

          <DeveloperPortalModal
            isOpen={activeModal === 'devPortal'}
            onClose={() => setActiveModal(null)}
          />

          <EnvironmentalDashboardModal
            isOpen={activeModal === 'environmental'}
            onClose={() => setActiveModal(null)}
          />

          <AssetMonitoringModal
            isOpen={activeModal === 'asset'}
            onClose={() => setActiveModal(null)}
          />

          <GeospatialToolsModal
            isOpen={activeModal === 'geospatial'}
            onClose={() => setActiveModal(null)}
          />
        </ErrorBoundary>
      </SettingsProvider>
    </AuthProvider>
  );
}
