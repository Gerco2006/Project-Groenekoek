import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map, ChevronDown, ChevronUp, Loader2, Gauge, Crosshair } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import "leaflet/dist/leaflet.css";

const KM_PER_DEGREE_LAT = 111.32;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function distanceBetweenPoints(p1: [number, number], p2: [number, number]): number {
  const latDiff = p2[0] - p1[0];
  const lngDiff = p2[1] - p1[1];
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

function findNearestSegmentOnRoute(
  position: [number, number],
  route: [number, number][]
): { segmentIndex: number; projectedPoint: [number, number]; progressOnSegment: number } {
  if (route.length < 2) {
    return { segmentIndex: 0, projectedPoint: position, progressOnSegment: 0 };
  }

  let nearestSegment = 0;
  let nearestPoint: [number, number] = route[0];
  let nearestDistance = Infinity;
  let nearestProgress = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    
    const abLat = b[0] - a[0];
    const abLng = b[1] - a[1];
    const apLat = position[0] - a[0];
    const apLng = position[1] - a[1];
    
    const abLenSq = abLat * abLat + abLng * abLng;
    let t = 0;
    
    if (abLenSq > 0) {
      t = Math.max(0, Math.min(1, (apLat * abLat + apLng * abLng) / abLenSq));
    }
    
    const projLat = a[0] + t * abLat;
    const projLng = a[1] + t * abLng;
    const projected: [number, number] = [projLat, projLng];
    
    const dist = distanceBetweenPoints(position, projected);
    
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestSegment = i;
      nearestPoint = projected;
      nearestProgress = t;
    }
  }

  return { segmentIndex: nearestSegment, projectedPoint: nearestPoint, progressOnSegment: nearestProgress };
}

function moveAlongRoute(
  currentPos: [number, number],
  route: [number, number][],
  distanceToMove: number,
  currentSegment: number,
  currentProgress: number
): { newPos: [number, number]; newSegment: number; newProgress: number } {
  if (route.length < 2) {
    return { newPos: currentPos, newSegment: 0, newProgress: 0 };
  }

  let segment = currentSegment;
  let progress = currentProgress;
  let remainingDistance = distanceToMove;

  while (remainingDistance > 0 && segment < route.length - 1) {
    const a = route[segment];
    const b = route[segment + 1];
    
    const segmentLength = distanceBetweenPoints(a, b);
    const remainingInSegment = segmentLength * (1 - progress);
    
    if (remainingDistance <= remainingInSegment) {
      progress += (remainingDistance / segmentLength);
      remainingDistance = 0;
    } else {
      remainingDistance -= remainingInSegment;
      segment++;
      progress = 0;
    }
  }

  if (segment >= route.length - 1) {
    segment = route.length - 2;
    progress = 1;
  }

  const a = route[segment];
  const b = route[segment + 1];
  const newLat = a[0] + progress * (b[0] - a[0]);
  const newLng = a[1] + progress * (b[1] - a[1]);

  return { newPos: [newLat, newLng], newSegment: segment, newProgress: progress };
}

interface AnimatedTrainMarkerProps {
  position: [number, number];
  speed: number;
  heading: number;
  icon: L.DivIcon;
  zIndexOffset?: number;
  onPositionUpdate?: (pos: [number, number]) => void;
  route?: [number, number][];
}

function AnimatedTrainMarker({ position, speed, heading, icon, zIndexOffset = 0, onPositionUpdate, route = [] }: AnimatedTrainMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const currentPosRef = useRef<[number, number]>(position);
  const speedRef = useRef<number>(speed);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const isInitializedRef = useRef<boolean>(false);
  const gpsPositionRef = useRef<[number, number]>(position);
  const routeRef = useRef<[number, number][]>(route);
  const currentSegmentRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const lastRouteRef = useRef<[number, number][]>([]);

  useEffect(() => {
    gpsPositionRef.current = position;
    speedRef.current = speed;
    
    const routeChanged = route.length !== lastRouteRef.current.length || 
      (route.length > 0 && lastRouteRef.current.length > 0 && 
       (route[0][0] !== lastRouteRef.current[0][0] || route[0][1] !== lastRouteRef.current[0][1]));
    
    if (routeChanged && route.length >= 2) {
      const { segmentIndex, projectedPoint, progressOnSegment } = findNearestSegmentOnRoute(currentPosRef.current, route);
      currentSegmentRef.current = segmentIndex;
      currentProgressRef.current = progressOnSegment;
    }
    
    routeRef.current = route;
    lastRouteRef.current = route;

    if (!isInitializedRef.current) {
      if (route.length >= 2) {
        const { projectedPoint } = findNearestSegmentOnRoute(position, route);
        currentPosRef.current = projectedPoint;
      } else {
        currentPosRef.current = position;
      }
      isInitializedRef.current = true;
      if (markerRef.current) {
        markerRef.current.setLatLng(currentPosRef.current);
      }
      onPositionUpdate?.(currentPosRef.current);
    }
  }, [position, speed, route, onPositionUpdate]);

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
      if (!marker || deltaTime > 1) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentSpeed = speedRef.current;
      const currentRoute = routeRef.current;
      const [currentLat, currentLng] = currentPosRef.current;

      if (currentSpeed > 2 && currentRoute.length >= 2) {
        const speedKmPerSec = currentSpeed / 3600;
        const distanceKm = speedKmPerSec * deltaTime;
        const distanceDegrees = distanceKm / KM_PER_DEGREE_LAT;

        const { newPos, newSegment, newProgress } = moveAlongRoute(
          [currentLat, currentLng],
          currentRoute,
          distanceDegrees,
          currentSegmentRef.current,
          currentProgressRef.current
        );

        currentSegmentRef.current = newSegment;
        currentProgressRef.current = newProgress;
        currentPosRef.current = newPos;
        marker.setLatLng(newPos);
        onPositionUpdate?.(newPos);
      } else if (currentSpeed > 2) {
        const headingRad = toRadians(heading);
        const speedKmPerSec = currentSpeed / 3600;
        const distanceKm = speedKmPerSec * deltaTime;

        const deltaLat = (distanceKm * Math.cos(headingRad)) / KM_PER_DEGREE_LAT;
        const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos(toRadians(currentLat));
        const deltaLng = (distanceKm * Math.sin(headingRad)) / kmPerDegreeLng;

        const newLat = currentLat + deltaLat;
        const newLng = currentLng + deltaLng;

        currentPosRef.current = [newLat, newLng];
        marker.setLatLng([newLat, newLng]);
        onPositionUpdate?.([newLat, newLng]);
      } else {
        const [gpsLat, gpsLng] = gpsPositionRef.current;
        const errorLat = gpsLat - currentLat;
        const errorLng = gpsLng - currentLng;
        
        if (Math.abs(errorLat) > 0.00001 || Math.abs(errorLng) > 0.00001) {
          const blendFactor = Math.min(1, deltaTime * 3);
          const newLat = currentLat + errorLat * blendFactor;
          const newLng = currentLng + errorLng * blendFactor;
          currentPosRef.current = [newLat, newLng];
          marker.setLatLng([newLat, newLng]);
          onPositionUpdate?.([newLat, newLng]);
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
  }, [onPositionUpdate, heading]);

  return (
    <Marker
      ref={markerRef}
      position={currentPosRef.current}
      icon={icon}
      zIndexOffset={zIndexOffset}
    />
  );
}

interface MapFollowerProps {
  trainPosition: [number, number];
  isFollowing: boolean;
  onUserInteraction: () => void;
}

function MapFollower({ trainPosition, isFollowing, onUserInteraction }: MapFollowerProps) {
  const map = useMap();
  const isFirstRenderRef = useRef(true);

  useMapEvents({
    dragstart: () => onUserInteraction(),
    zoomstart: () => {
      if (!isFirstRenderRef.current) {
        onUserInteraction();
      }
    },
  });

  useEffect(() => {
    if (isFirstRenderRef.current) {
      map.setView(trainPosition, 14, { animate: false });
      isFirstRenderRef.current = false;
      return;
    }

    if (isFollowing && trainPosition[0] && trainPosition[1]) {
      map.setView(trainPosition, map.getZoom(), { animate: true, duration: 0.3 });
    }
  }, [map, trainPosition, isFollowing]);

  return null;
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

interface StopWithStatus {
  stop: JourneyStop;
  isPassed: boolean;
  isNext: boolean;
}

interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][] | number[][][];
  };
  properties: Record<string, any>;
}

interface SpoorkaartResponse {
  type: string;
  features: GeoJSONFeature[];
}

function findNearestTrackSegment(
  position: [number, number],
  features: GeoJSONFeature[],
  heading: number,
  maxDistance: number = 0.01
): [number, number][] {
  let nearestTrack: [number, number][] = [];
  let nearestDistance = Infinity;
  let nearestSegmentIndex = 0;

  for (const feature of features) {
    if (feature.geometry.type !== "LineString" && feature.geometry.type !== "MultiLineString") {
      continue;
    }

    const lineStrings: number[][][] = feature.geometry.type === "MultiLineString"
      ? feature.geometry.coordinates as number[][][]
      : [feature.geometry.coordinates as number[][]];

    for (const coords of lineStrings) {
      for (let i = 0; i < coords.length - 1; i++) {
        const a: [number, number] = [coords[i][1], coords[i][0]];
        const b: [number, number] = [coords[i + 1][1], coords[i + 1][0]];
        
        const abLat = b[0] - a[0];
        const abLng = b[1] - a[1];
        const apLat = position[0] - a[0];
        const apLng = position[1] - a[1];
        
        const abLenSq = abLat * abLat + abLng * abLng;
        let t = 0;
        
        if (abLenSq > 0) {
          t = Math.max(0, Math.min(1, (apLat * abLat + apLng * abLng) / abLenSq));
        }
        
        const projLat = a[0] + t * abLat;
        const projLng = a[1] + t * abLng;
        
        const dist = Math.sqrt(
          Math.pow(position[0] - projLat, 2) + Math.pow(position[1] - projLng, 2)
        );
        
        if (dist < nearestDistance && dist < maxDistance) {
          nearestDistance = dist;
          nearestTrack = coords.map(c => [c[1], c[0]] as [number, number]);
          nearestSegmentIndex = i;
        }
      }
    }
  }

  if (nearestTrack.length < 2) {
    return [];
  }

  const segmentStart = nearestTrack[nearestSegmentIndex];
  const segmentEnd = nearestTrack[Math.min(nearestSegmentIndex + 1, nearestTrack.length - 1)];
  
  const trackHeading = Math.atan2(
    segmentEnd[1] - segmentStart[1],
    segmentEnd[0] - segmentStart[0]
  ) * (180 / Math.PI);
  
  const normalizedTrackHeading = ((trackHeading % 360) + 360) % 360;
  const normalizedTrainHeading = ((heading % 360) + 360) % 360;
  
  let headingDiff = Math.abs(normalizedTrackHeading - normalizedTrainHeading);
  if (headingDiff > 180) headingDiff = 360 - headingDiff;
  
  if (headingDiff > 90) {
    nearestTrack = nearestTrack.slice().reverse();
  }

  return nearestTrack;
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
  const [isFollowing, setIsFollowing] = useState(true);
  const [animatedPosition, setAnimatedPosition] = useState<[number, number]>(trainPosition);

  const { data: spoorkaartData } = useQuery<{ payload: SpoorkaartResponse }>({
    queryKey: ["/api/spoorkaart"],
    queryFn: async () => {
      const response = await fetch("/api/spoorkaart");
      if (!response.ok) {
        throw new Error("Failed to fetch railway tracks");
      }
      return response.json();
    },
    staleTime: 86400000,
    gcTime: 86400000,
  });

  const trainHeading = train?.richting || 0;

  const trackRoute = useMemo(() => {
    if (!spoorkaartData?.payload?.features || !trainPosition[0] || !trainPosition[1]) {
      return [];
    }
    return findNearestTrackSegment(trainPosition, spoorkaartData.payload.features, trainHeading);
  }, [spoorkaartData, trainPosition, trainHeading]);

  const handlePositionUpdate = useCallback((pos: [number, number]) => {
    setAnimatedPosition(pos);
  }, []);

  const handleUserInteraction = useCallback(() => {
    setIsFollowing(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setIsFollowing(true);
  }, []);

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
          <MapFollower 
            trainPosition={animatedPosition} 
            isFollowing={isFollowing} 
            onUserInteraction={handleUserInteraction}
          />
          
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
            onPositionUpdate={handlePositionUpdate}
            route={trackRoute}
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

      {!isFollowing && (
        <button
          className="absolute bottom-3 right-3 z-[1000] rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={handleRecenter}
          data-testid="button-recenter-map"
        >
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Centreren</span>
        </button>
      )}

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
    refetchInterval: isExpanded ? 15000 : false,
    staleTime: 10000,
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
