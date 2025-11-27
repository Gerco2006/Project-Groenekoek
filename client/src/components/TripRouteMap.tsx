import { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery } from "@tanstack/react-query";
import type { TripLeg } from "@shared/schema";
import "leaflet/dist/leaflet.css";

interface TripRouteMapProps {
  legs: TripLeg[];
  compact?: boolean;
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
  const tolerance = 0.0003;
  
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
  const maxSearchDistance = 0.02;
  
  for (let i = 0; i < stops.length - 1; i++) {
    const start: [number, number] = [stops[i].lat, stops[i].lng];
    const end: [number, number] = [stops[i + 1].lat, stops[i + 1].lng];
    
    const startNode = findNearestGraphNode(start, graph, maxSearchDistance);
    const endNode = findNearestGraphNode(end, graph, maxSearchDistance);
    
    if (startNode && endNode && startNode !== endNode) {
      const pathSegment = findPathAStar(graph, startNode, endNode, end, 5000);
      
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

function createStationIcon(station: Station, isDark: boolean): L.DivIcon {
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
  const labelBg = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const borderColor = isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)';
  const shadow = isDark 
    ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
    : '0 2px 8px rgba(0, 0, 0, 0.08)';
  
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
          top: ${size + 4}px;
          left: 50%;
          transform: translateX(-50%);
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
        ">${station.name}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ stations }: { stations: Station[] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  
  useEffect(() => {
    if (stations.length > 0 && !fittedRef.current) {
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60] });
      fittedRef.current = true;
    }
  }, [stations, map]);
  
  return null;
}

export default function TripRouteMap({ legs, compact = false }: TripRouteMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mapHeight = compact ? "h-[150px]" : "h-[200px]";

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
  }, [legs, stationsData]);

  const routePositions = useMemo(() => {
    const features = spoorkaartData?.payload?.features || [];
    
    if (stations.length < 2) {
      return [];
    }
    
    const stops = stations.map(s => ({ lat: s.lat, lng: s.lng }));
    return findRouteBetweenStops(stops, features);
  }, [stations, spoorkaartData]);

  if (stationsLoading) {
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

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className={`${mapHeight} rounded-lg overflow-hidden border relative`}
      style={{ zIndex: 0, isolation: 'isolate' }}
      data-testid="map-trip-route"
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => e.stopPropagation()}
      data-vaul-no-drag
    >
      <MapContainer
        center={[stations[0].lat, stations[0].lng]}
        zoom={10}
        className="h-full w-full"
        style={{ 
          background: isDark ? '#1a1a2e' : '#e8e8e8',
          minHeight: compact ? '150px' : '200px'
        }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer 
          url={tileUrl}
          maxZoom={19}
        />
        <FitBounds stations={stations} />
        
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
        
        {stations.map((station, idx) => (
          <Marker
            key={`${station.name}-${idx}`}
            position={[station.lat, station.lng]}
            icon={createStationIcon(station, isDark)}
            zIndexOffset={station.type === "start" ? 100 : station.type === "end" ? 90 : 80}
          />
        ))}
      </MapContainer>
    </div>
  );
}
