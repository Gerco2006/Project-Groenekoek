import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, AlertCircle, Navigation, Loader2, Info } from "lucide-react";
import TrainBadge from "./TrainBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

        {!isLoading && (
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
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-1">
              {displayedStops.map((stop: any, displayIdx: number) => {
                const isPassing = stop.status === "PASSING";
                const originalIdx = allStops.indexOf(stop);
                const isCurrentLocation = currentLocationIndex === originalIdx;
                const isBetweenStops = currentLocationIndex === originalIdx - 0.5;
                
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
                      <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg mb-1">
                        <Navigation className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Trein rijdt nu tussen stations
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        isPassing ? "opacity-60" : "hover-elevate"
                      } ${isCurrentLocation ? "bg-primary/10 border-2 border-primary" : ""}`}
                      data-testid={`row-stop-${originalIdx}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          {isCurrentLocation ? (
                            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
                          ) : originalIdx === 0 ? (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          ) : originalIdx === allStops.length - 1 ? (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          ) : isPassing ? (
                            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                          )}
                          {originalIdx < allStops.length - 1 && (
                            <div className={`absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-[52px] ${
                              isPassing ? "bg-border/50" : "bg-border"
                            }`} />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${isPassing ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
                            <span className={`font-semibold ${isPassing ? "text-muted-foreground" : ""}`}>
                              {stop.stop?.name}
                            </span>
                            {isCurrentLocation && (
                              <Badge variant="default" className="ml-2">
                                <Navigation className="w-3 h-3 mr-1" />
                                Nu hier
                              </Badge>
                            )}
                          </div>
                          
                          {isPassing ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Trein stopt hier niet</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              {arrivalTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Aankomst: {arrivalTime}
                                  {arrivalDelay > 0 && (
                                    <span className="text-destructive font-semibold ml-1">
                                      +{arrivalDelay}
                                    </span>
                                  )}
                                </div>
                              )}
                              {departureTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Vertrek: {departureTime}
                                  {departureDelay > 0 && (
                                    <span className="text-destructive font-semibold ml-1">
                                      +{departureDelay}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {platform && !isPassing && (
                          <div className="bg-primary/10 text-primary px-3 py-1 rounded font-semibold text-sm">
                            Spoor {platform}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
