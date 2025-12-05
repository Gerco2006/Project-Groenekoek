import { useMemo, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery } from "@tanstack/react-query";
import { Crosshair } from "lucide-react";
import type { TripLeg } from "@shared/schema";
import "leaflet/dist/leaflet.css";

interface IntermediateStop {
  name: string;
  lat?: number;
  lng?: number;
}

interface TripRouteMapProps {
  legs: TripLeg[];
  compact?: boolean;
  embedded?: boolean;
  intermediateStops?: IntermediateStop[];
}

interface Station {
  name: string;
  lat: number;
  lng: number;
  type: "start" | "end" | "transfer";
}

interface GeoJSONFeature {
  geometry: {
    type: string;
    coordinates: number[][] | number[][][];
  };
}

interface TrackGraph {
  neighbors: Record<string, string[]>;
  nodeCoords: Record<string, [number, number]>;
}

function distanceBetweenPoints(p1: [number, number], p2: [number, number]): number {
  const latDiff = p2[0] - p1[0];
  const lngDiff = p2[1] - p1[1];
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

function buildTrackGraph(features: GeoJSONFeature[]): TrackGraph {
  const neighbors: Record<string, string[]> = {};
  const nodeCoords: Record<string, [number, number]> = {};
  const tolerance = 0.0005;
  
  const roundCoord = (val: number) => Math.round(val / tolerance) * tolerance;
  const coordKey = (lat: number, lng: number) => `${roundCoord(lat)},${roundCoord(lng)}`;
  
  for (const feature of features) {
    if (feature.geometry.type !== "LineString" && feature.geometry.type !== "MultiLineString") {
      continue;
    }
    
    const lineStrings: number[][][] = feature.geometry.type === "MultiLineString"
      ? feature.geometry.coordinates as number[][][]
      : [feature.geometry.coordinates as number[][]];
    
    for (const coords of lineStrings) {
      if (coords.length < 2) continue;
      
      for (let i = 0; i < coords.length; i++) {
        const key = coordKey(coords[i][1], coords[i][0]);
        if (!nodeCoords[key]) {
          nodeCoords[key] = [coords[i][1], coords[i][0]];
        }
        if (!neighbors[key]) neighbors[key] = [];
        
        if (i > 0) {
          const prevKey = coordKey(coords[i-1][1], coords[i-1][0]);
          if (!neighbors[key].includes(prevKey)) neighbors[key].push(prevKey);
        }
        if (i < coords.length - 1) {
          const nextKey = coordKey(coords[i+1][1], coords[i+1][0]);
          if (!neighbors[key].includes(nextKey)) neighbors[key].push(nextKey);
        }
      }
    }
  }
  
  return { neighbors, nodeCoords };
}

function findNearestGraphNode(
  point: [number, number],
  graph: TrackGraph,
  maxDistance: number
): string | null {
  let nearestKey: string | null = null;
  let nearestDist = Infinity;
  
  const keys = Object.keys(graph.neighbors);
  for (const key of keys) {
    const coords = graph.nodeCoords[key];
    if (!coords) continue;
    const dist = distanceBetweenPoints(point, coords);
    if (dist < nearestDist && dist < maxDistance) {
      nearestDist = dist;
      nearestKey = key;
    }
  }
  
  return nearestKey;
}

function findPathAStar(
  graph: TrackGraph,
  startKey: string,
  endKey: string,
  endCoord: [number, number],
  maxNodes: number = 5000
): [number, number][] {
  if (startKey === endKey) return [];
  
  const startCoord = graph.nodeCoords[startKey];
  if (!startCoord) return [];
  
  const gScore: Record<string, number> = { [startKey]: 0 };
  const fScore: Record<string, number> = {};
  fScore[startKey] = distanceBetweenPoints(startCoord, endCoord);
  
  const cameFrom: Record<string, string> = {};
  const openSet: string[] = [startKey];
  const closedSet: Record<string, boolean> = {};
  let nodesVisited = 0;
  
  while (openSet.length > 0 && nodesVisited < maxNodes) {
    openSet.sort((a, b) => (fScore[a] || Infinity) - (fScore[b] || Infinity));
    const current = openSet.shift()!;
    nodesVisited++;
    
    if (current === endKey) {
      const path: string[] = [current];
      let node = current;
      while (cameFrom[node]) {
        node = cameFrom[node];
        path.unshift(node);
      }
      
      return path
        .map(key => graph.nodeCoords[key])
        .filter((coord): coord is [number, number] => coord !== undefined);
    }
    
    closedSet[current] = true;
    const neighbors = graph.neighbors[current];
    if (!neighbors) continue;
    
    const currentCoord = graph.nodeCoords[current];
    
    for (const neighbor of neighbors) {
      if (closedSet[neighbor]) continue;
      
      const neighborCoord = graph.nodeCoords[neighbor];
      if (!neighborCoord) continue;
      
      const edgeDist = currentCoord ? distanceBetweenPoints(currentCoord, neighborCoord) : 0.001;
      const tentativeG = (gScore[current] || 0) + edgeDist;
      
      if (tentativeG < (gScore[neighbor] || Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + distanceBetweenPoints(neighborCoord, endCoord);
        
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  
  return [];
}

function findRouteBetweenStops(
  stops: Array<{ lat: number; lng: number }>,
  features: GeoJSONFeature[]
): [number, number][] {
  if (stops.length < 2 || features.length === 0) {
    return stops.map(s => [s.lat, s.lng] as [number, number]);
  }
  
  const graph = buildTrackGraph(features);
  const route: [number, number][] = [];
  const maxSearchDistance = 0.05;
  
  for (let i = 0; i < stops.length - 1; i++) {
    const start: [number, number] = [stops[i].lat, stops[i].lng];
    const end: [number, number] = [stops[i + 1].lat, stops[i + 1].lng];
    
    const startNode = findNearestGraphNode(start, graph, maxSearchDistance);
    const endNode = findNearestGraphNode(end, graph, maxSearchDistance);
    
    if (startNode && endNode && startNode !== endNode) {
      const pathSegment = findPathAStar(graph, startNode, endNode, end, 15000);
      
      if (pathSegment.length > 0) {
        if (route.length === 0) {
          route.push(start);
        }
        route.push(...pathSegment);
        route.push(end);
      } else {
        if (route.length === 0) {
          route.push(start);
        }
        route.push(end);
      }
    } else {
      if (route.length === 0) {
        route.push(start);
      }
      route.push(end);
    }
  }
  
  return route;
}

type LabelPlacement = 'top' | 'bottom' | 'left' | 'right';

function calculateAllLabelPlacements(
  stations: Station[],
  routePositions: [number, number][]
): LabelPlacement[] {
  if (stations.length < 2) {
    return stations.map(() => 'bottom');
  }
  
  const placements: LabelPlacement[] = [];
  
  for (let stationIndex = 0; stationIndex < stations.length; stationIndex++) {
    const station = stations[stationIndex];
    const stationPos: [number, number] = [station.lat, station.lng];
    
    let nearestSegmentIdx = -1;
    let minDist = Infinity;
    
    for (let i = 0; i < routePositions.length - 1; i++) {
      const p1 = routePositions[i];
      const p2 = routePositions[i + 1];
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;
      const dist = Math.sqrt(
        Math.pow(stationPos[0] - midLat, 2) + 
        Math.pow(stationPos[1] - midLng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearestSegmentIdx = i;
      }
    }
    
    let preferredPlacement: LabelPlacement = 'bottom';
    
    if (nearestSegmentIdx !== -1 && routePositions.length >= 2) {
      const p1 = routePositions[nearestSegmentIdx];
      const p2 = routePositions[Math.min(nearestSegmentIdx + 1, routePositions.length - 1)];
      
      const dx = p2[1] - p1[1];
      const dy = p2[0] - p1[0];
      
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      if (absDx > absDy) {
        preferredPlacement = dy > 0 ? 'bottom' : 'top';
      } else {
        preferredPlacement = dx > 0 ? 'left' : 'right';
      }
    }
    
    let finalPlacement = preferredPlacement;
    
    if (stationIndex > 0) {
      const prevStation = stations[stationIndex - 1];
      const prevPlacement = placements[stationIndex - 1];
      
      const latDiff = Math.abs(station.lat - prevStation.lat);
      const lngDiff = Math.abs(station.lng - prevStation.lng);
      const stationsClose = latDiff < 0.05 && lngDiff < 0.05;
      
      if (stationsClose && prevPlacement === preferredPlacement) {
        const opposites: Record<LabelPlacement, LabelPlacement> = {
          'top': 'bottom',
          'bottom': 'top',
          'left': 'right',
          'right': 'left'
        };
        finalPlacement = opposites[preferredPlacement];
      }
    }
    
    placements.push(finalPlacement);
  }
  
  return placements;
}

function createStationIcon(station: Station, isDark: boolean, placement: LabelPlacement = 'bottom'): L.DivIcon {
  let bgColor = '#f97316';
  let size = 10;
  
  if (station.type === "start") {
    bgColor = '#22c55e';
    size = 12;
  } else if (station.type === "end") {
    bgColor = '#ef4444';
    size = 12;
  }
  
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const labelBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const borderColor = isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)';
  const shadow = isDark 
    ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)';
  const arrowColor = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  
  let labelStyle = '';
  let arrowStyle = '';
  
  switch (placement) {
    case 'top':
      labelStyle = `
        bottom: ${size + 8}px;
        left: 50%;
        transform: translateX(-50%);
      `;
      arrowStyle = `
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid ${arrowColor};
      `;
      break;
    case 'left':
      labelStyle = `
        right: ${size + 8}px;
        top: 50%;
        transform: translateY(-50%);
      `;
      arrowStyle = `
        position: absolute;
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-left: 5px solid ${arrowColor};
      `;
      break;
    case 'right':
      labelStyle = `
        left: ${size + 8}px;
        top: 50%;
        transform: translateY(-50%);
      `;
      arrowStyle = `
        position: absolute;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-right: 5px solid ${arrowColor};
      `;
      break;
    case 'bottom':
    default:
      labelStyle = `
        top: ${size + 8}px;
        left: 50%;
        transform: translateX(-50%);
      `;
      arrowStyle = `
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 5px solid ${arrowColor};
      `;
      break;
  }
  
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: 2px solid ${isDark ? '#1e293b' : '#ffffff'};
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          ${labelStyle}
          white-space: nowrap;
          padding: 3px 8px;
          background: ${labelBg};
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          border: 1px solid ${borderColor};
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          color: ${textColor};
          box-shadow: ${shadow};
          z-index: 1000;
        ">
          <div style="${arrowStyle}"></div>
          ${station.name}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapResizeHandler() {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    const container = map.getContainer();
    containerRef.current = container;
    
    const handleResize = () => {
      map.invalidateSize();
    };
    
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 300);
    setTimeout(handleResize, 500);
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);
  
  return null;
}

function FitBounds({ stations, recenterTrigger }: { stations: Station[]; recenterTrigger: number }) {
  const map = useMap();
  const fittedRef = useRef(false);
  const lastRecenterRef = useRef(0);
  
  useEffect(() => {
    if (stations.length > 0 && !fittedRef.current) {
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      fittedRef.current = true;
      
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [stations, map]);
  
  useEffect(() => {
    if (recenterTrigger > 0 && recenterTrigger !== lastRecenterRef.current && stations.length > 0) {
      lastRecenterRef.current = recenterTrigger;
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: true });
    }
  }, [recenterTrigger, stations, map]);
  
  return null;
}

function MapMoveTracker({ onMoved }: { onMoved: (moved: boolean) => void }) {
  const initialBoundsRef = useRef<L.LatLngBounds | null>(null);
  
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      if (!initialBoundsRef.current) {
        initialBoundsRef.current = map.getBounds();
        return;
      }
      
      const currentBounds = map.getBounds();
      const initialCenter = initialBoundsRef.current.getCenter();
      const currentCenter = currentBounds.getCenter();
      
      const latDiff = Math.abs(currentCenter.lat - initialCenter.lat);
      const lngDiff = Math.abs(currentCenter.lng - initialCenter.lng);
      
      const hasMoved = latDiff > 0.001 || lngDiff > 0.001;
      onMoved(hasMoved);
    },
    zoomend: (e) => {
      onMoved(true);
    }
  });
  
  return null;
}

export default function TripRouteMap({ legs, compact = false, embedded = false, intermediateStops }: TripRouteMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mapHeight = compact ? "h-[150px]" : "h-[200px]";
  const [hasMoved, setHasMoved] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Early return if legs is empty or undefined
  if (!legs || legs.length === 0) {
    return (
      <div className={`${mapHeight} rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm`}>
        Geen routegegevens beschikbaar
      </div>
    );
  }

  const handleRecenter = () => {
    setRecenterTrigger(prev => prev + 1);
    setHasMoved(false);
  };

  const { data: stationsData, isLoading: stationsLoading } = useQuery<{ payload: any[] }>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      return response.json();
    },
    staleTime: 3600000,
    gcTime: 3600000,
  });

  const { data: spoorkaartData } = useQuery<{ payload: { features: GeoJSONFeature[] } }>({
    queryKey: ["/api/spoorkaart"],
    queryFn: async () => {
      const response = await fetch("/api/spoorkaart");
      if (!response.ok) throw new Error("Failed to fetch railway tracks");
      return response.json();
    },
    staleTime: 86400000,
    gcTime: 86400000,
  });

  const stations = useMemo(() => {
    const result: Station[] = [];
    const stationsList = stationsData?.payload || [];
    
    const findStationCoords = (name: string): { lat: number; lng: number } | null => {
      const station = stationsList.find((s: any) => 
        s.namen?.lang?.toLowerCase() === name.toLowerCase() ||
        s.namen?.middel?.toLowerCase() === name.toLowerCase() ||
        s.namen?.kort?.toLowerCase() === name.toLowerCase()
      );
      if (station?.lat && station?.lng) {
        return { lat: station.lat, lng: station.lng };
      }
      return null;
    };
    
    if (intermediateStops && intermediateStops.length >= 2) {
      for (let i = 0; i < intermediateStops.length; i++) {
        const stop = intermediateStops[i];
        const coords = (stop.lat && stop.lng)
          ? { lat: stop.lat, lng: stop.lng }
          : findStationCoords(stop.name);
        
        if (coords) {
          let type: Station['type'] = 'transfer';
          if (i === 0) type = 'start';
          else if (i === intermediateStops.length - 1) type = 'end';
          
          result.push({
            name: stop.name,
            lat: coords.lat,
            lng: coords.lng,
            type
          });
        }
      }
      return result;
    }
    
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      
      if (i === 0) {
        const fromCoords = (leg.fromLat && leg.fromLng) 
          ? { lat: leg.fromLat, lng: leg.fromLng }
          : findStationCoords(leg.from);
        
        if (fromCoords) {
          result.push({
            name: leg.from,
            lat: fromCoords.lat,
            lng: fromCoords.lng,
            type: "start"
          });
        }
      }
      
      const toCoords = (leg.toLat && leg.toLng) 
        ? { lat: leg.toLat, lng: leg.toLng }
        : findStationCoords(leg.to);
      
      if (toCoords && !result.some(s => s.name === leg.to)) {
        const isEnd = i === legs.length - 1;
        result.push({
          name: leg.to,
          lat: toCoords.lat,
          lng: toCoords.lng,
          type: isEnd ? "end" : "transfer"
        });
      }
    }
    
    return result;
  }, [legs, stationsData, intermediateStops]);

  const routePositions = useMemo(() => {
    const features = spoorkaartData?.payload?.features || [];
    
    if (stations.length < 2) {
      return [];
    }
    
    const stops = stations.map(s => ({ lat: s.lat, lng: s.lng }));
    return findRouteBetweenStops(stops, features);
  }, [stations, spoorkaartData]);

  if (!isMounted || stationsLoading) {
    return (
      <div className={`${mapHeight} rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm`}>
        Kaart laden...
      </div>
    );
  }

  if (stations.length < 2) {
    return (
      <div className={`${mapHeight} rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm`}>
        Geen routegegevens beschikbaar
      </div>
    );
  }

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const containerClasses = embedded 
    ? `${mapHeight} overflow-hidden relative`
    : `${mapHeight} rounded-lg overflow-hidden border relative`;

  return (
    <div 
      className={containerClasses}
      style={{ zIndex: 0, isolation: 'isolate' }}
      data-testid="map-trip-route"
      data-vaul-no-drag
    >
      <MapContainer
        center={[stations[0].lat, stations[0].lng]}
        zoom={10}
        className="h-full w-full"
        style={{ 
          background: isDark ? '#1a1a2e' : '#e8e8e8',
          minHeight: compact ? '150px' : '200px',
          touchAction: 'pan-x pan-y'
        }}
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={false}
      >
        <TileLayer 
          url={tileUrl}
          maxZoom={19}
        />
        <MapResizeHandler />
        <FitBounds stations={stations} recenterTrigger={recenterTrigger} />
        <MapMoveTracker onMoved={setHasMoved} />
        
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: isDark ? '#60a5fa' : '#2563eb',
              weight: 4,
              opacity: 0.9,
            }}
          />
        )}
        
        {(() => {
          const placements = calculateAllLabelPlacements(stations, routePositions);
          return stations.map((station, idx) => (
            <Marker
              key={`${station.name}-${idx}`}
              position={[station.lat, station.lng]}
              icon={createStationIcon(station, isDark, placements[idx] || 'bottom')}
              zIndexOffset={station.type === "start" ? 100 : station.type === "end" ? 90 : 80}
            />
          ));
        })()}
      </MapContainer>

      {hasMoved && (
        <button
          className="absolute bottom-3 right-3 z-[1000] rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={handleRecenter}
          data-testid="button-recenter-route-map"
        >
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Centreren</span>
        </button>
      )}
    </div>
  );
}
