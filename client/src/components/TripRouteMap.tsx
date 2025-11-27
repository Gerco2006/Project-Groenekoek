import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
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

function FitBounds({ stations }: { stations: Station[] }) {
  const map = useMap();
  
  useMemo(() => {
    if (stations.length > 0) {
      const bounds = stations.map(s => [s.lat, s.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [stations, map]);
  
  return null;
}

export default function TripRouteMap({ legs }: TripRouteMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const { data: spoorkaartData } = useQuery<{ payload: { features: any[] } }>({
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
    
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      
      if (i === 0 && leg.fromLat && leg.fromLng) {
        result.push({
          name: leg.from,
          lat: leg.fromLat,
          lng: leg.fromLng,
          type: "start"
        });
      }
      
      if (leg.toLat && leg.toLng) {
        const isEnd = i === legs.length - 1;
        const isTransfer = i < legs.length - 1;
        
        if (!result.some(s => s.name === leg.to)) {
          result.push({
            name: leg.to,
            lat: leg.toLat,
            lng: leg.toLng,
            type: isEnd ? "end" : (isTransfer ? "transfer" : "end")
          });
        }
      }
    }
    
    return result;
  }, [legs]);

  const routePositions = useMemo(() => {
    if (!spoorkaartData?.payload?.features) {
      return stations.map(s => [s.lat, s.lng] as [number, number]);
    }
    
    return stations.map(s => [s.lat, s.lng] as [number, number]);
  }, [stations, spoorkaartData]);

  const hasValidCoordinates = stations.length >= 2;

  if (!hasValidCoordinates) {
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
        
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: isDark ? '#60a5fa' : '#3b82f6',
            weight: 4,
            opacity: 0.9,
          }}
        />
        
        {stations.map((station, idx) => {
          let color = '#f97316';
          let radius = 8;
          
          if (station.type === "start") {
            color = '#22c55e';
            radius = 10;
          } else if (station.type === "end") {
            color = '#ef4444';
            radius = 10;
          }
          
          return (
            <CircleMarker
              key={idx}
              center={[station.lat, station.lng]}
              radius={radius}
              pathOptions={{
                color: isDark ? '#1f2937' : '#ffffff',
                weight: 3,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]} className="font-medium">
                {station.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
