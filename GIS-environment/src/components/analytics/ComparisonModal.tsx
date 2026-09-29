import React, { useState, useEffect, useRef } from 'react';
import { Columns, X, Thermometer, Wind, Gauge, Droplets, CloudRain, Shield, Search, ArrowLeftRight, ArrowUpDown, Loader2, MapPin, Info } from 'lucide-react';
import { ComparisonService, type CompareLocation, type ComparisonMetric } from '../../services/comparisonService';
import { cities } from '../../mockData';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationId?: string | null;
  activeLocationName?: string | null;
}

interface LocationSearchResult extends CompareLocation {
  displayName: string;
}

const DEFAULT_CITY_1: CompareLocation = {
  id: 'mumbai',
  name: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  lat: 19.0760,
  lng: 72.8777
};

const DEFAULT_CITY_2: CompareLocation = {
  id: 'tokyo',
  name: 'Tokyo',
  state: 'Tokyo',
  country: 'Japan',
  lat: 35.6762,
  lng: 139.6503
};

// Custom location search input with debouncing & autocomplete
interface SearchInputProps {
  placeholder: string;
  selectedLocation: CompareLocation | null;
  onSelect: (location: CompareLocation) => void;
  onClear: () => void;
}

const LocationSearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  selectedLocation,
  onSelect,
  onClear
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync display text when selected location changes externally (e.g., swap or reset)
  useEffect(() => {
    if (selectedLocation) {
      const label = `${selectedLocation.name}${selectedLocation.country ? ', ' + selectedLocation.country : ''}`;
      setQuery(label);
    } else {
      setQuery('');
    }
  }, [selectedLocation]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search fetch
  useEffect(() => {
    // If selected location already matches query, skip search
    if (selectedLocation && query === `${selectedLocation.name}${selectedLocation.country ? ', ' + selectedLocation.country : ''}`) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      const q = query.toLowerCase().trim();

      // 1. Search local mock cities first
      const localMatches: LocationSearchResult[] = cities
        .filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
        .slice(0, 4)
        .map(c => ({
          id: c.id,
          name: c.name,
          state: c.state,
          country: c.country,
          lat: c.coord.lat,
          lng: c.coord.lng,
          displayName: `${c.name}, ${c.state ? c.state + ', ' : ''}${c.country}`
        }));

      try {
        // 2. Fetch OpenMeteo Geocoding API
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            const remoteResults: LocationSearchResult[] = data.results.map((item: any) => ({
              id: `om-${item.id}`,
              name: item.name,
              state: item.admin1 || item.admin2 || '',
              country: item.country || '',
              lat: item.latitude,
              lng: item.longitude,
              displayName: `${item.name}, ${item.admin1 ? item.admin1 + ', ' : ''}${item.country}`
            }));

            // Combine and deduplicate
            const combined = [...localMatches];
            for (const r of remoteResults) {
              if (!combined.some(c => c.name.toLowerCase() === r.name.toLowerCase() && c.country.toLowerCase() === r.country.toLowerCase())) {
                combined.push(r);
              }
            }
            if (active) setResults(combined);
          } else if (active) {
            setResults(localMatches);
          }
        }
      } catch {
        if (active) setResults(localMatches);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, selectedLocation]);

  const handleSelectResult = (item: LocationSearchResult) => {
    onSelect(item);
    setQuery(`${item.name}${item.country ? ', ' + item.country : ''}`);
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onClear();
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className={`glass-panel rounded-xl shadow-lg border transition-all flex items-center px-3.5 py-2.5 gap-2.5 ${
        selectedLocation 
          ? 'bg-slate-900/90 border-sky-500/50 shadow-sky-500/5' 
          : 'bg-slate-950/80 border-slate-700/60 focus-within:border-sky-500/80'
      }`}>
        <Search className={`w-4 h-4 shrink-0 ${selectedLocation ? 'text-sky-400' : 'text-slate-400'}`} />
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="bg-transparent border-none outline-none text-xs text-slate-100 placeholder-slate-400 w-full font-medium font-mono"
        />

        {isSearching && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
        )}

        {selectedLocation ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Clear location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 text-[10px]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && !selectedLocation && query.trim().length >= 2 && (
        <div className="absolute top-[48px] left-0 right-0 bg-[#0d111d] rounded-xl shadow-2xl border border-slate-700/80 p-2 z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 custom-scrollbar">
          {isSearching && results.length === 0 ? (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-400 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Searching locations...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-slate-800/90 transition-colors border border-transparent hover:border-slate-700"
                >
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-100 truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {item.state ? `${item.state}, ` : ''}{item.country}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 text-slate-400">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-300">No locations found</span>
                <span className="text-[10px] text-slate-500 leading-normal">
                  Try searching for major cities like "Tokyo", "London", "New York", or "Sydney".
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, selectedLocationId, activeLocationName }) => {
  const [location1, setLocation1] = useState<CompareLocation | null>(DEFAULT_CITY_1);
  const [location2, setLocation2] = useState<CompareLocation | null>(DEFAULT_CITY_2);
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch comparison telemetry data
  const loadComparison = async (loc1: CompareLocation | null, loc2: CompareLocation | null) => {
    if (!loc1 || !loc2) {
      setComparisonMetrics([]);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const [res1, res2] = await Promise.all([
        ComparisonService.fetchWeatherForLocation(loc1),
        ComparisonService.fetchWeatherForLocation(loc2)
      ]);
      setComparisonMetrics([res1, res2]);
    } catch (err) {
      console.error('Comparison error:', err);
      setApiError('Unable to load weather telemetry for comparison.');
    } finally {
      setIsLoading(false);
    }
  };

  const prevIsOpenRef = useRef(false);

  // Populate City 1 with map selected place & City 2 with a stable distinct city ONLY when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      let c1: CompareLocation | null = null;

      if (selectedLocationId || activeLocationName) {
        const searchId = (selectedLocationId || '').toLowerCase().trim();
        const searchName = (activeLocationName || '').toLowerCase().trim();

        const foundMapCity = cities.find(c =>
          (searchId && c.id.toLowerCase() === searchId) ||
          (searchId && c.name.toLowerCase() === searchId) ||
          (searchName && searchName.includes(c.name.toLowerCase())) ||
          (searchName && c.name.toLowerCase().includes(searchName.split(',')[0].trim().toLowerCase()))
        );

        if (foundMapCity) {
          c1 = {
            id: foundMapCity.id,
            name: foundMapCity.name,
            state: foundMapCity.state,
            country: foundMapCity.country,
            lat: foundMapCity.coord.lat,
            lng: foundMapCity.coord.lng,
          };
        } else if (activeLocationName) {
          const parts = activeLocationName.split(',').map(s => s.trim());
          const name = parts[0] || activeLocationName;
          const country = parts[parts.length - 1] || '';
          const state = parts.length > 2 ? parts[1] : '';
          
          c1 = {
            id: `loc_${name.toLowerCase()}`,
            name,
            state,
            country,
            lat: 21.1458,
            lng: 79.0882
          };
        }
      }

      if (!c1) {
        c1 = DEFAULT_CITY_1;
      }

      const distinctCity = cities.find(c => c.id !== c1?.id && c.name.toLowerCase() !== c1?.name.toLowerCase()) || DEFAULT_CITY_2;
      const c2: CompareLocation = {
        id: distinctCity.id,
        name: distinctCity.name,
        state: distinctCity.state,
        country: distinctCity.country,
        lat: distinctCity.coord.lat,
        lng: distinctCity.coord.lng,
      };

      setLocation1(c1);
      setLocation2(c2);
      loadComparison(c1, c2);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, selectedLocationId, activeLocationName]);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = location1;
    setLocation1(location2);
    setLocation2(temp);
  };

  const handleCompareClick = () => {
    if (location1 && location2) {
      loadComparison(location1, location2);
    }
  };

  const canCompare = location1 !== null && location2 !== null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0d16] border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col text-slate-100 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <Columns className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white">
                Multi-Location Weather Comparison
              </h3>
              <p className="text-[11px] text-slate-400">
                Compare live weather conditions between two locations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Search Controls Bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full">
            {/* Search Input 1 */}
            <div className="flex-1 w-full">
              <LocationSearchInput
                placeholder="Search first city..."
                selectedLocation={location1}
                onSelect={(loc) => setLocation1(loc)}
                onClear={() => setLocation1(null)}
              />
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              type="button"
              title="Swap locations"
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:text-sky-400 text-slate-300 transition-all shrink-0 shadow-md flex items-center justify-center self-center"
            >
              <ArrowLeftRight className="w-4 h-4 hidden lg:block" />
              <ArrowUpDown className="w-4 h-4 lg:hidden" />
            </button>

            {/* Search Input 2 */}
            <div className="flex-1 w-full">
              <LocationSearchInput
                placeholder="Search second city..."
                selectedLocation={location2}
                onSelect={(loc) => setLocation2(loc)}
                onClear={() => setLocation2(null)}
              />
            </div>

            {/* Compare Weather Action Button */}
            <button
              onClick={handleCompareClick}
              disabled={!canCompare || isLoading}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 border shadow-lg shrink-0 h-[42px] ${
                canCompare && !isLoading
                  ? 'bg-sky-500 hover:bg-sky-400 text-white border-sky-400/50 shadow-sky-500/20 active:scale-95'
                  : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Fetching...</span>
                </>
              ) : (
                <span>Compare Weather</span>
              )}
            </button>
          </div>
        </div>

        {/* Comparison Cards Content Area */}
        <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-mono mb-4 text-center">
              {apiError}
            </div>
          )}

          {!canCompare ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400 gap-2">
              <Info className="w-8 h-8 text-sky-400 opacity-60 mb-1" />
              <span className="text-xs font-mono font-bold text-slate-300">Select Two Locations to Compare</span>
              <span className="text-[11px] text-slate-500 max-w-sm">
                Search and choose both City 1 and City 2 above, then click <strong>Compare Weather</strong>.
              </span>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-8">
              {[1, 2].map((i) => (
                <div key={i} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 animate-pulse">
                  <div className="h-6 bg-slate-800/80 rounded-md w-2/3" />
                  <div className="flex flex-col gap-2.5 pt-2">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <div key={j} className="h-10 bg-slate-800/40 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : comparisonMetrics.length === 2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {comparisonMetrics.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition-all"
                >
                  <div className="border-b border-slate-800/80 pb-3 flex justify-between items-center">
                    <span className="font-extrabold text-base text-white font-sans tracking-wide truncate">
                      {item.locationName}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/50 text-sky-400 shrink-0">
                      City {index + 1}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-400 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-400 shrink-0" /> Temperature
                      </span>
                      <span className="font-bold text-white text-sm">{item.temp}°C</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-400 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-cyan-400 shrink-0" /> Humidity
                      </span>
                      <span className="font-bold text-white text-sm">{item.humidity}%</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-400 flex items-center gap-2">
                        <Wind className="w-4 h-4 text-sky-400 shrink-0" /> Wind Speed
                      </span>
                      <span className="font-bold text-white text-sm">{item.windSpeed} km/h</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-400 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-purple-400 shrink-0" /> Pressure
                      </span>
                      <span className="font-bold text-white text-sm">{item.pressure} hPa</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-400 flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-blue-400 shrink-0" /> Rainfall
                      </span>
                      <span className="font-bold text-white text-sm">{item.rainfall} mm/h</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-400 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400 shrink-0" /> Air Quality (AQI)
                      </span>
                      <span className="font-bold text-emerald-400 text-sm">{item.aqi}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};
