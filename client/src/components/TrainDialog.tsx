import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, AlertCircle, Navigation, Loader2, Info, Train, Wifi, Component } from "lucide-react";
import TrainBadge from "./TrainBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";

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
  
  useEffect(() => {
    if (!open) {
      setShowAllStations(false);
    }
  }, [open]);
  
  const { data: journeyData, isLoading } = useQuery<any>({
    queryKey: ["/api/journey", trainNumber],
    enabled: open && !!trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${trainNumber}`);
      if (!response.ok) throw new Error("Failed to fetch journey details");
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]" data-testid="dialog-train-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrainBadge type={trainType} number={trainNumber} />
            <span className="text-xl">
              {from} → {to}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!isLoading && !isNonTrainTransport && (
          <div className="flex justify-end -mt-2 mb-2">
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
                De NS API geeft helaas geen journey-informatie voor bussen, trams en metro's. 
                Het is onduidelijk of deze functionaliteit in de toekomst beschikbaar komt.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Train Material Information */}
            {(actualStock || plannedStock) && (
              <Card className="p-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Train className="w-4 h-4" />
                    <span>Treinsamenstelling</span>
                  </div>
                  
                  {(actualStock?.trainType || plannedStock?.trainType) && (
                    <div className="flex items-center gap-2">
                      <Component className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Materieeltype:</span>
                      <Badge variant="secondary">{actualStock?.trainType || plannedStock?.trainType}</Badge>
                    </div>
                  )}
                  
                  {(actualStock?.numberOfParts || plannedStock?.numberOfParts) && (
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {actualStock?.numberOfParts ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Actueel aantal bakken:</span>
                            <span className="font-medium">{actualStock.numberOfParts}</span>
                          </div>
                          {plannedStock?.numberOfParts && actualStock.numberOfParts !== plannedStock.numberOfParts && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Gepland aantal bakken:</span>
                              <span className="font-medium">{plannedStock.numberOfParts}</span>
                            </div>
                          )}
                        </>
                      ) : plannedStock?.numberOfParts && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Gepland aantal bakken:</span>
                          <span className="font-medium">{plannedStock.numberOfParts}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(() => {
                    const trainParts = actualStock?.trainParts || plannedStock?.trainParts || [];
                    const hasFacilities = trainParts.some((part: any) => part.facilities && part.facilities.length > 0);
                    
                    return hasFacilities && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Wifi className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(new Set(
                              trainParts
                                .flatMap((part: any) => part.facilities || [])
                                .map((facility: any) => facility.name || facility.code || facility)
                            )).map((facility, fIdx: number) => (
                              <Badge key={fIdx} variant="outline" className="text-xs">
                                {String(facility)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            )}

            <ScrollArea className="max-h-[60vh] pr-4">
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
                                    <span className="text-destructive font-semibold">
                                      +{arrivalDelay} min
                                    </span>
                                  )}
                                </div>
                              )}
                              {departureTime && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Vertrek:</span>
                                  <span className="font-medium">{departureTime}</span>
                                  {departureDelay > 0 && (
                                    <span className="text-destructive font-semibold">
                                      +{departureDelay} min
                                    </span>
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
