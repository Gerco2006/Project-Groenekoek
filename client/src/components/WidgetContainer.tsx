import SavedRoutesWidget from "./SavedRoutesWidget";
import type { SavedRoute } from "@shared/schema";

interface WidgetContainerProps {
  activeWidgets: string[];
  savedRoutes: SavedRoute[];
  onRouteClick: (route: SavedRoute) => void;
  onRouteRemove: (id: string) => void;
}

export default function WidgetContainer({
  activeWidgets,
  savedRoutes,
  onRouteClick,
  onRouteRemove,
}: WidgetContainerProps) {
  return (
    <div className="space-y-4" data-testid="widget-container">
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
