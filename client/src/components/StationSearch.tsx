import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";

interface StationSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
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
}

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

export default function StationSearch({ 
  label, 
  value, 
  onChange, 
  placeholder = "Zoek station...",
  testId = "input-station"
}: StationSearchProps) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [favoriteStations, setFavoriteStations] = useState<string[]>(() => getFavoriteStations());

  const { data: stationsData } = useQuery<any>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      return response.json();
    },
  });

  const stations: Station[] = stationsData?.payload || [];

  const toggleFavorite = (stationCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newFavorites = favoriteStations.includes(stationCode)
      ? favoriteStations.filter(code => code !== stationCode)
      : [...favoriteStations, stationCode];
    setFavoriteStations(newFavorites);
    saveFavoriteStations(newFavorites);
  };

  const isFavorite = (stationCode: string) => favoriteStations.includes(stationCode);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (focused && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
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

  const favoriteStationsList = focused && !inputValue
    ? stations.filter(station => favoriteStations.includes(station.code))
    : [];

  const filteredStations = inputValue && focused
    ? stations
        .filter(station => 
          station.namen.lang.toLowerCase().includes(inputValue.toLowerCase()) ||
          station.namen.middel.toLowerCase().includes(inputValue.toLowerCase()) ||
          station.code.toLowerCase().includes(inputValue.toLowerCase())
        )
        .sort((a, b) => {
          const aIsFavorite = favoriteStations.includes(a.code);
          const bIsFavorite = favoriteStations.includes(b.code);
          
          if (aIsFavorite && !bIsFavorite) return -1;
          if (!aIsFavorite && bIsFavorite) return 1;
          
          const searchLower = inputValue.toLowerCase();
          const aCodeMatch = a.code.toLowerCase().startsWith(searchLower);
          const bCodeMatch = b.code.toLowerCase().startsWith(searchLower);
          
          if (aCodeMatch && !bCodeMatch) return -1;
          if (!aCodeMatch && bCodeMatch) return 1;
          
          const aCodeIncludes = a.code.toLowerCase().includes(searchLower);
          const bCodeIncludes = b.code.toLowerCase().includes(searchLower);
          
          if (aCodeIncludes && !bCodeIncludes) return -1;
          if (!aCodeIncludes && bCodeIncludes) return 1;
          
          return a.namen.lang.localeCompare(b.namen.lang);
        })
        .slice(0, 10)
    : [];

  const displayStations = inputValue ? filteredStations : favoriteStationsList;
  
  const matchingFavorites = inputValue 
    ? filteredStations.filter(s => isFavorite(s.code))
    : [];
  const nonFavorites = inputValue 
    ? filteredStations.filter(s => !isFavorite(s.code))
    : [];

  const renderStationItem = (station: Station, idx: number) => (
    <div
      key={station.code}
      className="flex items-center hover-elevate"
    >
      <button
        type="button"
        onClick={() => {
          setInputValue(station.namen.lang);
          onChange(station.namen.lang);
          setFocused(false);
        }}
        className="flex-1 text-left px-4 py-2 flex items-center gap-2"
        data-testid={`option-station-${idx}`}
      >
        {isFavorite(station.code) && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
        )}
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

  const dropdownContent = displayStations.length > 0 && focused && (
    <div 
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999
      }}
    >
      <div className="relative bg-card/70 backdrop-blur-lg border rounded-lg shadow-lg max-h-60 overflow-auto">
        {!inputValue && favoriteStationsList.length > 0 && (
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/50">
            Favorieten
          </div>
        )}
        {!inputValue ? (
          displayStations.map((station, idx) => renderStationItem(station, idx))
        ) : (
          <>
            {matchingFavorites.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  Favorieten
                </div>
                {matchingFavorites.map((station, idx) => renderStationItem(station, idx))}
              </>
            )}
            {matchingFavorites.length > 0 && nonFavorites.length > 0 && (
              <div className="border-t border-border/50 my-1" />
            )}
            {nonFavorites.map((station, idx) => renderStationItem(station, matchingFavorites.length + idx))}
          </>
        )}
      </div>
      {displayStations.length >= 10 && (
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
            className="pl-9"
          />
        </div>
      </div>
      {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
