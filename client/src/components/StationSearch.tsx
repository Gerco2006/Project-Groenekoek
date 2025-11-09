import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useState } from "react";

interface StationSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}

interface Station {
  name: string;
  code: string;
}

export default function StationSearch({ 
  label, 
  value, 
  onChange, 
  placeholder = "Zoek station...",
  testId = "input-station"
}: StationSearchProps) {
  const [focused, setFocused] = useState(false);

  const stations: Station[] = [
    { name: "Amsterdam Centraal", code: "ASD" },
    { name: "Amsterdam Sloterdijk", code: "ASL" },
    { name: "Rotterdam Centraal", code: "RTD" },
    { name: "Utrecht Centraal", code: "UT" },
    { name: "Den Haag Centraal", code: "GVC" },
    { name: "Schiphol Airport", code: "SPL" },
    { name: "Eindhoven Centraal", code: "EHV" },
    { name: "Groningen", code: "GN" },
    { name: "Maastricht", code: "MT" },
    { name: "Leiden Centraal", code: "LDN" },
    { name: "Delft", code: "DT" },
    { name: "Haarlem", code: "HLM" },
    { name: "Arnhem Centraal", code: "AH" },
    { name: "Tilburg", code: "TB" },
    { name: "Breda", code: "BD" },
    { name: "Nijmegen", code: "NM" },
    { name: "Zwolle", code: "ZWL" },
    { name: "Amersfoort Centraal", code: "AMF" },
  ];

  const filteredStations = value && focused
    ? stations.filter(station => 
        station.name.toLowerCase().includes(value.toLowerCase()) ||
        station.code.toLowerCase().includes(value.toLowerCase())
      )
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
                  onChange(station.name);
                  setFocused(false);
                }}
                className="w-full text-left px-4 py-2 hover-elevate flex items-center justify-between"
                data-testid={`option-station-${idx}`}
              >
                <span>{station.name}</span>
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
