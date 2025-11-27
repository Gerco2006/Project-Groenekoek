import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map, ChevronDown, ChevronUp, Loader2, Gauge } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import "leaflet/dist/leaflet.css";

const KM_PER_DEGREE_LAT = 111.32;
const CORRECTION_BLEND_FACTOR = 0.15;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

interface AnimatedTrainMarkerProps {
  position: [number, number];
  speed: number;
  heading: number;
  icon: L.DivIcon;
  zIndexOffset?: number;
}

function AnimatedTrainMarker({ position, speed, heading, icon, zIndexOffset = 0 }: AnimatedTrainMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const currentPosRef = useRef<[number, number]>(position);
  const targetPosRef = useRef<[number, number]>(position);
  const speedRef = useRef<number>(speed);
  const headingRef = useRef<number>(heading);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    targetPosRef.current = position;
    speedRef.current = speed;
    headingRef.current = heading;

    if (!isInitializedRef.current) {
      currentPosRef.current = position;
      isInitializedRef.current = true;
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      }
    }
  }, [position, speed, heading]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(icon);
    }
  }, [icon]);

  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      const marker = markerRef.current;
      if (!marker) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentSpeed = speedRef.current;
      const currentHeading = headingRef.current;
      const [currentLat, currentLng] = currentPosRef.current;
      const [targetLat, targetLng] = targetPosRef.current;

      if (currentSpeed > 1) {
        const headingRad = toRadians(currentHeading);
        const speedKmPerSec = currentSpeed / 3600;
        const distanceKm = speedKmPerSec * deltaTime;

        const deltaLat = (distanceKm * Math.cos(headingRad)) / KM_PER_DEGREE_LAT;
        const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos(toRadians(currentLat));
        const deltaLng = (distanceKm * Math.sin(headingRad)) / kmPerDegreeLng;

        let newLat = currentLat + deltaLat;
        let newLng = currentLng + deltaLng;

        const errorLat = targetLat - newLat;
        const errorLng = targetLng - newLng;
        newLat += errorLat * CORRECTION_BLEND_FACTOR * deltaTime;
        newLng += errorLng * CORRECTION_BLEND_FACTOR * deltaTime;

        currentPosRef.current = [newLat, newLng];
        marker.setLatLng([newLat, newLng]);
      } else {
        const errorLat = targetLat - currentLat;
        const errorLng = targetLng - currentLng;
        
        if (Math.abs(errorLat) > 0.00001 || Math.abs(errorLng) > 0.00001) {
          const blendFactor = Math.min(1, deltaTime * 2);
          const newLat = currentLat + errorLat * blendFactor;
          const newLng = currentLng + errorLng * blendFactor;
          currentPosRef.current = [newLat, newLng];
          marker.setLatLng([newLat, newLng]);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={currentPosRef.current}
      icon={icon}
      zIndexOffset={zIndexOffset}
    />
  );
}

function MapTouchHandler({ children }: { children: React.ReactNode }) {
  return (
    <div 
      data-vaul-no-drag
      className="h-full w-full"
    >
      {children}
    </div>
  );
}

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

interface JourneyStop {
  stop: {
    name: string;
    lat: number;
    lng: number;
    uicCode: string;
  };
  status: string;
  arrivals?: Array<{ plannedTime: string; actualTime?: string }>;
  departures?: Array<{ plannedTime: string; actualTime?: string }>;
}

interface JourneyResponse {
  payload: {
    stops: JourneyStop[];
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

function createStationIcon(isPassed: boolean, isNext: boolean, isDark: boolean): L.DivIcon {
  if (isNext) {
    return L.divIcon({
      className: "station-marker",
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border: 3px solid #1d4ed8;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }
  
  if (isPassed) {
    return L.divIcon({
      className: "station-marker",
      html: `
        <div style="
          width: 8px;
          height: 8px;
          background: ${isDark ? "rgba(107, 114, 128, 0.5)" : "rgba(156, 163, 175, 0.5)"};
          border: 1px solid ${isDark ? "rgba(75, 85, 99, 0.5)" : "rgba(107, 114, 128, 0.5)"};
          border-radius: 50%;
        "></div>
      `,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });
  }
  
  return L.divIcon({
    className: "station-marker",
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background: ${isDark ? "#1f2937" : "#ffffff"};
        border: 2px solid #3b82f6;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function MapCenterer({ position }: { position: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, 14, { animate: true });
  }, [map, position]);
  
  return null;
}

interface StopWithStatus {
  stop: JourneyStop;
  isPassed: boolean;
  isNext: boolean;
}

function MapContent({ 
  train, 
  trainPosition, 
  isDark, 
  isLoading, 
  isFetching,
  setMapInstance,
  stops 
}: {
  train: TrainVehicle | undefined;
  trainPosition: [number, number];
  isDark: boolean;
  isLoading: boolean;
  isFetching: boolean;
  setMapInstance: (map: L.Map | null) => void;
  stops: StopWithStatus[];
}) {
  const routePositions = useMemo(() => {
    return stops
      .filter(s => s.stop.stop?.lat && s.stop.stop?.lng)
      .map(s => [s.stop.stop.lat, s.stop.stop.lng] as [number, number]);
  }, [stops]);

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
      <MapTouchHandler>
        <MapContainer
          center={trainPosition}
          zoom={14}
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
          
          {/* Route line connecting stops */}
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: isDark ? "#6b7280" : "#9ca3af",
                weight: 3,
                opacity: 0.6,
                dashArray: "5, 10",
              }}
            />
          )}
          
          {/* Station markers */}
          {stops.map((stopData, index) => {
            const { stop, isPassed, isNext } = stopData;
            if (!stop.stop?.lat || !stop.stop?.lng || stop.status === "PASSING") return null;
            
            return (
              <Marker
                key={`${stop.stop.uicCode}-${index}`}
                position={[stop.stop.lat, stop.stop.lng]}
                icon={createStationIcon(isPassed, isNext, isDark)}
              />
            );
          })}
          
          {/* Animated train marker (on top) */}
          <AnimatedTrainMarker
            position={trainPosition}
            speed={train.snelheid || 0}
            heading={train.richting || 0}
            icon={createTrainIcon(
              train.type || "",
              train.richting || 0,
              isDark
            )}
            zIndexOffset={1000}
          />
        </MapContainer>
      </MapTouchHandler>

      <div 
        className="absolute bottom-3 left-3 z-[1000] rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2"
        style={{
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
    refetchInterval: isExpanded ? 20000 : false,
    staleTime: 15000,
    enabled: isExpanded,
  });

  const { data: journeyData } = useQuery<JourneyResponse>({
    queryKey: ["/api/journey", trainNumber],
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${trainNumber}`);
      if (!response.ok) {
        throw new Error("Failed to fetch journey");
      }
      return response.json();
    },
    staleTime: 60000,
    enabled: isExpanded && !!trainNumber,
  });

  const train = data?.payload?.treinen?.find(
    (t) => t.treinNummer.toString() === trainNumber
  );

  const stopsWithStatus = useMemo((): StopWithStatus[] => {
    const stops = journeyData?.payload?.stops || [];
    const stoppingStops = stops.filter((s: JourneyStop) => s.status !== "PASSING");
    const now = new Date();
    
    let nextStopIndex = -1;
    for (let i = 0; i < stoppingStops.length; i++) {
      const stop = stoppingStops[i];
      const departureTime = stop.departures?.[0]?.actualTime || stop.departures?.[0]?.plannedTime;
      const arrivalTime = stop.arrivals?.[0]?.actualTime || stop.arrivals?.[0]?.plannedTime;
      const relevantTime = departureTime || arrivalTime;
      
      if (relevantTime && new Date(relevantTime) > now) {
        nextStopIndex = i;
        break;
      }
    }
    
    return stoppingStops.map((stop: JourneyStop, index: number) => ({
      stop,
      isPassed: nextStopIndex === -1 ? true : index < nextStopIndex,
      isNext: index === nextStopIndex,
    }));
  }, [journeyData]);

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
          stops={stopsWithStatus}
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
            stops={stopsWithStatus}
          />
        </div>
      )}
    </div>
  );
}
