import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import "leaflet/dist/leaflet.css";

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

interface TrackGraph {
  neighbors: Record<string, string[]>;
  nodeCoords: Record<string, [number, number]>;
}

interface Station {
  coordinate?: {
    lat: number;
    lng: number;
  };
  name: string;
  stationCode: string;
}

interface Disruption {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  publicationSections?: Array<{
    section: {
      stations?: Station[];
    };
  }>;
}

interface DisruptionsMapProps {
  disruptions: Disruption[];
  onDisruptionClick: (disruption: Disruption) => void;
  selectedDisruptionId?: string;
  isLoading?: boolean;
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
  graph: TrackGraph
): [number, number][] {
  if (stops.length < 2) {
    return stops.map(s => [s.lat, s.lng] as [number, number]);
  }
  
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

function RailwayTracksLayer({ features, isDark }: { features: GeoJSONFeature[]; isDark: boolean }) {
  const map = useMap();
  const [opacity, setOpacity] = useState(isDark ? 0.4 : 0.45);
  
  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      if (zoom > 15) {
        const fadeAmount = Math.min(1, (zoom - 15) / 2);
        setOpacity((isDark ? 0.4 : 0.45) * (1 - fadeAmount));
      } else {
        setOpacity(isDark ? 0.4 : 0.45);
      }
    };
    
    map.on('zoomend', handleZoom);
    handleZoom();
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, isDark]);

  const trackPositions = useMemo(() => {
    const positions: [number, number][][] = [];
    
    for (const feature of features) {
      if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates as number[][];
        positions.push(coords.map(c => [c[1], c[0]] as [number, number]));
      } else if (feature.geometry.type === "MultiLineString") {
        const multiCoords = feature.geometry.coordinates as number[][][];
        for (const coords of multiCoords) {
          positions.push(coords.map(c => [c[1], c[0]] as [number, number]));
        }
      }
    }
    
    return positions;
  }, [features]);
  
  return (
    <>
      {trackPositions.map((positions, index) => (
        <Polyline
          key={index}
          positions={positions}
          pathOptions={{
            color: isDark ? '#9ca3af' : '#6b7280',
            weight: 2,
            opacity: opacity,
          }}
        />
      ))}
    </>
  );
}

function DisruptionLines({ 
  disruptions, 
  onDisruptionClick, 
  selectedDisruptionId,
  isDark,
  trackGraph
}: { 
  disruptions: Disruption[]; 
  onDisruptionClick: (disruption: Disruption) => void;
  selectedDisruptionId?: string;
  isDark: boolean;
  trackGraph: TrackGraph | null;
}) {
  const disruptionRoutes = useMemo(() => {
    if (!trackGraph) return [];
    
    return disruptions.map(disruption => {
      const isMaintenace = disruption.type.toLowerCase().includes("maintenance");
      const baseColor = isMaintenace ? "#f97316" : "#ef4444";
      const isSelected = disruption.id === selectedDisruptionId;
      
      const sections = disruption.publicationSections?.map((section, sectionIdx) => {
        const stations = section.section.stations || [];
        const stationsWithCoords = stations.filter(s => s.coordinate);
        
        if (stationsWithCoords.length < 2) return null;
        
        const stops = stationsWithCoords.map(s => ({
          lat: s.coordinate!.lat,
          lng: s.coordinate!.lng
        }));
        
        const routePositions = findRouteBetweenStops(stops, trackGraph);
        
        const firstStation = stationsWithCoords[0];
        const lastStation = stationsWithCoords[stationsWithCoords.length - 1];
        
        return {
          sectionIdx,
          positions: routePositions,
          firstStation,
          lastStation
        };
      }).filter(Boolean);
      
      return {
        disruption,
        baseColor,
        isSelected,
        sections
      };
    });
  }, [disruptions, selectedDisruptionId, trackGraph]);

  return (
    <>
      {disruptionRoutes.map(({ disruption, baseColor, isSelected, sections }) => (
        sections?.map((section: any) => (
          <g key={`${disruption.id}-${section.sectionIdx}`}>
            <Polyline
              positions={section.positions}
              pathOptions={{
                color: "transparent",
                weight: 20,
                opacity: 0,
              }}
              eventHandlers={{
                click: () => onDisruptionClick(disruption),
              }}
            >
              <Tooltip 
                sticky
                className={`disruption-tooltip ${isDark ? 'dark' : 'light'}`}
              >
                <div className="tooltip-content rounded-lg px-3 py-2 shadow-lg">
                  <div className="text-sm font-medium">{disruption.title}</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {section.firstStation?.name} - {section.lastStation?.name}
                  </div>
                </div>
              </Tooltip>
            </Polyline>
            
            <Polyline
              positions={section.positions}
              pathOptions={{
                color: baseColor,
                weight: isSelected ? 6 : 4,
                opacity: isSelected ? 1 : 0.8,
              }}
              interactive={false}
            />
            
            {section.firstStation?.coordinate && (
              <CircleMarker
                center={[section.firstStation.coordinate.lat, section.firstStation.coordinate.lng]}
                radius={isSelected ? 8 : 6}
                pathOptions={{
                  color: baseColor,
                  fillColor: isDark ? "#1f2937" : "#ffffff",
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => onDisruptionClick(disruption),
                }}
              >
                <Tooltip className={`disruption-tooltip ${isDark ? 'dark' : 'light'}`}>
                  <div className="tooltip-content rounded-lg px-2 py-1 shadow-lg text-xs">
                    {section.firstStation.name}
                  </div>
                </Tooltip>
              </CircleMarker>
            )}
            
            {section.lastStation?.coordinate && (
              <CircleMarker
                center={[section.lastStation.coordinate.lat, section.lastStation.coordinate.lng]}
                radius={isSelected ? 8 : 6}
                pathOptions={{
                  color: baseColor,
                  fillColor: isDark ? "#1f2937" : "#ffffff",
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => onDisruptionClick(disruption),
                }}
              >
                <Tooltip className={`disruption-tooltip ${isDark ? 'dark' : 'light'}`}>
                  <div className="tooltip-content rounded-lg px-2 py-1 shadow-lg text-xs">
                    {section.lastStation.name}
                  </div>
                </Tooltip>
              </CircleMarker>
            )}
          </g>
        ))
      ))}
    </>
  );
}

function MapLegend({ isDark }: { isDark: boolean }) {
  return (
    <div 
      className={`absolute bottom-4 left-4 z-[1000] p-3 rounded-lg shadow-lg ${
        isDark ? 'bg-gray-800/90' : 'bg-white/90'
      } backdrop-blur-sm`}
    >
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-red-500 rounded"></div>
          <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Storing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-orange-500 rounded"></div>
          <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Werkzaamheden</span>
        </div>
      </div>
    </div>
  );
}

export default function DisruptionsMap({ 
  disruptions, 
  onDisruptionClick,
  selectedDisruptionId,
  isLoading: isLoadingDisruptions = false
}: DisruptionsMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const { data: spoorkaartData, isLoading: isLoadingTracks } = useQuery<{ payload: SpoorkaartResponse }>({
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

  const trackGraph = useMemo(() => {
    if (!spoorkaartData?.payload?.features) return null;
    return buildTrackGraph(spoorkaartData.payload.features);
  }, [spoorkaartData?.payload?.features]);

  const disruptionsWithCoords = useMemo(() => {
    return disruptions.filter(d => 
      d.publicationSections?.some(s => 
        s.section.stations?.some(st => st.coordinate)
      )
    );
  }, [disruptions]);

  const disruptionsWithoutCoords = disruptions.length - disruptionsWithCoords.length;

  const bounds = useMemo(() => {
    const allCoords: [number, number][] = [];
    
    disruptionsWithCoords.forEach(d => {
      d.publicationSections?.forEach(s => {
        s.section.stations?.forEach(st => {
          if (st.coordinate) {
            allCoords.push([st.coordinate.lat, st.coordinate.lng]);
          }
        });
      });
    });
    
    if (allCoords.length === 0) {
      return L.latLngBounds([50.75, 3.35], [53.55, 7.25]);
    }
    
    return L.latLngBounds(allCoords);
  }, [disruptionsWithCoords]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  if (isLoadingTracks) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" style={{ minHeight: '400px' }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        className="h-full w-full"
        style={{ zIndex: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={isDark ? "dark" : "light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        
        {spoorkaartData?.payload?.features && (
          <RailwayTracksLayer features={spoorkaartData.payload.features} isDark={isDark} />
        )}
        
        <DisruptionLines 
          disruptions={disruptionsWithCoords}
          onDisruptionClick={onDisruptionClick}
          selectedDisruptionId={selectedDisruptionId}
          isDark={isDark}
          trackGraph={trackGraph}
        />
      </MapContainer>
      
      <MapLegend isDark={isDark} />
      
      {disruptionsWithoutCoords > 0 && (
        <div 
          className={`absolute top-4 right-4 z-[1000] px-3 py-2 rounded-lg text-xs shadow-lg ${
            isDark ? 'bg-gray-800/90 text-gray-300' : 'bg-white/90 text-gray-600'
          } backdrop-blur-sm`}
        >
          {disruptionsWithoutCoords} storing{disruptionsWithoutCoords > 1 ? 'en' : ''} zonder locatie (zie lijst)
        </div>
      )}
      
      {!isLoadingDisruptions && disruptions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="text-center p-4">
            <p className="text-muted-foreground">Geen storingen gevonden</p>
          </div>
        </div>
      )}
    </div>
  );
}
