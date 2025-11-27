import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { SavedTrip } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SavedTripsWidgetProps {
  trips: SavedTrip[];
  onTripClick: (trip: SavedTrip) => void;
  onTripRemove: (id: string) => void;
}

export default function SavedTripsWidget({ trips, onTripClick, onTripRemove }: SavedTripsWidgetProps) {
  // Debug: log all saved trips and their delay data
  console.log('[TravNL Debug] SavedTripsWidget trips:', trips.map(t => ({
    id: t.id,
    from: t.from,
    to: t.to,
    delayMinutes: t.delayMinutes,
    status: t.status,
    legs: t.legs?.map(l => ({
      from: l.from,
      to: l.to,
      departureDelayMinutes: l.departureDelayMinutes,
      arrivalDelayMinutes: l.arrivalDelayMinutes,
    }))
  })));

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

  const getTripDelayInfo = (trip: SavedTrip): { 
    departureDelay: number | undefined;
    arrivalDelay: number | undefined;
    maxDelay: number | undefined;
    cancelled: boolean;
  } => {
    let departureDelay: number | undefined;
    let arrivalDelay: number | undefined;
    let cancelled = false;

    if (trip.legs && trip.legs.length > 0) {
      const firstLeg = trip.legs[0];
      const lastLeg = trip.legs[trip.legs.length - 1];
      
      departureDelay = firstLeg.departureDelayMinutes;
      arrivalDelay = lastLeg.arrivalDelayMinutes;
      
      cancelled = trip.legs.some(leg => leg.cancelled);
    }

    if (!departureDelay && !arrivalDelay && trip.delayMinutes) {
      arrivalDelay = trip.delayMinutes;
    }

    const maxDelay = Math.max(departureDelay || 0, arrivalDelay || 0) || undefined;

    return { departureDelay, arrivalDelay, maxDelay, cancelled };
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
        <Badge variant="secondary" className="ml-auto">
          {trips.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {trips.map((trip) => {
          const { departureDelay, arrivalDelay, maxDelay, cancelled } = getTripDelayInfo(trip);
          const hasDelay = (maxDelay !== undefined && maxDelay > 0) || cancelled;
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
                    <div className="flex items-center gap-1">
                      <span className={cancelled ? 'line-through text-muted-foreground' : ''}>
                        {formatTime(trip.departureTime)}
                      </span>
                      {departureDelay !== undefined && departureDelay > 0 && (
                        <span className="text-red-500 font-bold">+{departureDelay}'</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-1">
                      <span className={cancelled ? 'line-through text-muted-foreground' : ''}>
                        {formatTime(trip.arrivalTime)}
                      </span>
                      {arrivalDelay !== undefined && arrivalDelay > 0 && (
                        <span className="text-red-500 font-bold">+{arrivalDelay}'</span>
                      )}
                    </div>
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
                    ) : hasDelay ? (
                      <Badge variant="outline" className="text-xs gap-1 ml-1 border-red-500/50 text-red-500">
                        <AlertTriangle className="w-3 h-3" />
                        Vertraagd
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 ml-1 border-green-500/50 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Op tijd
                      </Badge>
                    )}
                    
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
    </Card>
  );
}
