import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Construction, Clock, MapPin, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DisruptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disruptionId: string;
  disruptionType: string;
}

export default function DisruptionDialog({
  open,
  onOpenChange,
  disruptionId,
  disruptionType,
}: DisruptionDialogProps) {
  const { data: disruptionData, isLoading } = useQuery<any>({
    queryKey: ["/api/disruptions", disruptionType, disruptionId],
    enabled: open && !!disruptionId && !!disruptionType,
    queryFn: async () => {
      const response = await fetch(`/api/disruptions/${disruptionType}/${disruptionId}`);
      if (!response.ok) throw new Error("Failed to fetch disruption details");
      return response.json();
    },
    retry: 1,
  });

  const disruption = disruptionData?.payload;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("nl-NL", { 
      weekday: "long",
      day: "numeric", 
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getDisruptionIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || "";
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return <Construction className="w-6 h-6 text-orange-500" />;
    }
    return <AlertTriangle className="w-6 h-6 text-destructive" />;
  };

  const getDisruptionTypeName = (type: string) => {
    const lowerType = type?.toLowerCase() || "";
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return "Werkzaamheden";
    }
    return "Storing";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="dialog-disruption-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {disruption && getDisruptionIcon(disruption.type || disruptionType)}
            <span className="text-xl">
              {disruption?.title || "Storing details"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : disruption ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={disruption.isActive ? "destructive" : "secondary"}
                  data-testid="badge-status"
                >
                  {disruption.isActive ? "Actief" : "Gepland"}
                </Badge>
                <Badge variant="outline">
                  {getDisruptionTypeName(disruption.type || disruptionType)}
                </Badge>
                {disruption.summaryAdditionalTravelTime && (
                  <Badge variant="outline">
                    +{disruption.summaryAdditionalTravelTime.shortLabel || disruption.summaryAdditionalTravelTime.label}
                  </Badge>
                )}
              </div>

              {(disruption.start || disruption.end || disruption.timespans) && (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Periode</p>
                      {disruption.timespans && disruption.timespans.length > 0 ? (
                        <div className="space-y-2">
                          {disruption.timespans.map((timespan: any, idx: number) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              <p>{formatDateTime(timespan.start)}</p>
                              {timespan.end && <p>tot {formatDateTime(timespan.end)}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {disruption.start && <p>{formatDateTime(disruption.start)}</p>}
                          {disruption.end && <p>tot {formatDateTime(disruption.end)}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {disruption.publicationSections && disruption.publicationSections.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold text-sm">Getroffen trajecten</p>
                      {disruption.publicationSections.map((section: any, idx: number) => {
                        const stations = section.section?.stations || [];
                        if (stations.length === 0) return null;
                        
                        return (
                          <div key={idx} className="text-sm">
                            <p className="font-medium">
                              {stations.map((s: any) => s.name).join(" - ")}
                            </p>
                            {section.section?.direction && (
                              <p className="text-muted-foreground">
                                Richting: {section.section.direction}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}

              {disruption.alternativeTransportTimespans && disruption.alternativeTransportTimespans.length > 0 && (
                <Card className="p-4 bg-blue-500/10 border-blue-500/20">
                  <p className="font-semibold text-sm mb-2">Vervangend vervoer</p>
                  {disruption.alternativeTransportTimespans.map((alt: any, idx: number) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      {alt.alternativeTransport?.label && (
                        <p>{alt.alternativeTransport.label}</p>
                      )}
                    </div>
                  ))}
                </Card>
              )}

              {disruption.expectedDuration && (
                <Card className="p-4">
                  <p className="font-semibold text-sm mb-1">Verwachte duur</p>
                  <p className="text-sm text-muted-foreground">
                    {disruption.expectedDuration.description}
                  </p>
                </Card>
              )}

              {disruption.summaryAdditionalTravelTime?.label && (
                <Card className="p-4">
                  <p className="font-semibold text-sm mb-1">Extra reistijd</p>
                  <p className="text-sm text-muted-foreground">
                    {disruption.summaryAdditionalTravelTime.label}
                  </p>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Geen details beschikbaar</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
