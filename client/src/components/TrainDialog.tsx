import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, AlertCircle, Navigation, Loader2, Info, Train, Wifi, Component, UtensilsCrossed, Accessibility, BatteryCharging, ChevronDown, ChevronUp, Droplet, Bike } from "lucide-react";
import TrainBadge from "./TrainBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
}

export default function TrainDialog({
  open,
  onOpenChange,
  trainType,
  trainNumber,
  from,
  to,
}: TrainDialogProps) {
  const [showAllStations, setShowAllStations] = useState(false);
  const [trainInfoOpen, setTrainInfoOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!open) {
      setShowAllStations(false);
      setTrainInfoOpen(true);
    }
  }, [open]);
  
  const { data: journeyData, isLoading } = useQuery<any>({
    queryKey: ["/api/journey", trainNumber],
    enabled: open && !!trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${trainNumber}`);
      if (!response.ok) throw new Error("Kon rit informatie niet ophalen");
      return response.json();
    },
    retry: 1,
  });

  const formatTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const calculateDelay = (planned: string, actual: string) => {
    if (!planned || !actual) return 0;
    const plannedTime = new Date(planned).getTime();
    const actualTime = new Date(actual).getTime();
    return Math.round((actualTime - plannedTime) / 60000);
  };

  const getCurrentLocation = () => {
    if (!journeyData?.payload?.stops) return null;
    const now = new Date();
    const stops = journeyData.payload.stops;
    
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const departure = stop.departures?.[0];
      const arrival = stop.arrivals?.[0];
      
      const departureTime = departure?.actualTime || departure?.plannedTime;
      const arrivalTime = arrival?.actualTime || arrival?.plannedTime;
      
      // Check if we haven't arrived at this stop yet
      if (arrivalTime && new Date(arrivalTime) > now) {
        if (i === 0) return null; // Haven't started yet
        // Between previous stop and this stop
        return i - 0.5;
      }
      
      // Check if we're at this stop (arrived but not departed)
      if (departureTime && new Date(departureTime) > now) {
        return i;
      }
    }
    
    // If we've passed all departure times, we're at the final destination
    const lastStop = stops[stops.length - 1];
    const lastArrival = lastStop?.arrivals?.[0];
    const lastArrivalTime = lastArrival?.actualTime || lastArrival?.plannedTime;
    if (lastArrivalTime && new Date(lastArrivalTime) <= now) {
      return stops.length - 1;
    }
    
    return null;
  };

  const currentLocationIndex = getCurrentLocation();
  const allStops = journeyData?.payload?.stops || [];
  const displayedStops = showAllStations 
    ? allStops 
    : allStops.filter((stop: any) => stop.status !== "PASSING");
  
  // Get train composition from first stop with stock data
  const firstStopWithStock = allStops.find((stop: any) => stop.actualStock || stop.plannedStock);
  const actualStock = firstStopWithStock?.actualStock;
  const plannedStock = firstStopWithStock?.plannedStock;
  
  // Check if this is a bus, tram, or metro
  const isNonTrainTransport = trainType && (
    trainType.toLowerCase().includes('bus') ||
    trainType.toLowerCase().includes('tram') ||
    trainType.toLowerCase().includes('metro')
  );

  // Map facility names to icons
  const getFacilityIcon = (facilityName: string) => {
    const name = facilityName.toLowerCase();
    if (name.includes('wifi') || name.includes('internet')) {
      return <Wifi className="w-3.5 h-3.5" />;
    }
    if (name.includes('toilet') || name.includes('wc')) {
      return <Droplet className="w-3.5 h-3.5" />;
    }
    if (name.includes('bistro') || name.includes('restaurant') || name.includes('eten')) {
      return <UtensilsCrossed className="w-3.5 h-3.5" />;
    }
    if (name.includes('toegankelijk') || name.includes('rolstoel')) {
      return <Accessibility className="w-3.5 h-3.5" />;
    }
    if (name.includes('fiets')) {
      return <Bike className="w-3.5 h-3.5" />;
    }
    if (name.includes('stopcontact') || name.includes('stroom')) {
      return <BatteryCharging className="w-3.5 h-3.5" />;
    }
    return null;
  };
  
  // Scroll to current location when dialog opens
  useEffect(() => {
    if (!open || !journeyData?.payload?.stops || currentLocationIndex === null || currentLocationIndex < 0) {
      return;
    }

    const scrollToCurrentStop = () => {
      const targetIndex = Math.floor(currentLocationIndex);
      const stopElement = document.querySelector(`[data-testid="row-stop-${targetIndex}"]`) as HTMLElement;
      const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      
      if (stopElement && scrollViewport) {
        // Calculate position to scroll the current stop to roughly 1/4 from top
        const elementTop = stopElement.offsetTop;
        const viewportHeight = scrollViewport.clientHeight;
        const scrollPosition = Math.max(0, elementTop - viewportHeight / 4);
        
        scrollViewport.scrollTop = scrollPosition;
      }
    };

    // Try multiple times to ensure DOM is ready
    const timeouts = [100, 300, 500];
    timeouts.forEach(delay => {
      setTimeout(scrollToCurrentStop, delay);
    });
  }, [open, journeyData?.payload?.stops, currentLocationIndex]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="dialog-train-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrainBadge type={trainType} number={trainNumber} />
            <span className="text-xl">
              {from} → {to}
            </span>
          </DialogTitle>
        </DialogHeader>


        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isNonTrainTransport ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">Geen gegevens beschikbaar</p>
              <p className="text-sm text-muted-foreground max-w-md">
                De NS API geeft helaas geen rit-informatie voor bussen, trams en metro's. 
                Het is onduidelijk of deze functionaliteit in de toekomst beschikbaar komt.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Train Material Information */}
            {(actualStock || plannedStock) && (
              <Collapsible open={trainInfoOpen} onOpenChange={setTrainInfoOpen} className="mb-3">
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full p-4 h-auto hover:bg-transparent no-default-hover-elevate justify-start" data-testid="button-toggle-train-info">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 font-semibold">
                          <Train className="w-5 h-5" />
                          <span>Treinsamenstelling</span>
                        </div>
                        {trainInfoOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Train Type and Number */}
                      <div className="grid grid-cols-2 gap-3">
                        {(actualStock?.trainType || plannedStock?.trainType) && (
                          <div className="space-y-1.5">
                            <div className="text-xs text-muted-foreground font-medium">Materieeltype</div>
                            <Badge variant="secondary" className="text-sm">{actualStock?.trainType || plannedStock?.trainType}</Badge>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <div className="text-xs text-muted-foreground font-medium">Treinnummer</div>
                          <Badge variant="secondary" className="text-sm">{trainNumber}</Badge>
                        </div>
                      </div>

                      {/* Number of Parts */}
                      {(actualStock?.numberOfParts || plannedStock?.numberOfParts) && (
                        <div className="grid grid-cols-2 gap-3">
                          {plannedStock?.numberOfParts && (
                            <div className="space-y-1.5">
                              <div className="text-xs text-muted-foreground font-medium">Gepland aantal bakken</div>
                              <div className="text-lg font-semibold">{plannedStock.numberOfParts}</div>
                            </div>
                          )}
                          {actualStock?.numberOfParts && (
                            <div className="space-y-1.5">
                              <div className="text-xs text-muted-foreground font-medium">Actueel aantal bakken</div>
                              <Badge 
                                variant="secondary"
                                className={`text-lg font-semibold h-auto py-1 ${
                                  plannedStock?.numberOfParts 
                                    ? actualStock.numberOfParts > plannedStock.numberOfParts
                                      ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
                                      : actualStock.numberOfParts < plannedStock.numberOfParts
                                      ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                                      : ""
                                    : ""
                                }`}
                              >
                                {actualStock.numberOfParts}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Facilities */}
                      {(() => {
                        const trainParts = actualStock?.trainParts || plannedStock?.trainParts || [];
                        const uniqueFacilities = Array.from(new Set(
                          trainParts
                            .flatMap((part: any) => part.facilities || [])
                            .map((facility: any) => facility.name || facility.code || facility)
                        ));
                        
                        return uniqueFacilities.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground font-medium">Faciliteiten</div>
                            <div className="flex flex-wrap gap-2">
                              {uniqueFacilities.map((facility, fIdx: number) => {
                                const icon = getFacilityIcon(String(facility));
                                return icon ? (
                                  <div 
                                    key={fIdx} 
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground"
                                    title={String(facility)}
                                  >
                                    {icon}
                                    <span className="text-xs font-medium">{String(facility)}</span>
                                  </div>
                                ) : (
                                  <Badge key={fIdx} variant="outline" className="text-xs">
                                    {String(facility)}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {!isNonTrainTransport && (
              <div className="flex justify-start mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllStations(!showAllStations)}
                  className="gap-2"
                  data-testid="button-toggle-all-stations"
                >
                  <Info className="w-4 h-4" />
                  {showAllStations ? "Toon alleen stops" : "Toon alle stations"}
                </Button>
              </div>
            )}

            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 overflow-auto">
              <div className="space-y-2">
              {displayedStops.map((stop: any, displayIdx: number) => {
                const isPassing = stop.status === "PASSING";
                const originalIdx = allStops.indexOf(stop);
                const isCurrentLocation = currentLocationIndex === originalIdx;
                const isBetweenStops = currentLocationIndex === originalIdx - 0.5;
                const isPast = currentLocationIndex !== null && 
                              !isBetweenStops && 
                              !isCurrentLocation && 
                              originalIdx < Math.floor(currentLocationIndex);
                
                // Get arrival and departure info from arrays
                const arrival = stop.arrivals?.[0];
                const departure = stop.departures?.[0];
                
                const arrivalTime = formatTime(arrival?.actualTime || arrival?.plannedTime);
                const departureTime = formatTime(departure?.actualTime || departure?.plannedTime);
                const arrivalDelay = calculateDelay(arrival?.plannedTime, arrival?.actualTime);
                const departureDelay = calculateDelay(departure?.plannedTime, departure?.actualTime);
                const platform = arrival?.actualTrack || arrival?.plannedTrack || 
                                departure?.actualTrack || departure?.plannedTrack;

                return (
                  <div key={originalIdx}>
                    {isBetweenStops && (
                      <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg mb-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Trein rijdt nu tussen stations
                        </span>
                      </div>
                    )}
                    <div
                      className={`bg-card border rounded-lg p-3 ${
                        isPassing ? "opacity-60" : isPast ? "opacity-50" : "hover-elevate"
                      } ${isCurrentLocation ? "border-primary border-2 bg-primary/5" : ""}`}
                      data-testid={`row-stop-${originalIdx}`}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <div className="flex flex-col items-center pt-1">
                          {isCurrentLocation ? (
                            <div className="w-4 h-4 rounded-full bg-primary animate-pulse shrink-0" />
                          ) : originalIdx === 0 ? (
                            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                          ) : originalIdx === allStops.length - 1 ? (
                            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                          ) : isPassing ? (
                            <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-primary bg-background shrink-0" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-semibold ${isPassing ? "text-muted-foreground" : ""}`}>
                              {stop.stop?.name}
                            </span>
                            {isCurrentLocation && (
                              <Badge variant="default" className="shrink-0">
                                <Navigation className="w-3 h-3 mr-1" />
                                Nu hier
                              </Badge>
                            )}
                          </div>
                          
                          {isPassing ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="w-3 h-3" />
                              <span>Trein stopt hier niet</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {arrivalTime && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Aankomst:</span>
                                  <span className="font-medium">{arrivalTime}</span>
                                  {arrivalDelay > 0 && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                      +{arrivalDelay}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {departureTime && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Vertrek:</span>
                                  <span className="font-medium">{departureTime}</span>
                                  {departureDelay > 0 && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                      +{departureDelay}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {platform && !isPassing && (
                          <Badge variant="outline" className="shrink-0">
                            Spoor {platform}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
