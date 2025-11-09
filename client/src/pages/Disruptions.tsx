import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Construction, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import DisruptionDialog from "@/components/DisruptionDialog";

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
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive">("active");
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);

  const { data: disruptionsData, isLoading } = useQuery<any>({
    queryKey: ["/api/disruptions", activeFilter],
    queryFn: async () => {
      const isActive = activeFilter === "active" ? "true" : "false";
      const response = await fetch(`/api/disruptions?isActive=${isActive}`);
      if (!response.ok) {
        throw new Error("Failed to fetch disruptions");
      }
      return response.json();
    },
  });

  const disruptions: Disruption[] = disruptionsData?.payload || [];

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Storingen & Werkzaamheden</h1>
          <p className="text-muted-foreground">Bekijk actuele en geplande verstoringen</p>
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
                ? "Geen actieve storingen of werkzaamheden" 
                : "Geen geplande werkzaamheden"}
            </p>
          </Card>
        )}

        {!isLoading && disruptions.length > 0 && (
          <div className="space-y-3">
            {disruptions.map((disruption) => {
              const startTime = disruption.start || disruption.timespans?.[0]?.start;
              const endTime = disruption.end || disruption.timespans?.[0]?.end;
              const affectedStations = disruption.publicationSections
                ?.flatMap(ps => ps.section.stations || [])
                .slice(0, 3);

              return (
                <Card 
                  key={disruption.id} 
                  className="p-4 hover-elevate cursor-pointer"
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
                        <p className="text-sm text-muted-foreground mb-2">
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

        {selectedDisruption && (
          <DisruptionDialog
            open={!!selectedDisruption}
            onOpenChange={(open) => !open && setSelectedDisruption(null)}
            disruptionId={selectedDisruption.id}
            disruptionType={selectedDisruption.type}
          />
        )}
      </div>
    </div>
  );
}
