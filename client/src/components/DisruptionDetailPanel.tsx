import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Construction, Clock, MapPin, Loader2, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRef } from "react";

interface DisruptionDetailPanelProps {
  open: boolean;
  onClose: () => void;
  disruptionId: string;
  disruptionType: string;
}

export default function DisruptionDetailPanel({
  open,
  onClose,
  disruptionId,
  disruptionType,
}: DisruptionDetailPanelProps) {
  const isMobile = useIsMobile();
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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

  const disruption = disruptionData?.payload || disruptionData;

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
      return <Construction className="w-5 h-5 text-orange-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };

  const getDisruptionTypeName = (type: string) => {
    const lowerType = type?.toLowerCase() || "";
    if (lowerType.includes("werkzaam") || lowerType.includes("maintenance")) {
      return "Werkzaamheden";
    }
    return "Storing";
  };

  const content = (
    <div className={`flex flex-col ${isMobile ? '' : 'h-full'}`}>
      {!isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {disruption && getDisruptionIcon(disruption.type || disruptionType)}
            <h2 className="font-semibold text-lg truncate">
              {disruption?.title || "Storing details"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-disruption-detail"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className={`${isMobile ? 'p-4 space-y-8' : 'flex-1 overflow-y-auto'}`}>
        <div className={`${isMobile ? '' : 'p-4 space-y-8'}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : disruption ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>Geen details beschikbaar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(newOpen) => !newOpen && onClose()} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[85vh] flex flex-col" data-testid="drawer-disruption-detail">
          <DrawerHeader className="border-b shrink-0 pl-3 pr-1 py-2.5">
            <DrawerTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {disruption && getDisruptionIcon(disruption.type || disruptionType)}
                <span className="text-xs truncate" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0
                }}>{disruption?.title || "Storing details"}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0"
                data-testid="button-close-mobile-disruption"
              >
                <X className="w-4 h-4" />
              </Button>
            </DrawerTitle>
          </DrawerHeader>
          <div ref={mobileScrollRef} className="flex-1 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className="h-full border-l bg-card" data-testid="panel-disruption-detail">
      {content}
    </div>
  );
}
