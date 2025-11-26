import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Train, Maximize2, Minimize2, Info, ChevronDown, ChevronUp } from "lucide-react";
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
}

function TrainPopupContent({ 
  train, 
  onViewJourney,
  isDark
}: { 
  train: TrainVehicle; 
  onViewJourney: (train: TrainVehicle) => void;
  isDark: boolean;
}) {
  const [journeyInfo, setJourneyInfo] = useState<TrainJourneyInfo | null>(null);
  const [isLoadingJourney, setIsLoadingJourney] = useState(true);

  useEffect(() => {
    const fetchJourneyInfo = async () => {
      try {
        setIsLoadingJourney(true);
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
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch journey info:", error);
      } finally {
        setIsLoadingJourney(false);
      }
    };
    
    fetchJourneyInfo();
  }, [train.treinNummer]);

  const bgColor = isDark ? "#1f2937" : "#ffffff";
  const textColor = isDark ? "#f3f4f6" : "#111827";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  
  const trainTypeLabel = train.type === "IC" ? "Intercity" : train.type === "SPR" ? "Sprinter" : train.type || "";
  const trainTypeColor = train.type === "IC" ? "#FFC917" : train.type === "SPR" ? "#003082" : "#00A651";

  return (
    <div style={{ 
      minWidth: "220px", 
      maxWidth: "260px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundColor: bgColor,
      color: textColor,
      borderRadius: "12px",
      overflow: "hidden"
    }}>
      <div style={{ 
        padding: "12px",
        borderBottom: `1px solid ${borderColor}`
      }}>
        <div style={{ 
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "4px"
        }}>
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            backgroundColor: trainTypeColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: train.type === "IC" ? "#000" : "#fff",
            fontWeight: 700,
            fontSize: "10px",
            flexShrink: 0
          }}>
            {train.type || "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>
              {trainTypeLabel} {train.treinNummer}
            </div>
            {!isLoadingJourney && journeyInfo?.materieelTypes.length ? (
              <div style={{ fontSize: "11px", color: mutedColor }}>
                {journeyInfo.materieelTypes.join(" + ")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      <div style={{ padding: "12px" }}>
        {isLoadingJourney ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            color: mutedColor,
            fontSize: "13px",
            padding: "8px 0"
          }}>
            <div style={{
              width: "14px",
              height: "14px",
              border: `2px solid ${borderColor}`,
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            Ritinfo laden...
          </div>
        ) : journeyInfo ? (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ 
              display: "flex", 
              alignItems: "flex-start",
              gap: "10px"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "2px"
              }}>
                <div style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  border: `2px solid ${bgColor}`,
                  boxShadow: "0 0 0 1px #22c55e"
                }} />
                <div style={{
                  width: "2px",
                  height: "24px",
                  backgroundColor: borderColor
                }} />
                <div style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  border: `2px solid ${bgColor}`,
                  boxShadow: "0 0 0 1px #ef4444"
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "18px" }}>
                  {journeyInfo.origin}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>
                  {journeyInfo.destination}
                </div>
              </div>
            </div>
            
            {journeyInfo.nextStop && (
              <div style={{ 
                marginTop: "12px",
                padding: "8px 10px",
                backgroundColor: isDark ? "#374151" : "#f3f4f6",
                borderRadius: "8px",
                fontSize: "12px"
              }}>
                <span style={{ color: mutedColor }}>Volgende halte: </span>
                <span style={{ fontWeight: 500 }}>{journeyInfo.nextStop}</span>
              </div>
            )}
          </div>
        ) : null}
        
        <button
          onClick={() => onViewJourney(train)}
          data-testid={`button-view-train-${train.treinNummer}`}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          Bekijk ritinfo
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        .leaflet-popup-tip {
          background: ${bgColor} !important;
        }
        .leaflet-popup-close-button {
          font-size: 18px !important;
          width: 28px !important;
          height: 28px !important;
          padding: 6px !important;
          color: ${textColor} !important;
          right: 4px !important;
          top: 4px !important;
        }
      `}</style>
    </div>
  );
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

function createTrainIcon(type: string, heading: number): L.DivIcon {
  const color = getTrainColor(type);
  const label = getTrainTypeLabel(type);
  
  return L.divIcon({
    className: "train-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: bold;
        color: ${color === "#FFC917" ? "#000" : "#fff"};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const scrollToMap = useCallback(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
      setIsExpanded(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
    if (isExpanded) {
      setTimeout(scrollToMap, 100);
    }
  }, [isExpanded, isCollapsed, scrollToMap]);

  const handleViewJourney = (train: TrainVehicle) => {
    if (onTrainClick) {
      const trainType = train.materieel?.[0]?.type || train.type || "Trein";
      onTrainClick(train.ritId, train.treinNummer, trainType);
    }
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
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
      setIsExpanded(false);
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
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
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleToggleExpand}
              data-testid="button-expand-map"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
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
          isCollapsed ? "h-0" : isExpanded ? "h-[500px]" : "h-[300px]"
        }`}
      >
        <MapContainer
          center={NETHERLANDS_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          ref={mapRef}
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
          
          {trains.map((train) => (
            <Marker
              key={train.ritId}
              position={[train.lat, train.lng]}
              icon={createTrainIcon(
                train.materieel?.[0]?.type || train.type || "",
                train.richting || 0
              )}
            >
              <Popup>
                <TrainPopupContent train={train} onViewJourney={handleViewJourney} isDark={isDark} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <RefreshButton onClick={() => refetch()} isLoading={isFetching} />
        
        <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#FFC917] border border-white" />
              <span>IC</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#003082] border border-white" />
              <span>Sprinter</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#00A651] border border-white" />
              <span>Overig</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
