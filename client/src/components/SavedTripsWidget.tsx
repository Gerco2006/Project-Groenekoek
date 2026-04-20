import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import type { SavedTrip, TripLeg } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface LiveTripData {
  legs: TripLeg[];
  departureDelay: number;
  arrivalDelay: number;
  cancelled: boolean;
  status: string;
}

interface SavedTripsWidgetProps {
  trips: SavedTrip[];
  onTripClick: (trip: SavedTrip, liveTrip?: any) => void;
  onTripRemove: (id: string) => void;
}

function SavedTripCard({ 
  trip, 
  onTripClick, 
  onTripRemove 
}: { 
  trip: SavedTrip; 
  onTripClick: (trip: SavedTrip, liveTrip?: any) => void;
  onTripRemove: (id: string) => void;
}) {
  const plannedDep = trip.plannedDepartureTime || trip.departureTime;
  
  // Build query params - use ctxRecon if available, otherwise use station names
  const queryParams = new URLSearchParams();
  if (trip.ctxRecon) {
    queryParams.set('ctxRecon', trip.ctxRecon);
  }
  // Always include fallback params
  if (trip.fromCode) {
    queryParams.set('fromCode', trip.fromCode);
  } else if (trip.from) {
    queryParams.set('fromCode', trip.from);
  }
  if (trip.toCode) {
    queryParams.set('toCode', trip.toCode);
  } else if (trip.to) {
    queryParams.set('toCode', trip.to);
  }
  if (plannedDep) {
    queryParams.set('plannedDeparture', plannedDep);
  }

  const canFetch = !!plannedDep && (!!trip.ctxRecon || !!trip.from);

  const { data, isLoading } = useQuery<{ success: boolean; trip?: any; error?: string }>({
    queryKey: ['/api/trip/live', trip.id],
    queryFn: async () => {
      const response = await fetch(`/api/trip/live?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: canFetch,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    try {
      const date = new Date(dateTime);
      return format(date, "HH:mm", { locale: nl });
    } catch {
      return "";
    }
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "";
    try {
      const date = new Date(dateTime);
      return format(date, "EEE d MMM", { locale: nl });
    } catch {
      return "";
    }
  };

  // Extract live data from API response
  const liveTrip = data?.success ? data.trip : null;
  const firstLeg = liveTrip?.legs?.[0];
  const lastLeg = liveTrip?.legs?.[liveTrip.legs.length - 1];
  
  // Calculate delays from live data
  let departureDelay = 0;
  let arrivalDelay = 0;
  let cancelled = false;
  
  if (firstLeg?.origin) {
    const planned = new Date(firstLeg.origin.plannedDateTime).getTime();
    const actual = new Date(firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime).getTime();
    departureDelay = Math.max(0, Math.round((actual - planned) / 60000));
    cancelled = cancelled || firstLeg.cancelled === true;
  }
  
  if (lastLeg?.destination) {
    const planned = new Date(lastLeg.destination.plannedDateTime).getTime();
    const actual = new Date(lastLeg.destination.actualDateTime || lastLeg.destination.plannedDateTime).getTime();
    arrivalDelay = Math.max(0, Math.round((actual - planned) / 60000));
    cancelled = cancelled || lastLeg.cancelled === true;
  }

  // Use live times if available, otherwise fall back to saved times
  const departureTime = firstLeg?.origin?.plannedDateTime || trip.plannedDepartureTime || trip.departureTime || '';
  const arrivalTime = lastLeg?.destination?.plannedDateTime || trip.plannedArrivalTime || trip.arrivalTime || '';
  
  const tripNotAvailable = data && !data.success;

  return (
    <button
      type="button"
      className="w-full text-left"
      onClick={() => {
        console.log('[DEBUG] Trip button clicked', trip.id);
        onTripClick(trip, liveTrip);
      }}
      data-testid={`saved-trip-${trip.id}`}
    >
      <Card
        className={`p-3 hover-elevate group ${cancelled ? 'border-destructive/50' : ''} ${tripNotAvailable ? 'opacity-60' : ''}`}
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
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span className={cancelled ? 'line-through text-muted-foreground' : ''}>
                  {formatTime(departureTime)}
                </span>
                {departureDelay > 0 && (
                  <span className="text-red-500 font-semibold">+{departureDelay}</span>
                )}
                <span>→</span>
                <span className={cancelled ? 'line-through text-muted-foreground' : ''}>
                  {formatTime(arrivalTime)}
                </span>
                {arrivalDelay > 0 && (
                  <span className="text-red-500 font-semibold">+{arrivalDelay}</span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{formatDate(departureTime)}</span>
            <span>•</span>
            <span>{trip.duration}</span>
            <span>•</span>
            {trip.transfers === 0 ? (
              <span>Direct</span>
            ) : (
              <span>{trip.transfers} overstap{trip.transfers > 1 ? 'pen' : ''}</span>
            )}
            
            {tripNotAvailable ? (
              <Badge variant="outline" className="text-xs gap-1 ml-1 border-muted-foreground/50 text-muted-foreground">
                Niet meer beschikbaar
              </Badge>
            ) : cancelled ? (
              <Badge variant="destructive" className="text-xs gap-1 ml-1">
                <AlertTriangle className="w-3 h-3" />
                Geannuleerd
              </Badge>
            ) : null}
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
    </button>
  );
}

export default function SavedTripsWidget({ trips, onTripClick, onTripRemove }: SavedTripsWidgetProps) {
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
        <Badge variant="secondary" className="ml-auto">
          {trips.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {trips.map((trip) => (
          <SavedTripCard
            key={trip.id}
            trip={trip}
            onTripClick={onTripClick}
            onTripRemove={onTripRemove}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Wordt elke minuut bijgewerkt
      </p>
    </Card>
  );
}
