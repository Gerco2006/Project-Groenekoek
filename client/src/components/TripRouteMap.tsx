import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery } from "@tanstack/react-query";
import type { TripLeg } from "@shared/schema";
import "leaflet/dist/leaflet.css";

interface TripRouteMapProps {
  legs: TripLeg[];
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

function findBestStartNode(
  start: [number, number],
  end: [number, number],
  graph: TrackGraph,
  maxDistance: number
): string | null {
  const candidates: { key: string; score: number }[] = [];
  const dirToEnd = Math.atan2(end[1] - start[1], end[0] - start[0]);
  
  const keys = Object.keys(graph.neighbors);
  for (const key of keys) {
    const coords = graph.nodeCoords[key];
    if (!coords) continue;
    const dist = distanceBetweenPoints(start, coords);
    if (dist < maxDistance) {
      const neighbors = graph.neighbors[key];
      if (!neighbors || neighbors.length === 0) continue;
      
      let bestNeighborScore = -Infinity;
      for (const neighborKey of neighbors) {
        const neighborCoord = graph.nodeCoords[neighborKey];
        if (!neighborCoord) continue;
        
        const dirToNeighbor = Math.atan2(neighborCoord[1] - coords[1], neighborCoord[0] - coords[0]);
        let angleDiff = Math.abs(dirToEnd - dirToNeighbor);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        const directionScore = Math.cos(angleDiff);
        if (directionScore > bestNeighborScore) {
          bestNeighborScore = directionScore;
        }
      }
      
      const distanceScore = 1 - (dist / maxDistance);
      const totalScore = distanceScore * 0.3 + bestNeighborScore * 0.7;
      
      candidates.push({ key, score: totalScore });
    }
  }
  
  if (candidates.length === 0) return null;
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].key;
}

function findPathAStar(
  graph: TrackGraph,
  startKey: string,
  endKey: string,
  maxNodes: number = 5000
): [number, number][] {
  if (startKey === endKey) return [];
  
  const endCoord = graph.nodeCoords[endKey];
  if (!endCoord) return [];
  
  const gScore: Record<string, number> = { [startKey]: 0 };
  const fScore: Record<string, number> = {};
  const startCoord = graph.nodeCoords[startKey];
  fScore[startKey] = startCoord ? distanceBetweenPoints(startCoord, endCoord) : Infinity;
  
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
    
    const startNode = findBestStartNode(start, end, graph, maxSearchDistance);
    const endNode = findBestStartNode(end, start, graph, maxSearchDistance);
    
    if (startNode && endNode) {
      const pathSegment = findPathAStar(graph, startNode, endNode, 5000);
      
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
  let size = 12;
  
  if (station.type === "start") {
    bgColor = '#22c55e';
    size = 14;
  } else if (station.type === "end") {
    bgColor = '#ef4444';
    size = 14;
  }
  
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const labelBg = isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  
  return L.divIcon({
    className: 'custom-station-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: 2px solid ${isDark ? '#1f2937' : '#ffffff'};
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: ${size + 4}px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          padding: 3px 8px;
          background: ${labelBg};
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid ${borderColor};
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: ${textColor};
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        ">${station.name}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ stations }: { stations: Station[] }) {
  const map = useMap();
  
  useMemo(() => {
    if (stations.length > 0) {
      const bounds = stations.map(s => [s.lat, s.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, map]);
  
  return null;
}

export default function TripRouteMap({ legs }: TripRouteMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
      <div className="h-[250px] rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
        Kaart laden...
      </div>
    );
  }

  if (stations.length < 2) {
    return (
      <div className="h-[250px] rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
        Geen routegegevens beschikbaar
      </div>
    );
  }

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="h-[250px] rounded-lg overflow-hidden border" data-testid="map-trip-route">
      <MapContainer
        center={[stations[0].lat, stations[0].lng]}
        zoom={10}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />
        <FitBounds stations={stations} />
        
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: isDark ? '#60a5fa' : '#3b82f6',
              weight: 4,
              opacity: 0.9,
            }}
          />
        )}
        
        {stations.map((station, idx) => (
          <Marker
            key={idx}
            position={[station.lat, station.lng]}
            icon={createStationIcon(station, isDark)}
          />
        ))}
      </MapContainer>
    </div>
  );
}
