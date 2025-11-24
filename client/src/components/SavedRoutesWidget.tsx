import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, X, ArrowRight } from "lucide-react";
import type { SavedRoute } from "@shared/schema";

interface SavedRoutesWidgetProps {
  routes: SavedRoute[];
  onRouteClick: (route: SavedRoute) => void;
  onRouteRemove: (id: string) => void;
}

export default function SavedRoutesWidget({
  routes,
  onRouteClick,
  onRouteRemove,
}: SavedRoutesWidgetProps) {
  if (routes.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Favoriete Routes</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Je hebt nog geen routes opgeslagen. Zoek een route en klik op "Route
          opslaan" om deze toe te voegen.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Favoriete Routes</h3>
        <Badge variant="secondary" className="ml-auto">
          {routes.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {routes.map((route) => (
          <Card
            key={route.id}
            className="p-4 hover-elevate cursor-pointer group"
            onClick={() => onRouteClick(route)}
            data-testid={`saved-route-${route.id}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold truncate">{route.from}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold truncate">{route.to}</span>
                </div>
                {route.viaStations.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Via: {route.viaStations.join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRouteRemove(route.id);
                }}
                className="opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
                data-testid={`button-remove-route-${route.id}`}
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
