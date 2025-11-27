import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import type { SavedTrip } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface LiveTripUpdate {
  tripId: string;
  delayMinutes?: number;
  status?: string;
  cancelled?: boolean;
  lastUpdated: string;
}

interface SavedTripsWidgetProps {
  trips: SavedTrip[];
  onTripClick: (trip: SavedTrip) => void;
  onTripRemove: (id: string) => void;
}

async function fetchLiveTripUpdate(trip: SavedTrip): Promise<LiveTripUpdate | null> {
  try {
    const departureDate = new Date(trip.departureTime);
    const now = new Date();
    
    if (departureDate < new Date(now.getTime() - 5 * 60 * 1000)) {
      return null;
    }

    const response = await fetch(
      `/api/trips?fromStation=${encodeURIComponent(trip.from)}&toStation=${encodeURIComponent(trip.to)}&dateTime=${trip.departureTime}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const trips = data.trips || [];
    
    const matchingTrip = trips.find((t: any) => {
      const tripDeparture = t.legs?.[0]?.origin?.plannedDateTime;
      if (!tripDeparture) return false;
      
      const savedDep = new Date(trip.departureTime).getTime();
      const apiDep = new Date(tripDeparture).getTime();
      return Math.abs(savedDep - apiDep) < 5 * 60 * 1000;
    });

    if (!matchingTrip) return null;

    let delayMinutes: number | undefined;
    
    if (matchingTrip.actualDurationInMinutes && matchingTrip.plannedDurationInMinutes) {
      const diff = matchingTrip.actualDurationInMinutes - matchingTrip.plannedDurationInMinutes;
      delayMinutes = diff > 0 ? diff : undefined;
    } else {
      const lastLeg = matchingTrip.legs?.[matchingTrip.legs.length - 1];
      if (lastLeg?.destination?.plannedDateTime && lastLeg?.destination?.actualDateTime) {
        const planned = new Date(lastLeg.destination.plannedDateTime).getTime();
        const actual = new Date(lastLeg.destination.actualDateTime).getTime();
        const diff = Math.round((actual - planned) / 60000);
        delayMinutes = diff > 0 ? diff : undefined;
      }
    }

    const isCancelled = matchingTrip.legs?.some((leg: any) => leg.cancelled) || false;

    return {
      tripId: trip.id,
      delayMinutes,
      status: matchingTrip.status,
      cancelled: isCancelled,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export default function SavedTripsWidget({ trips, onTripClick, onTripRemove }: SavedTripsWidgetProps) {
  const [liveUpdates, setLiveUpdates] = useState<Map<string, LiveTripUpdate>>(new Map());

  const { isFetching, refetch } = useQuery({
    queryKey: ['/api/saved-trips-live', trips.map(t => t.id).join(',')],
    queryFn: async () => {
      const updates = await Promise.all(
        trips.map(trip => fetchLiveTripUpdate(trip))
      );
      
      const newUpdates = new Map<string, LiveTripUpdate>();
      updates.forEach(update => {
        if (update) {
          newUpdates.set(update.tripId, update);
        }
      });
      
      setLiveUpdates(newUpdates);
      return updates;
    },
    enabled: trips.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  useEffect(() => {
    const tripIds = new Set(trips.map(t => t.id));
    setLiveUpdates(prev => {
      const newMap = new Map<string, LiveTripUpdate>();
      prev.forEach((value, key) => {
        if (tripIds.has(key)) {
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

  const getDelay = (trip: SavedTrip): { delay: number | undefined; isLive: boolean; cancelled: boolean } => {
    const liveUpdate = liveUpdates.get(trip.id);
    
    if (liveUpdate) {
      return {
        delay: liveUpdate.delayMinutes,
        isLive: true,
        cancelled: liveUpdate.cancelled || false,
      };
    }
    
    if (trip.delayMinutes && trip.delayMinutes > 0) {
      return { delay: trip.delayMinutes, isLive: false, cancelled: false };
    }
    
    if (trip.legs && trip.legs.length > 0) {
      const delays = trip.legs
        .map(leg => Math.max(leg.departureDelayMinutes || 0, leg.arrivalDelayMinutes || 0))
        .filter(d => d > 0);
      if (delays.length > 0) {
        return { delay: Math.max(...delays), isLive: false, cancelled: false };
      }
    }
    
    return { delay: undefined, isLive: false, cancelled: false };
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
          const { delay, isLive, cancelled } = getDelay(trip);
          const liveUpdate = liveUpdates.get(trip.id);
          const status = liveUpdate?.status || trip.status;
          
          return (
            <Card
              key={trip.id}
              className={`p-2 hover-elevate cursor-pointer group ${cancelled ? 'opacity-60' : ''}`}
              onClick={() => onTripClick(trip)}
              data-testid={`saved-trip-${trip.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-semibold text-sm truncate ${cancelled ? 'line-through' : ''}`}>{trip.from}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className={`font-semibold text-sm truncate ${cancelled ? 'line-through' : ''}`}>{trip.to}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className={cancelled ? 'line-through' : ''}>
                        {formatTime(trip.departureTime)} - {formatTime(trip.arrivalTime)}
                      </span>
                      {delay !== undefined && delay > 0 && (
                        <span className={`font-medium ${isLive ? 'text-red-500' : 'text-orange-500'}`}>
                          +{delay}'
                          {isLive && <span className="ml-0.5 text-[10px]">●</span>}
                        </span>
                      )}
                    </div>
                    <span>{formatDate(trip.departureTime)}</span>
                    <span>{trip.duration}</span>
                    {trip.transfers === 0 ? (
                      <Badge variant="secondary" className="text-xs">Direct</Badge>
                    ) : (
                      <span>{trip.transfers} overstap{trip.transfers > 1 ? 'pen' : ''}</span>
                    )}
                    {cancelled && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Geannuleerd
                      </Badge>
                    )}
                    {!cancelled && status && status !== 'NORMAL' && status !== 'ACCORDING_TO_PLAN' && (
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
        Vertraging wordt elke minuut bijgewerkt
      </p>
    </Card>
  );
}
