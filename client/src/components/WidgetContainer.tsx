import SavedRoutesWidget from "./SavedRoutesWidget";
import SavedTripsWidget from "./SavedTripsWidget";
import WidgetSelector from "./WidgetSelector";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { SavedRoute, SavedTrip } from "@shared/schema";

interface WidgetContainerProps {
  activeWidgets: string[];
  savedRoutes: SavedRoute[];
  savedTrips: SavedTrip[];
  onRouteClick: (route: SavedRoute) => void;
  onRouteRemove: (id: string) => void;
  onTripClick: (trip: SavedTrip) => void;
  onTripRemove: (id: string) => void;
  onToggleWidget: (widgetId: 'savedRoutes' | 'savedTrips') => void;
  onMoveWidgetUp: (widgetId: 'savedRoutes' | 'savedTrips') => void;
  onMoveWidgetDown: (widgetId: 'savedRoutes' | 'savedTrips') => void;
}

export default function WidgetContainer({
  activeWidgets,
  savedRoutes,
  savedTrips,
  onRouteClick,
  onRouteRemove,
  onTripClick,
  onTripRemove,
  onToggleWidget,
  onMoveWidgetUp,
  onMoveWidgetDown,
}: WidgetContainerProps) {
  return (
    <div className="space-y-4" data-testid="widget-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Widgets</h2>
        </div>
        <WidgetSelector 
          activeWidgets={activeWidgets} 
          onToggleWidget={onToggleWidget}
          onMoveWidgetUp={onMoveWidgetUp}
          onMoveWidgetDown={onMoveWidgetDown}
        />
      </div>

      {activeWidgets.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-2">
            Voeg widgets toe voor handige snelkoppelingen
          </p>
          <p className="text-sm text-muted-foreground">
            Klik op "Widget toevoegen" om te beginnen
          </p>
        </Card>
      )}

      {activeWidgets.map((widgetId) => {
        if (widgetId === 'savedRoutes') {
          return (
            <SavedRoutesWidget
              key={widgetId}
              routes={savedRoutes}
              onRouteClick={onRouteClick}
              onRouteRemove={onRouteRemove}
            />
          );
        }
        if (widgetId === 'savedTrips') {
          return (
            <SavedTripsWidget
              key={widgetId}
              trips={savedTrips}
              onTripClick={onTripClick}
              onTripRemove={onTripRemove}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
