import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Construction, X, Plus, Loader2, ChevronRight } from "lucide-react";
import type { DisruptionStation } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import StationSearch from "./StationSearch";
import DisruptionDetailPanel from "./DisruptionDetailPanel";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface DisruptionsWidgetProps {
  stations: DisruptionStation[];
  onStationAdd: (stationName: string) => void;
  onStationRemove: (id: string) => void;
}

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

export default function DisruptionsWidget({
  stations,
  onStationAdd,
  onStationRemove,
}: DisruptionsWidgetProps) {
  const isMobile = useIsMobile();
  const [newStationName, setNewStationName] = useState("");
  const [isAddingStation, setIsAddingStation] = useState(false);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);

  const { data: allDisruptions, isLoading } = useQuery<any>({
    queryKey: ["/api/disruptions"],
    enabled: stations.length > 0,
  });

  const disruptions: Disruption[] = Array.isArray(allDisruptions)
    ? allDisruptions
    : allDisruptions?.payload || [];

  const getDisruptionIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return <Construction className="w-4 h-4 text-orange-500" />;
    }
    return <AlertTriangle className="w-4 h-4 text-destructive" />;
  };

  const getDisruptionType = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return "Werkzaamheden";
    }
    return "Storing";
  };

  const getStationDisruptions = (stationName: string) => {
    return disruptions
      .filter((d) => {
        if (!d.isActive) return false;
        return d.publicationSections?.some((section) =>
          section.section.stations?.some((station) =>
            station.name.toLowerCase().includes(stationName.toLowerCase())
          )
        );
      })
      .slice(0, 3);
  };

  const handleAddStation = () => {
    if (!newStationName.trim()) return;
    onStationAdd(newStationName.trim());
    setNewStationName("");
    setIsAddingStation(false);
  };

  const canAddMoreStations = stations.length < 3;

  // Bereken totaal aantal zichtbare storingen
  const totalDisruptionsCount = stations.reduce((total, station) => {
    const stationDisruptions = getStationDisruptions(station.stationName);
    return total + stationDisruptions.length;
  }, 0);

  const widgetContent = (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Storingen & Werkzaamheden</h3>
        {totalDisruptionsCount > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {totalDisruptionsCount}
          </Badge>
        )}
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Voeg tot 3 stations toe om hun storingen en werkzaamheden te volgen
          </p>
          {!isAddingStation ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingStation(true)}
              className="gap-2"
              data-testid="button-add-first-station"
            >
              <Plus className="w-4 h-4" />
              Station toevoegen
            </Button>
          ) : (
            <div className="space-y-2">
              <StationSearch
                label="Station"
                value={newStationName}
                onChange={setNewStationName}
                placeholder="Bijv. Amsterdam Centraal"
                testId="input-disruption-station"
              />
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={handleAddStation} data-testid="button-confirm-add-station">
                  Toevoegen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingStation(false);
                    setNewStationName("");
                  }}
                  data-testid="button-cancel-add-station"
                >
                  Annuleren
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {stations.map((station) => {
            const stationDisruptions = getStationDisruptions(station.stationName);
            const hasDisruptions = stationDisruptions.length > 0;

            return (
              <Card key={station.id} className="p-2 md:overflow-visible overflow-visible">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 md:mb-2">
                      <h4 className="font-semibold text-sm">{station.stationName}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStationRemove(station.id)}
                        className="opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
                        data-testid={`button-remove-station-${station.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {hasDisruptions && (
                      <div className="md:hidden -mx-2 mb-0">
                        <Separator />
                      </div>
                    )}

                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Laden...</span>
                      </div>
                    ) : hasDisruptions ? (
                      <div className="md:space-y-2 md:px-0 -mx-2 md:mx-0 -mb-2 md:mb-0">
                        {stationDisruptions.map((disruption, idx) => {
                          const isLast = idx === stationDisruptions.length - 1;
                          
                          return (
                          <div key={disruption.id}>
                            <div
                              className="md:p-2 py-2 px-2 md:rounded-md md:border hover-elevate cursor-pointer"
                              onClick={() => setSelectedDisruption(disruption)}
                              data-testid={`disruption-item-${disruption.id}`}
                            >
                              <div className="flex items-start gap-2 text-sm">
                                {getDisruptionIcon(disruption.type)}
                                <div className="flex-1 min-w-0">
                                  <Badge variant="secondary" className="text-xs mb-1">
                                    {getDisruptionType(disruption.type)}
                                  </Badge>
                                  <p className="text-xs leading-relaxed line-clamp-2">{disruption.title}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              </div>
                            </div>
                            {!isLast && <Separator className="md:hidden" />}
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Geen actieve storingen of werkzaamheden
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {canAddMoreStations && !isAddingStation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingStation(true)}
              className="w-full gap-2"
              data-testid="button-add-another-station"
            >
              <Plus className="w-4 h-4" />
              Station toevoegen ({stations.length}/3)
            </Button>
          )}

          {isAddingStation && (
            <Card className="p-4">
              <div className="space-y-2">
                <StationSearch
                  label="Station toevoegen"
                  value={newStationName}
                  onChange={setNewStationName}
                  placeholder="Bijv. Rotterdam Centraal"
                  testId="input-add-disruption-station"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStation} data-testid="button-confirm-add-another-station">
                    Toevoegen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingStation(false);
                      setNewStationName("");
                    }}
                    data-testid="button-cancel-add-another-station"
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <>
      {widgetContent}
      {selectedDisruption && (
        <DisruptionDetailPanel
          disruptionId={selectedDisruption.id}
          disruptionType={selectedDisruption.type}
          open={!!selectedDisruption}
          onClose={() => setSelectedDisruption(null)}
        />
      )}
    </>
  );
}
