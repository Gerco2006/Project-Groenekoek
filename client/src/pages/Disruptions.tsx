import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, Construction, ChevronRight, X, Map, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DisruptionDetailPanel from "@/components/DisruptionDetailPanel";
import DisruptionsMap from "@/components/DisruptionsMap";
import StationSearch from "@/components/StationSearch";
import MasterDetailLayout from "@/components/MasterDetailLayout";
import PageContainer from "@/components/PageContainer";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Disruption {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  start?: string;
  end?: string;
  timespans?: Array<{
    start: string;
    end: string;
  }>;
  summaryAdditionalTravelTime?: {
    label: string;
    shortLabel: string;
  };
  publicationSections?: Array<{
    section: {
      stations?: Array<{
        stationCode: string;
        name: string;
        coordinate?: {
          lat: number;
          lng: number;
        };
      }>;
    };
  }>;
}

export default function Disruptions() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive">("active");
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [stationFilter, setStationFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const station = params.get("station");
    if (station) {
      setStationFilter(station);
    }
  }, []);


  const { data: disruptionsData, isLoading } = useQuery<any>({
    queryKey: ["/api/disruptions"],
    queryFn: async () => {
      const response = await fetch(`/api/disruptions`);
      if (!response.ok) {
        throw new Error("Failed to fetch disruptions");
      }
      return response.json();
    },
  });

  const allDisruptions: Disruption[] = Array.isArray(disruptionsData) ? disruptionsData : (disruptionsData?.payload || []);
  
  const disruptions = allDisruptions.filter(d => {
    const activeMatch = activeFilter === "active" ? d.isActive === true : d.isActive === false;
    
    if (!stationFilter) {
      return activeMatch;
    }
    
    const stationMatch = d.publicationSections?.some(section => 
      section.section.stations?.some(station => 
        station.name.toLowerCase().includes(stationFilter.toLowerCase())
      )
    ) || d.title.toLowerCase().includes(stationFilter.toLowerCase());
    
    return activeMatch && stationMatch;
  });

  useEffect(() => {
    if (selectedDisruption) {
      const stillInList = disruptions.some(d => d.id === selectedDisruption.id);
      if (!stillInList) {
        setSelectedDisruption(null);
      }
    }
  }, [disruptions, selectedDisruption]);

  useEffect(() => {
    if (isMobile) {
      setSelectedDisruption(null);
    }
  }, [activeFilter, stationFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("nl-NL", { 
      day: "2-digit", 
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getDisruptionIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return <Construction className="w-5 h-5 text-orange-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };

  const getDisruptionType = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return "Werkzaamheden";
    }
    return "Storing";
  };

  const listContent = (
    <div className="space-y-4">
      {isLoading && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>Laden...</p>
        </Card>
      )}

      {!isLoading && disruptions.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>
            {activeFilter === "active" 
              ? "Geen actieve storingen of werkzaamheden bekend" 
              : "Geen geplande werkzaamheden bekend"}
          </p>
        </Card>
      )}

      {!isLoading && disruptions.length > 0 && (
        <div className="space-y-4">
          {disruptions.map((disruption) => {
            const startTime = disruption.start || disruption.timespans?.[0]?.start;
            const endTime = disruption.end || disruption.timespans?.[0]?.end;
            const stations = disruption.publicationSections?.flatMap(ps => ps.section.stations || []) || [];
            const firstStation = stations[0];
            const lastStation = stations[stations.length - 1];

            return (
              <Card 
                key={disruption.id} 
                className={`p-4 hover-elevate cursor-pointer ${selectedDisruption?.id === disruption.id && !isMobile ? 'border-primary' : ''}`}
                onClick={() => setSelectedDisruption(disruption)}
                data-testid={`card-disruption-${disruption.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getDisruptionIcon(disruption.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={disruption.isActive ? "destructive" : "secondary"}
                        data-testid="badge-disruption-type"
                      >
                        {getDisruptionType(disruption.type)}
                      </Badge>
                      {disruption.summaryAdditionalTravelTime && (
                        <Badge variant="outline">
                          +{disruption.summaryAdditionalTravelTime.shortLabel || disruption.summaryAdditionalTravelTime.label}
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-base mb-2" data-testid="text-disruption-title">
                      {disruption.title}
                    </h3>

                    {firstStation && lastStation && (
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        {firstStation.name === lastStation.name 
                          ? firstStation.name 
                          : `${firstStation.name} - ${lastStation.name}`}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {startTime && (
                        <span>{formatDate(startTime)}</span>
                      )}
                      {endTime && (
                        <span>tot {formatDate(endTime)}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const mapContent = (
    <div className="h-[calc(100vh-280px)] md:h-[calc(100vh-220px)] min-h-[400px] rounded-lg overflow-hidden border">
      <DisruptionsMap
        disruptions={disruptions}
        onDisruptionClick={(d) => setSelectedDisruption(d)}
        selectedDisruptionId={selectedDisruption?.id}
        isLoading={isLoading}
      />
    </div>
  );

  const masterContent = (
    <div className="min-h-screen bg-background md:px-4 pt-0 pb-3 md:py-6 space-y-4">
      <div className="backdrop-blur-sm bg-card/80 rounded-t-none md:rounded-xl rounded-b-xl p-4 space-y-4 border">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "map" | "list")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map" data-testid="tab-map" className="gap-2">
              <Map className="w-4 h-4" />
              Kaart
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list" className="gap-2">
              <List className="w-4 h-4" />
              Lijst
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <StationSearch
              label="Filter op station"
              value={stationFilter}
              onChange={setStationFilter}
              placeholder="Bijv. Amsterdam Centraal"
              testId="input-station-filter"
            />
          </div>
          
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as "active" | "inactive")} className="shrink-0">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="active" data-testid="tab-active">
                Actief
              </TabsTrigger>
              <TabsTrigger value="inactive" data-testid="tab-inactive">
                Gepland
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {stationFilter && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Gefilterd op: <span className="font-semibold">{stationFilter}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStationFilter("")}
              data-testid="button-clear-filter"
            >
              <X className="w-4 h-4 mr-1" />
              Wis
            </Button>
          </div>
        )}
      </div>

      {viewMode === "map" ? mapContent : listContent}
    </div>
  );

  const detailPanel = selectedDisruption ? (
    <DisruptionDetailPanel
      open={!!selectedDisruption}
      onClose={() => setSelectedDisruption(null)}
      disruptionId={selectedDisruption.id}
      disruptionType={selectedDisruption.type}
    />
  ) : null;

  return (
    <PageContainer>
      <MasterDetailLayout
        master={masterContent}
        detail={detailPanel}
        hasDetail={!!selectedDisruption}
      />
    </PageContainer>
  );
}
