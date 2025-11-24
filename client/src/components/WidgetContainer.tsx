import SavedRoutesWidget from "./SavedRoutesWidget";
import WidgetSelector from "./WidgetSelector";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { SavedRoute } from "@shared/schema";

interface WidgetContainerProps {
  activeWidgets: string[];
  savedRoutes: SavedRoute[];
  onRouteClick: (route: SavedRoute) => void;
  onRouteRemove: (id: string) => void;
  onToggleWidget: (widgetId: 'savedRoutes') => void;
}

export default function WidgetContainer({
  activeWidgets,
  savedRoutes,
  onRouteClick,
  onRouteRemove,
  onToggleWidget,
}: WidgetContainerProps) {
  return (
    <div className="space-y-4" data-testid="widget-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Widgets</h2>
        </div>
        <WidgetSelector activeWidgets={activeWidgets} onToggleWidget={onToggleWidget} />
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

      {activeWidgets.includes('savedRoutes') && (
        <SavedRoutesWidget
          routes={savedRoutes}
          onRouteClick={onRouteClick}
          onRouteRemove={onRouteRemove}
        />
      )}
    </div>
  );
}
