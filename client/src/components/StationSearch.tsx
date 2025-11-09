import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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

export default function StationSearch({ 
  label, 
  value, 
  onChange, 
  placeholder = "Zoek station...",
  testId = "input-station"
}: StationSearchProps) {
  const [focused, setFocused] = useState(false);

  const { data: stationsData } = useQuery<any>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      return response.json();
    },
  });

  const stations: Station[] = stationsData?.payload || [];

  const filteredStations = value && focused
    ? stations
        .filter(station => 
          station.namen.lang.toLowerCase().includes(value.toLowerCase()) ||
          station.namen.middel.toLowerCase().includes(value.toLowerCase()) ||
          station.code.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-2 relative">
      <Label htmlFor={testId} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          id={testId}
          data-testid={testId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className="pl-9 backdrop-blur-sm bg-card/50"
        />
        
        {filteredStations.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
            {filteredStations.map((station, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(station.code);
                  setFocused(false);
                }}
                className="w-full text-left px-4 py-2 hover-elevate flex items-center justify-between"
                data-testid={`option-station-${idx}`}
              >
                <span>{station.namen.lang}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {station.code}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
