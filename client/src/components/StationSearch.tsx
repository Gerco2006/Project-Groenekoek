import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Star, X, Train, Bus, Building2 } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-is-mobile";

export interface PlaceSelection {
  name: string;
  type: 'station' | 'stop' | 'address' | 'poi';
  stationCode?: string;
  lat?: number;
  lng?: number;
}

interface StationSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (place: PlaceSelection | null) => void;
  placeholder?: string;
  testId?: string;
  showClearButton?: boolean;
}

interface Station {
  namen: {
    lang: string;
    middel: string;
    kort: string;
  };
  code: string;
  UICCode: string;
  stationType: string;
  land: string;
  lat?: number;
  lng?: number;
}

interface Place {
  name: string;
  type: string;
  lat?: number;
  lng?: number;
  stationCode?: string;
  countryCode?: string;
}

type SearchResult = {
  name: string;
  code?: string;
  type: 'station' | 'stop' | 'address' | 'poi';
  isStation: boolean;
  isFavorite: boolean;
  lat?: number;
  lng?: number;
};

const FAVORITE_STATIONS_KEY = "travnl-favorite-stations";

function getFavoriteStations(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITE_STATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavoriteStations(favorites: string[]) {
  localStorage.setItem(FAVORITE_STATIONS_KEY, JSON.stringify(favorites));
}

function getPlaceType(type: string): SearchResult['type'] {
  const lowerType = type.toLowerCase();
  if (lowerType === 'station' || lowerType.includes('station')) return 'station';
  if (lowerType === 'stop' || lowerType.includes('halte') || lowerType.includes('stop')) return 'stop';
  if (lowerType === 'address' || lowerType.includes('adres')) return 'address';
  return 'poi';
}

function getPlaceIcon(type: SearchResult['type']) {
  switch (type) {
    case 'station':
      return <Train className="w-4 h-4" />;
    case 'stop':
      return <Bus className="w-4 h-4" />;
    case 'address':
    case 'poi':
      return <Building2 className="w-4 h-4" />;
  }
}

function getPlaceLabel(type: SearchResult['type']) {
  switch (type) {
    case 'station':
      return null;
    case 'stop':
      return 'Halte';
    case 'address':
      return 'Adres';
    case 'poi':
      return 'Locatie';
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function StationSearch({ 
  label, 
  value, 
  onChange,
  onSelectPlace,
  placeholder = "Zoek station of plaats...",
  testId = "input-station",
  showClearButton = true
}: StationSearchProps) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [favoriteStations, setFavoriteStations] = useState<string[]>(() => getFavoriteStations());
  const isMobile = useIsMobile();
  
  const debouncedSearch = useDebounce(inputValue, 300);

  const handleClear = () => {
    setInputValue("");
    onChange("");
    onSelectPlace?.(null);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FAVORITE_STATIONS_KEY) {
        setFavoriteStations(getFavoriteStations());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const { data: stationsData } = useQuery<any>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      return response.json();
    },
  });

  const stations: Station[] = stationsData?.payload || [];
  
  const { data: placesData, isFetching: isSearching } = useQuery<any>({
    queryKey: ["/api/places", debouncedSearch],
    queryFn: async () => {
      const response = await fetch(`/api/places?q=${encodeURIComponent(debouncedSearch)}`);
      if (!response.ok) throw new Error("Failed to fetch places");
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 60000,
  });

  const places: Place[] = placesData?.payload || [];

  const toggleFavorite = (stationCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentFavorites = getFavoriteStations();
    const newFavorites = currentFavorites.includes(stationCode)
      ? currentFavorites.filter(code => code !== stationCode)
      : [...currentFavorites, stationCode];
    setFavoriteStations(newFavorites);
    saveFavoriteStations(newFavorites);
  };

  const isFavorite = (stationCode: string) => favoriteStations.includes(stationCode);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (focused) {
      updateDropdownPosition();
      
      const handleScroll = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [focused, inputValue]);

  useEffect(() => {
    if (!inputValue || inputValue.length < 2 || focused) return;

    const trimmedInput = inputValue.trim();
    const matchedStation = stations.find(s => 
      s.code.toLowerCase() === trimmedInput.toLowerCase() ||
      s.namen.kort.toLowerCase() === trimmedInput.toLowerCase()
    );

    if (matchedStation && matchedStation.namen.lang !== inputValue) {
      setInputValue(matchedStation.namen.lang);
      onChange(matchedStation.namen.lang);
    }
  }, [inputValue, focused, stations, onChange]);

  useEffect(() => {
    if (!inputValue || inputValue.length < 2 || focused) return;
    
    const trimmedInput = inputValue.trim().toLowerCase();
    
    const matchedStation = stations.find(s => 
      s.namen.lang.toLowerCase() === trimmedInput ||
      s.namen.kort.toLowerCase() === trimmedInput ||
      s.code.toLowerCase() === trimmedInput
    );
    
    if (matchedStation) {
      onSelectPlace?.({
        name: matchedStation.namen.lang,
        type: 'station',
        stationCode: matchedStation.code,
        lat: matchedStation.lat,
        lng: matchedStation.lng,
      });
      return;
    }
    
    const matchedPlace = places.find(p => p.name.toLowerCase() === trimmedInput);
    if (matchedPlace) {
      const type = getPlaceType(matchedPlace.type);
      onSelectPlace?.({
        name: matchedPlace.name,
        type,
        stationCode: matchedPlace.stationCode,
        lat: matchedPlace.lat,
        lng: matchedPlace.lng,
      });
    }
  }, [inputValue, focused, stations, places, onSelectPlace]);

  const favoriteStationsList = useMemo(() => {
    if (!focused || inputValue) return [];
    return stations.filter(station => favoriteStations.includes(station.code));
  }, [focused, inputValue, stations, favoriteStations]);

  const searchResults = useMemo((): SearchResult[] => {
    if (!inputValue || !focused) return [];
    
    const results: SearchResult[] = [];
    const seenNames = new Set<string>();
    
    for (const place of places) {
      const normalizedName = place.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;
      seenNames.add(normalizedName);
      
      const type = getPlaceType(place.type);
      const stationCode = place.stationCode;
      
      results.push({
        name: place.name,
        code: stationCode,
        type,
        isStation: type === 'station',
        isFavorite: stationCode ? favoriteStations.includes(stationCode) : false,
        lat: place.lat,
        lng: place.lng,
      });
    }
    
    const searchLower = inputValue.toLowerCase();
    for (const station of stations) {
      const normalizedName = station.namen.lang.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;
      
      const matches = 
        station.namen.lang.toLowerCase().includes(searchLower) ||
        station.namen.middel.toLowerCase().includes(searchLower) ||
        station.code.toLowerCase().includes(searchLower);
      
      if (matches) {
        seenNames.add(normalizedName);
        results.push({
          name: station.namen.lang,
          code: station.code,
          type: 'station',
          isStation: true,
          isFavorite: favoriteStations.includes(station.code),
          lat: station.lat,
          lng: station.lng,
        });
      }
    }
    
    results.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      const typeOrder = { station: 0, stop: 1, poi: 2, address: 3 };
      const aOrder = typeOrder[a.type];
      const bOrder = typeOrder[b.type];
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      const aStartsWith = a.name.toLowerCase().startsWith(searchLower);
      const bStartsWith = b.name.toLowerCase().startsWith(searchLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return a.name.localeCompare(b.name);
    });
    
    return results.slice(0, 15);
  }, [inputValue, focused, places, stations, favoriteStations]);

  const renderSearchResultItem = (result: SearchResult, idx: number) => {
    const typeLabel = getPlaceLabel(result.type);
    
    return (
      <div
        key={`${result.name}-${idx}`}
        className="flex items-center hover-elevate"
      >
        <button
          type="button"
          onClick={() => {
            setInputValue(result.name);
            onChange(result.name);
            onSelectPlace?.({
              name: result.name,
              type: result.type,
              stationCode: result.code,
              lat: result.lat,
              lng: result.lng,
            });
            setFocused(false);
          }}
          className="flex-1 text-left px-4 py-2 flex items-center gap-2"
          data-testid={`option-place-${idx}`}
        >
          <span className="text-muted-foreground flex-shrink-0">
            {getPlaceIcon(result.type)}
          </span>
          <span className="flex-1 truncate">{result.name}</span>
          {result.code && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
              {result.code}
            </span>
          )}
          {typeLabel && (
            <span className="text-xs text-muted-foreground/70 flex-shrink-0">
              {typeLabel}
            </span>
          )}
        </button>
        {result.isStation && result.code && (
          <button
            type="button"
            onClick={(e) => toggleFavorite(result.code!, e)}
            className="px-3 py-2 text-muted-foreground hover:text-yellow-500 transition-colors"
            data-testid={`button-favorite-${result.code}`}
          >
            <Star 
              className={`w-4 h-4 ${result.isFavorite ? 'text-yellow-500 fill-yellow-500' : ''}`} 
            />
          </button>
        )}
      </div>
    );
  };

  const renderFavoriteStationItem = (station: Station, idx: number) => (
    <div
      key={station.code}
      className="flex items-center hover-elevate"
    >
      <button
        type="button"
        onClick={() => {
          setInputValue(station.namen.lang);
          onChange(station.namen.lang);
          onSelectPlace?.({
            name: station.namen.lang,
            type: 'station',
            stationCode: station.code,
            lat: station.lat,
            lng: station.lng,
          });
          setFocused(false);
        }}
        className="flex-1 text-left px-4 py-2 flex items-center gap-2"
        data-testid={`option-station-${idx}`}
      >
        <span className="text-muted-foreground flex-shrink-0">
          <Train className="w-4 h-4" />
        </span>
        <span className="flex-1">{station.namen.lang}</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {station.code}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => toggleFavorite(station.code, e)}
        className="px-3 py-2 text-muted-foreground hover:text-yellow-500 transition-colors"
        data-testid={`button-favorite-${station.code}`}
      >
        <Star 
          className={`w-4 h-4 ${isFavorite(station.code) ? 'text-yellow-500 fill-yellow-500' : ''}`} 
        />
      </button>
    </div>
  );

  const showDropdown = focused && (
    (inputValue && (searchResults.length > 0 || isSearching)) ||
    (!inputValue && favoriteStationsList.length > 0)
  );

  const dropdownContent = showDropdown && (
    <div 
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999
      }}
    >
      <div className="relative bg-card/70 backdrop-blur-lg border rounded-lg shadow-lg max-h-72 overflow-auto">
        {!inputValue && favoriteStationsList.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/50">
              Favorieten
            </div>
            {favoriteStationsList.map((station, idx) => renderFavoriteStationItem(station, idx))}
          </>
        )}
        {inputValue && (
          <>
            {isSearching && searchResults.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Zoeken...
              </div>
            )}
            {searchResults.length > 0 && (
              <>
                {searchResults.filter(r => r.isFavorite).length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                      Favorieten
                    </div>
                    {searchResults.filter(r => r.isFavorite).map((result, idx) => 
                      renderSearchResultItem(result, idx)
                    )}
                    <div className="border-t border-border/50 my-1" />
                  </>
                )}
                {searchResults.filter(r => !r.isFavorite).map((result, idx) => 
                  renderSearchResultItem(result, searchResults.filter(r => r.isFavorite).length + idx)
                )}
              </>
            )}
            {!isSearching && inputValue.length >= 2 && searchResults.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Geen resultaten gevonden
              </div>
            )}
          </>
        )}
      </div>
      {((inputValue && searchResults.length >= 10) || (!inputValue && favoriteStationsList.length >= 5)) && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card/40 via-card/20 to-transparent pointer-events-none rounded-b-lg" />
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-2 relative">
        <Label htmlFor={testId} className="text-sm font-medium">
          {label}
        </Label>
        <div className="relative" ref={inputRef}>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            id={testId}
            data-testid={testId}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={placeholder}
            className={`pl-9 ${isMobile && inputValue && showClearButton ? 'pr-9' : ''}`}
          />
          {isMobile && inputValue && showClearButton && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground z-10"
              data-testid={`${testId}-clear`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
