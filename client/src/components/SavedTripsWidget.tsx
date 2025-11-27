import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, ArrowRight, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import type { SavedTrip } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";

interface LiveDelayData {
visibleDelay: number | undefined;
  cancelled: boolean;
  status: string | undefined;
}

interface SavedTripsWidgetProps {
  trips: SavedTrip[];
  onTripClick: (trip: SavedTrip) => void;
  onTripRemove: (id: string) => void;
}

async function fetchLiveDelayForTrip(trip: SavedTrip): Promise<LiveDelayData | null> {
  try {
    const now = new Date();
    const departureTime = new Date(trip.departureTime);
    
    // Don't fetch for trips that have already departed more than 2 hours ago
    if (departureTime < new Date(now.getTime() - 2 * 60 * 60 * 1000)) {
      return null;
    }
    
    // Get the train number from the first leg
    const trainNumber = trip.legs?.[0]?.trainNumber;
    if (!trainNumber) return null;
    
    // Fetch journey details (same API as ritinfo uses)
    const response = await fetch(`/api/journey?train=${trainNumber}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const stops = data?.payload?.stops;
    if (!stops || stops.length === 0) return null;
    
    // Find the destination stop to get arrival delay
    const fromStation = trip.legs[0]?.from?.toLowerCase();
    const toStation = trip.legs[trip.legs.length - 1]?.to?.toLowerCase();
    
    let departureDelay = 0;
    let arrivalDelay = 0;
    let cancelled = false;
    
    for (const stop of stops) {
      const stopName = stop.stop?.name?.toLowerCase() || '';
      
      if (stopName.includes(fromStation) || fromStation.includes(stopName)) {
        // Found departure station
        if (stop.departures?.[0]) {
          const dep = stop.departures[0];
          if (dep.plannedTime && dep.actualTime) {
            const planned = new Date(dep.plannedTime).getTime();
            const actual = new Date(dep.actualTime).getTime();
            departureDelay = Math.round((actual - planned) / 60000);
          }
          if (dep.cancelled) cancelled = true;
        }
      }
      
      if (stopName.includes(toStation) || toStation.includes(stopName)) {
        // Found arrival station
        if (stop.arrivals?.[0]) {
          const arr = stop.arrivals[0];
          if (arr.plannedTime && arr.actualTime) {
            const planned = new Date(arr.plannedTime).getTime();
            const actual = new Date(arr.actualTime).getTime();
            arrivalDelay = Math.round((actual - planned) / 60000);
          }
          if (arr.cancelled) cancelled = true;
        }
      }
    }
    
    const visibleDelay = Math.max(departureDelay, arrivalDelay);
    
    return {
      visibleDelay: visibleDelay > 0 ? visibleDelay : undefined,
      cancelled,
      status: data?.payload?.notes?.[0]?.text,
    };
  } catch {
    return null;
  }
}

export default function SavedTripsWidget({ trips, onTripClick, onTripRemove }: SavedTripsWidgetProps) {
  const [liveDelays, setLiveDelays] = useState<Map<string, LiveDelayData>>(new Map());
  
  // Memoize trip IDs to prevent unnecessary refetches
  const tripIds = useMemo(() => trips.map(t => t.id).join(','), [trips]);
  
  const { isFetching, refetch } = useQuery({
    queryKey: ['/api/live-delays', tripIds],
    queryFn: async () => {
      const results = await Promise.all(
        trips.map(async (trip) => {
          const delay = await fetchLiveDelayForTrip(trip);
          return { tripId: trip.id, delay };
        })
      );
      
      const newDelays = new Map<string, LiveDelayData>();
      results.forEach(({ tripId, delay }) => {
        if (delay) {
          newDelays.set(tripId, delay);
        }
      });
      
      setLiveDelays(newDelays);
      return results;
    },
    enabled: trips.length > 0,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  // Clean up stale entries when trips change
  useEffect(() => {
    const tripIdSet = new Set(trips.map(t => t.id));
    setLiveDelays(prev => {
      const newMap = new Map<string, LiveDelayData>();
      prev.forEach((value, key) => {
        if (tripIdSet.has(key)) {
          newMap.set(key, value);
        }
      });
      return newMap;
    });
  }, [trips]);

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    return format(date, "HH:mm", { locale: nl });
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    return format(date, "EEE d MMM", { locale: nl });
  };

  if (trips.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Opgeslagen Reisadviezen</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Je hebt nog geen reisadviezen opgeslagen. Klik op het ster-icoon bij een reisadvies om deze toe te voegen.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Star className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Opgeslagen Reisadviezen</h3>
        <div className="flex items-center gap-2 ml-auto">
          {isFetching && (
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          <Badge variant="secondary">
            {trips.length}
          </Badge>
        </div>
      </div>
      <div className="space-y-2">
        {trips.map((trip) => {
          const liveData = liveDelays.get(trip.id);
          const delay = liveData?.visibleDelay;
          const cancelled = liveData?.cancelled || false;
          const hasLiveData = liveData !== undefined;
          const hasDelay = (delay !== undefined && delay > 0) || cancelled;
          const status = trip.status;
          
          return (
            <Card
              key={trip.id}
              className={`p-3 hover-elevate cursor-pointer group ${cancelled ? 'border-destructive/50' : ''}`}
              onClick={() => onTripClick(trip)}
              data-testid={`saved-trip-${trip.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-semibold text-sm truncate ${cancelled ? 'line-through text-muted-foreground' : ''}`}>
                        {trip.from}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className={`font-semibold text-sm truncate ${cancelled ? 'line-through text-muted-foreground' : ''}`}>
                        {trip.to}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={cancelled ? 'line-through text-muted-foreground' : ''}>
                      {formatTime(trip.departureTime)} → {formatTime(trip.arrivalTime)}
                    </span>
                    {delay !== undefined && delay > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                        +{delay} min
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{formatDate(trip.departureTime)}</span>
                    <span>•</span>
                    <span>{trip.duration}</span>
                    <span>•</span>
                    {trip.transfers === 0 ? (
                      <span>Direct</span>
                    ) : (
                      <span>{trip.transfers} overstap{trip.transfers > 1 ? 'pen' : ''}</span>
                    )}
                    
                    {cancelled ? (
                      <Badge variant="destructive" className="text-xs gap-1 ml-1">
                        <AlertTriangle className="w-3 h-3" />
                        Geannuleerd
                      </Badge>
                    ) : hasLiveData ? (
                      hasDelay ? (
                        <Badge variant="outline" className="text-xs gap-1 ml-1 border-red-500/50 text-red-500">
                          <AlertTriangle className="w-3 h-3" />
                          Vertraagd
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 ml-1 border-green-500/50 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Op tijd
                        </Badge>
                      )
                    ) : null}
                    
                    {status && status !== 'NORMAL' && status !== 'ACCORDING_TO_PLAN' && !cancelled && (
                      <Badge variant="destructive" className="text-xs">
                        {status === 'CANCELLED' ? 'Geannuleerd' : 
                         status === 'DISRUPTED' ? 'Storing' : 
                         status === 'CHANGED' ? 'Gewijzigd' : status}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTripRemove(trip.id);
                  }}
                  className="opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
                  data-testid={`button-remove-trip-${trip.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Live vertraging • wordt elke minuut bijgewerkt
      </p>
    </Card>
  );
}
