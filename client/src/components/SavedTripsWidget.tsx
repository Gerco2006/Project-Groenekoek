import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, ArrowRight, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { SavedTrip } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface LiveTripData {
  departureTime: string;
  arrivalTime: string;
  departureDelay: number;
  arrivalDelay: number;
  cancelled: boolean;
  status: string;
  trainTypes: string[];
}

interface SavedTripsWidgetProps {
  trips: SavedTrip[];
  onTripClick: (trip: SavedTrip, liveData?: LiveTripData) => void;
  onTripRemove: (id: string) => void;
}

function SavedTripCard({ 
  trip, 
  onTripClick, 
  onTripRemove 
}: { 
  trip: SavedTrip; 
  onTripClick: (trip: SavedTrip, liveData?: LiveTripData) => void;
  onTripRemove: (id: string) => void;
}) {
  // Build query params
  const queryParams = new URLSearchParams();
  if (trip.ctxRecon) queryParams.set('ctxRecon', trip.ctxRecon);
  if (trip.fromCode) queryParams.set('fromCode', trip.fromCode);
  if (trip.toCode) queryParams.set('toCode', trip.toCode);
  const plannedDep = trip.plannedDepartureTime || trip.departureTime;
  if (plannedDep) queryParams.set('plannedDeparture', plannedDep);

  const { data, isLoading, isError } = useQuery<{ success: boolean; trip?: any; error?: string }>({
    queryKey: ['/api/trip/live', trip.id],
    queryFn: async () => {
      const response = await fetch(`/api/trip/live?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!plannedDep && (!!trip.ctxRecon || (!!trip.fromCode && !!trip.toCode)),
    staleTime: 30000,
    refetchInterval: 60000,
  });

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
  
  const hasDelay = departureDelay > 0 || arrivalDelay > 0;
  const tripNotAvailable = data && !data.success;

  // Build live data for click handler
  const liveData: LiveTripData | undefined = liveTrip ? {
    departureTime,
    arrivalTime,
    departureDelay,
    arrivalDelay,
    cancelled,
    status: liveTrip.status || 'NORMAL',
    trainTypes: liveTrip.legs?.map((l: any) => l.product?.categoryCode).filter(Boolean) || [],
  } : undefined;

  return (
    <Card
      className={`p-3 hover-elevate cursor-pointer group ${cancelled ? 'border-destructive/50' : ''} ${tripNotAvailable ? 'opacity-60' : ''}`}
      onClick={() => onTripClick(trip, liveData)}
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
            ) : !isLoading && data?.success ? (
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
        Live vertraging • wordt elke minuut bijgewerkt
      </p>
    </Card>
  );
}
