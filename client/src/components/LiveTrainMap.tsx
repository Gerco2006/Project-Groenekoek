import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Train, Info, ChevronDown, ChevronUp, X, Loader2, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ThemeProvider";
import "leaflet/dist/leaflet.css";

interface TrainVehicle {
  treinNummer: number;
  ritId: string;
  lat: number;
  lng: number;
  snelheid: number;
  richting: number;
  horizontaleNauwkeurigheid: number;
  type: string;
  bron: string;
  materieel?: Array<{
    materieelnummer: number;
    type: string;
    faciliteiten: string[];
    afbeelding: string;
    bakken: Array<{
      afbeelding: string;
    }>;
  }>;
}

interface TrainsMapResponse {
  payload: {
    treinen: TrainVehicle[];
  };
}

interface LiveTrainMapProps {
  onTrainClick?: (ritId: string, trainNumber: number, trainType: string) => void;
  collapsed?: boolean;
}

interface TrainJourneyInfo {
  origin: string;
  destination: string;
  nextStop: string | null;
  materieelTypes: string[];
  speed: number;
}

interface TrainInfoPanelProps {
  train: TrainVehicle;
  map: L.Map | null;
  onClose: () => void;
  onViewJourney: (train: TrainVehicle) => void;
}

function TrainInfoPanel({ train, map, onClose, onViewJourney }: TrainInfoPanelProps) {
  const [journeyInfo, setJourneyInfo] = useState<TrainJourneyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    
    const updatePosition = () => {
      const point = map.latLngToContainerPoint([train.lat, train.lng]);
      setPosition({ x: point.x, y: point.y });
    };
    
    updatePosition();
    
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    
    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [map, train.lat, train.lng]);

  useEffect(() => {
    const fetchJourneyInfo = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/journey?train=${train.treinNummer}`);
        if (response.ok) {
          const data = await response.json();
          const stops = data?.payload?.stops || [];
          const stoppingStops = stops.filter((s: any) => s.status !== "PASSING");
          
          const materieelTypes: string[] = [];
          if (data?.payload?.productNumbers) {
            data.payload.productNumbers.forEach((pn: any) => {
              if (pn.materieeldelen) {
                pn.materieeldelen.forEach((md: any) => {
                  if (md.type && !materieelTypes.includes(md.type)) {
                    materieelTypes.push(md.type);
                  }
                });
              }
            });
          }
          
          let nextStop: string | null = null;
          const now = new Date();
          for (const stop of stoppingStops) {
            const departureTime = stop.actualDepartureTime || stop.plannedDepartureTime;
            if (departureTime && new Date(departureTime) > now) {
              nextStop = stop.stop?.name || null;
              break;
            }
          }
          
          if (stoppingStops.length > 0) {
            setJourneyInfo({
              origin: stoppingStops[0]?.stop?.name || "",
              destination: stoppingStops[stoppingStops.length - 1]?.stop?.name || "",
              nextStop,
              materieelTypes,
              speed: train.snelheid,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch journey info:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJourneyInfo();
  }, [train.treinNummer, train.snelheid]);

  if (!position) return null;

  const trainTypeLabel = train.type === "IC" ? "IC" : train.type === "SPR" ? "SPR" : train.type || "";
  const trainTypeColor = train.type === "IC" ? "bg-[#FFC917]" : train.type === "SPR" ? "bg-[#003082]" : "bg-[#00A651]";
  const trainTypeTextColor = train.type === "IC" ? "text-black" : "text-white";

  const panelWidth = 220;
  let left = position.x - panelWidth / 2;
  left = Math.max(8, left);

  const arrowLeftPos = Math.max(16, Math.min(position.x - left, panelWidth - 16));

  return (
    <div 
      className="absolute z-[1001]"
      style={{
        left: `${left}px`,
        bottom: `calc(100% - ${position.y - 28}px)`,
        width: `${panelWidth}px`,
      }}
    >
      <div 
        className="relative rounded-lg shadow-2xl border border-border/40 bg-white/60 dark:bg-gray-900/60"
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div 
          className="absolute flex items-center justify-center text-muted-foreground"
          style={{
            left: `${arrowLeftPos - 10}px`,
            bottom: '-14px',
          }}
        >
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="drop-shadow-sm">
            <path 
              d="M10 14L0 0H20L10 14Z" 
              className="fill-white/60 dark:fill-gray-900/60 stroke-border/40"
              strokeWidth="1"
            />
          </svg>
        </div>
        
        <div className="p-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded ${trainTypeColor} ${trainTypeTextColor} flex items-center justify-center font-bold text-[10px] shrink-0`}>
              {trainTypeLabel || "?"}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs truncate">Trein {train.treinNummer}</div>
              {isLoading ? (
                <div className="text-[10px] text-muted-foreground">Laden...</div>
              ) : journeyInfo?.materieelTypes.length ? (
                <div className="text-[10px] text-muted-foreground truncate">{journeyInfo.materieelTypes.join(" + ")}</div>
              ) : null}
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={onClose} data-testid="button-close-train-info">
            <X className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="px-2 pb-2">
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Laden...
            </div>
          ) : journeyInfo ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="truncate">{journeyInfo.origin}</span>
                <span className="text-muted-foreground mx-0.5">→</span>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">{journeyInfo.destination}</span>
              </div>
              
              {journeyInfo.nextStop && (
                <div className="text-[10px] text-muted-foreground truncate">
                  Volgende: <span className="text-foreground">{journeyInfo.nextStop}</span>
                </div>
              )}
              
              <div className="text-[10px] text-muted-foreground">
                Snelheid: {Math.round(train.snelheid)} km/u
              </div>
            </div>
          ) : null}
          
          <Button
            size="sm"
            className="w-full mt-2 h-7 text-xs"
            onClick={() => onViewJourney(train)}
            data-testid={`button-view-train-${train.treinNummer}`}
          >
            Bekijk ritinfo
          </Button>
        </div>
      </div>
    </div>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

const NETHERLANDS_CENTER: [number, number] = [52.1326, 5.2913];
const DEFAULT_ZOOM = 8;

function getTrainColor(type: string): string {
  const typeLower = type?.toLowerCase() || "";
  if (typeLower.includes("ic") || typeLower.includes("intercity")) {
    return "#FFC917";
  }
  if (typeLower.includes("spr") || typeLower.includes("sprinter")) {
    return "#003082";
  }
  if (typeLower.includes("thalys") || typeLower.includes("eurostar") || typeLower.includes("ice")) {
    return "#9B2335";
  }
  return "#00A651";
}

function getTrainTypeLabel(type: string): string {
  const typeLower = type?.toLowerCase() || "";
  if (typeLower.includes("virm")) return "IC";
  if (typeLower.includes("icm")) return "IC";
  if (typeLower.includes("ddz")) return "IC";
  if (typeLower.includes("slt")) return "SPR";
  if (typeLower.includes("sng")) return "SPR";
  if (typeLower.includes("flirt")) return "SPR";
  if (typeLower.includes("gtw")) return "SPR";
  return type?.substring(0, 3).toUpperCase() || "TRN";
}

function createTrainIcon(type: string, heading: number, isDark: boolean): L.DivIcon {
  const color = getTrainColor(type);
  const label = getTrainTypeLabel(type);
  const borderColor = isDark ? "#374151" : "#ffffff";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)";
  
  return L.divIcon({
    className: "train-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: bold;
        color: ${color === "#FFC917" ? "#000" : "#fff"};
        box-shadow: 0 2px 6px ${shadowColor};
        cursor: pointer;
        transform: rotate(${heading}deg);
      ">
        <span style="transform: rotate(${-heading}deg);">${label}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

function RefreshButton({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) {
  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <Button
        size="sm"
        variant="secondary"
        onClick={onClick}
        disabled={isLoading}
        className="shadow-lg"
        data-testid="button-refresh-map"
      >
        <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
        Vernieuwen
      </Button>
    </div>
  );
}

export default function LiveTrainMap({ onTrainClick, collapsed = false }: LiveTrainMapProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [selectedTrain, setSelectedTrain] = useState<TrainVehicle | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data, isLoading, refetch, isFetching } = useQuery<TrainsMapResponse>({
    queryKey: ["/api/trains-map"],
    queryFn: async () => {
      const response = await fetch("/api/trains-map");
      if (!response.ok) {
        throw new Error("Failed to fetch train positions");
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const trains = data?.payload?.treinen || [];

  useEffect(() => {
    if (collapsed) {
      setIsCollapsed(true);
      setSelectedTrain(null);
    }
  }, [collapsed]);

  useEffect(() => {
    if (mapInstance && !isCollapsed) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 350);
    }
  }, [isCollapsed, mapInstance]);

  const handleViewJourney = (train: TrainVehicle) => {
    setSelectedTrain(null);
    if (onTrainClick) {
      const trainType = train.materieel?.[0]?.type || train.type || "Trein";
      onTrainClick(train.ritId, train.treinNummer, trainType);
    }
  };

  const handleTrainMarkerClick = (train: TrainVehicle) => {
    setSelectedTrain(train);
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5 text-primary" />
            <span className="font-semibold">Live Treinen Kaart</span>
          </div>
        </div>
        <Skeleton className="h-[300px] w-full rounded-none" />
      </Card>
    );
  }

  const handleToggleCollapse = () => {
    if (!isCollapsed) {
      setSelectedTrain(null);
    }
    setIsCollapsed(!isCollapsed);
  };


  return (
    <Card className="overflow-hidden" data-testid="live-train-map" ref={mapContainerRef}>
      <div className="p-3 border-b flex items-center justify-between">
        <button 
          onClick={handleToggleCollapse}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          data-testid="button-toggle-map-collapse"
        >
          <Train className="w-5 h-5 text-primary" />
          <span className="font-semibold">Live Treinen Kaart</span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {!isCollapsed && (
        <div className="px-3 py-2 bg-muted/50 border-b flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Alleen treinen met GPS-apparatuur zijn zichtbaar. Oudere materieeltypes kunnen ontbreken.
          </p>
        </div>
      )}
      <div 
        className={`relative transition-all duration-300 overflow-hidden ${
          isCollapsed ? "h-0" : "h-[500px]"
        }`}
      >
        <MapContainer
          center={NETHERLANDS_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
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
          <MapController center={NETHERLANDS_CENTER} zoom={DEFAULT_ZOOM} />
          
          <MapClickHandler onMapClick={() => setSelectedTrain(null)} />
          
          {trains.map((train) => (
            <Marker
              key={train.ritId}
              position={[train.lat, train.lng]}
              icon={createTrainIcon(
                train.materieel?.[0]?.type || train.type || "",
                train.richting || 0,
                isDark
              )}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  handleTrainMarkerClick(train);
                },
              }}
            />
          ))}
        </MapContainer>
        <RefreshButton onClick={() => refetch()} isLoading={isFetching} />
        
        {!selectedTrain && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#FFC917] border border-white dark:border-gray-700" />
                <span>IC</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#003082] border border-white dark:border-gray-700" />
                <span>Sprinter</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#00A651] border border-white dark:border-gray-700" />
                <span>Overig</span>
              </div>
            </div>
          </div>
        )}
        
        {selectedTrain && (
          <TrainInfoPanel
            train={selectedTrain}
            map={mapInstance}
            onClose={() => setSelectedTrain(null)}
            onViewJourney={handleViewJourney}
          />
        )}
      </div>
    </Card>
  );
}
