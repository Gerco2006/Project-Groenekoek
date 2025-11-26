import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map, ChevronDown, ChevronUp, Loader2, Gauge } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import "leaflet/dist/leaflet.css";

interface TrainVehicle {
  treinNummer: number;
  ritId: string;
  lat: number;
  lng: number;
  snelheid: number;
  richting: number;
  type: string;
}

interface TrainsMapResponse {
  payload: {
    treinen: TrainVehicle[];
  };
}

interface TrainLocationMapProps {
  trainNumber: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  showButton?: boolean;
}

function getTrainColor(type: string): string {
  const typeLower = type?.toLowerCase() || "";
  if (typeLower.includes("ic") || typeLower.includes("intercity")) {
    return "#FFC917";
  }
  if (typeLower.includes("spr") || typeLower.includes("sprinter")) {
    return "#003082";
  }
  return "#00A651";
}

function createTrainIcon(type: string, heading: number, isDark: boolean): L.DivIcon {
  const color = getTrainColor(type);
  const borderColor = isDark ? "#374151" : "#ffffff";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)";
  
  return L.divIcon({
    className: "train-marker",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${color};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px ${shadowColor};
      ">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="${color === "#FFC917" ? "#000" : "#fff"}" style="transform: rotate(${heading}deg);">
          <path d="M12 2L4 12l8 10 8-10L12 2z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function MapCenterer({ position }: { position: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, 12, { animate: true });
  }, [map, position]);
  
  return null;
}

function MapContent({ 
  train, 
  trainPosition, 
  isDark, 
  isLoading, 
  isFetching,
  setMapInstance 
}: {
  train: TrainVehicle | undefined;
  trainPosition: [number, number];
  isDark: boolean;
  isLoading: boolean;
  isFetching: boolean;
  setMapInstance: (map: L.Map | null) => void;
}) {
  if (isLoading) {
    return (
      <div className="h-[200px] flex items-center justify-center bg-muted/50">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!train) {
    return (
      <div className="h-[200px] flex items-center justify-center bg-muted/50">
        <div className="text-center text-muted-foreground">
          <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Geen GPS-locatie beschikbaar</p>
          <p className="text-xs mt-1">Deze trein heeft mogelijk geen GPS-apparatuur</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MapContainer
        center={trainPosition}
        zoom={12}
        className="h-[200px] w-full"
        ref={(map) => setMapInstance(map)}
        zoomControl={true}
      >
        <TileLayer
          key={isDark ? "dark" : "light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
        />
        <MapCenterer position={trainPosition} />
        <Marker
          position={trainPosition}
          icon={createTrainIcon(
            train.type || "",
            train.richting || 0,
            isDark
          )}
        />
      </MapContainer>

      <div 
        className="absolute bottom-3 left-3 z-[1000] rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2"
        style={{
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
        }}
        data-testid="text-speed-kmh"
        aria-label={`Snelheid: ${Math.round(train.snelheid)} kilometer per uur`}
      >
        <Gauge className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">
          {Math.round(train.snelheid)} km/u
        </span>
      </div>

      {isFetching && (
        <div className="absolute top-3 right-3 z-[1000]">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );
}

export default function TrainLocationMap({ 
  trainNumber, 
  isExpanded: controlledExpanded, 
  onToggle,
  showButton = true 
}: TrainLocationMapProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isMobile = useIsMobile();

  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  const handleToggle = isControlled ? onToggle : () => setInternalExpanded(!internalExpanded);

  const { data, isLoading, isFetching } = useQuery<TrainsMapResponse>({
    queryKey: ["/api/trains-map"],
    queryFn: async () => {
      const response = await fetch("/api/trains-map");
      if (!response.ok) {
        throw new Error("Failed to fetch train positions");
      }
      return response.json();
    },
    refetchInterval: isExpanded ? 30000 : false,
    staleTime: 15000,
    enabled: isExpanded,
  });

  const train = data?.payload?.treinen?.find(
    (t) => t.treinNummer.toString() === trainNumber
  );

  useEffect(() => {
    if (mapInstance && isExpanded) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 100);
    }
  }, [isExpanded, mapInstance]);

  const defaultCenter: [number, number] = [52.1326, 5.2913];
  const trainPosition: [number, number] = train ? [train.lat, train.lng] : defaultCenter;

  // Content-only mode (no button, controlled from parent)
  if (!showButton) {
    if (!isExpanded) return null;
    
    return (
      <div 
        id="location-map-content"
        role="region"
        className="rounded-lg overflow-hidden border relative"
      >
        <MapContent
          train={train}
          trainPosition={trainPosition}
          isDark={isDark}
          isLoading={isLoading}
          isFetching={isFetching}
          setMapInstance={setMapInstance}
        />
      </div>
    );
  }

  // Full mode with button
  return (
    <div className="px-4 py-1">
      <Button
        id="button-toggle-location-map"
        variant="outline"
        size={isMobile ? "sm" : "default"}
        onClick={handleToggle}
        className="w-full justify-between gap-2"
        data-testid="button-toggle-location-map"
        aria-expanded={isExpanded}
        aria-controls="location-map-content"
      >
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4" />
          <span>Toon locatie op kaart</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {isExpanded && (
        <div 
          id="location-map-content"
          role="region"
          aria-labelledby="button-toggle-location-map"
          className="mt-3 rounded-lg overflow-hidden border relative"
        >
          <MapContent
            train={train}
            trainPosition={trainPosition}
            isDark={isDark}
            isLoading={isLoading}
            isFetching={isFetching}
            setMapInstance={setMapInstance}
          />
        </div>
      )}
    </div>
  );
}
