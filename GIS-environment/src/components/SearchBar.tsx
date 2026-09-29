import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Navigation, Info, Loader2 } from 'lucide-react';
import { LocationService, type ResolvedLocationResult } from '../services/locationService';

interface SearchBarProps {
  onSearchSelect: (item: ResolvedLocationResult) => void;
  activeLocationName?: string | null;
}

export default function SearchBar({ onSearchSelect, activeLocationName }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResolvedLocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync search input query text when activeLocationName changes externally (e.g. from chatbot)
  useEffect(() => {
    if (activeLocationName) {
      setQuery(activeLocationName);
    }
  }, [activeLocationName]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search locations as query changes
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Skip searching if current query already matches active location exactly
    if (activeLocationName && query.toLowerCase().trim() === activeLocationName.toLowerCase().trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const searchRes = await LocationService.searchLocations(query);
        if (active) {
          setResults(searchRes);
        }
      } catch (err) {
        console.error('Location search error:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, activeLocationName]);

  const handleSelect = (item: ResolvedLocationResult) => {
    onSearchSelect(item);
    setQuery(item.displayName || item.name);
    setShowDropdown(false);
    setResults([]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      handleSelect(results[0]);
    } else if (query.trim()) {
      setIsSearching(true);
      const resolved = await LocationService.resolveLocation(query);
      setIsSearching(false);
      if (resolved) {
        handleSelect(resolved);
      }
    }
  };

  return (
    <div className="relative w-full max-w-sm" ref={dropdownRef}>
      <form onSubmit={handleFormSubmit} className="relative z-30">
        <div className="glass-panel rounded-xl shadow-xl border border-slate-700/40 flex items-center px-3.5 py-2.5 gap-2.5 bg-slate-950/80 backdrop-blur-md">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search City, Region, or Lat, Lng..."
            className="bg-transparent border-none outline-none text-xs text-slate-100 placeholder-slate-400 w-full font-mono font-medium"
          />
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold px-1.5 py-0.5 rounded bg-slate-800 font-mono"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Dropdown Results */}
      {showDropdown && (results.length > 0 || (query.trim().length >= 2 && !isSearching)) && (
        <div className="absolute top-[52px] left-0 right-0 bg-[#0c0e17] rounded-xl shadow-2xl border border-slate-700/50 p-2 z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-150 custom-scrollbar font-mono">
          {results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
                >
                  {item.type === 'coordinate' ? (
                    <Navigation className="w-4 h-4 text-sky-400 shrink-0 rotate-45" />
                  ) : (
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-100 truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      {item.state ? `${item.state}, ` : ''}{item.country}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 text-slate-400">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-300">No locations found</span>
                <span className="text-[10px] text-slate-500 leading-normal">
                  Try typing "London", "Tokyo", "Paris", "Nagpur", "New York", or "51.50, -0.12".
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
