import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Construction, ChevronRight, MapPin, Clock, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DisruptionDetailPanel from "@/components/DisruptionDetailPanel";
import StationSearch from "@/components/StationSearch";
import MasterDetailLayout from "@/components/MasterDetailLayout";
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
      }>;
    };
  }>;
}

export default function Disruptions() {
  const isMobile = useIsMobile();
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

  // Clear selection if selected disruption is no longer in filtered list
  useEffect(() => {
    if (selectedDisruption) {
      const stillInList = disruptions.some(d => d.id === selectedDisruption.id);
      if (!stillInList) {
        setSelectedDisruption(null);
      }
    }
  }, [disruptions, selectedDisruption]);

  // Clear selection when filters change on mobile only
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

  const masterContent = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Storingen & Werkzaamheden</h1>
        <p className="text-muted-foreground">Bekijk actuele en geplande verstoringen</p>
      </div>

      <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
        <StationSearch
          label="Filter op station (optioneel)"
          value={stationFilter}
          onChange={setStationFilter}
          placeholder="Bijv. Amsterdam Centraal"
          testId="input-station-filter"
        />
        {stationFilter && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Storingen gefilterd op: <span className="font-semibold">{stationFilter}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStationFilter("")}
              data-testid="button-clear-filter"
            >
              <X className="w-4 h-4 mr-1" />
              Wis filter
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as "active" | "inactive")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" data-testid="tab-active">
            Actief
          </TabsTrigger>
          <TabsTrigger value="inactive" data-testid="tab-inactive">
            Gepland
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
            const affectedStations = disruption.publicationSections
              ?.flatMap(ps => ps.section.stations || [])
              .slice(0, 3);

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

                    {affectedStations && affectedStations.length > 0 && (
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        {affectedStations.map(s => s.name).join(" - ")}
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

  const detailPanel = selectedDisruption ? (
    <DisruptionDetailPanel
      open={!!selectedDisruption}
      onClose={() => setSelectedDisruption(null)}
      disruptionId={selectedDisruption.id}
      disruptionType={selectedDisruption.type}
    />
  ) : null;

  return (
    <div className="max-w-6xl mx-auto h-full overflow-hidden">
      <MasterDetailLayout
        master={masterContent}
        detail={detailPanel}
        hasDetail={!!selectedDisruption}
      />
    </div>
  );
}
