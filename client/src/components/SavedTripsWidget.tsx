import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, ArrowRight } from "lucide-react";
import type { SavedTrip } from "@shared/schema";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SavedTripsWidgetProps {
  trips: SavedTrip[];
  onTripClick: (trip: SavedTrip) => void;
  onTripRemove: (id: string) => void;
}

export default function SavedTripsWidget({ trips, onTripClick, onTripRemove }: SavedTripsWidgetProps) {
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
        <Badge variant="secondary" className="ml-auto">
          {trips.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {trips.map((trip) => (
          <Card
            key={trip.id}
            className="p-2 hover-elevate cursor-pointer group"
            onClick={() => onTripClick(trip)}
            data-testid={`saved-trip-${trip.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate">{trip.from}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-sm truncate">{trip.to}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(trip.departureTime)} - {formatTime(trip.arrivalTime)}</span>
                  </div>
                  <span>{formatDate(trip.departureTime)}</span>
                  <span>{trip.duration}</span>
                  {trip.transfers === 0 ? (
                    <Badge variant="secondary" className="text-xs">Direct</Badge>
                  ) : (
                    <span>{trip.transfers} overstap{trip.transfers > 1 ? 'pen' : ''}</span>
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
        ))}
      </div>
    </Card>
  );
}
