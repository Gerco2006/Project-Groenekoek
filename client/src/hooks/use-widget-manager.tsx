import { useLocalStorage } from './use-local-storage';
import type { SavedRoute, WidgetConfig } from '@shared/schema';

const DEFAULT_CONFIG: WidgetConfig = {
  activeWidgets: ['savedRoutes'],
  savedRoutes: [],
};

export function useWidgetManager() {
  const [config, setConfig] = useLocalStorage<WidgetConfig>('travnl-widgets', DEFAULT_CONFIG);

  const addSavedRoute = (route: Omit<SavedRoute, 'id' | 'createdAt'>) => {
    const newRoute: SavedRoute = {
      ...route,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setConfig((prev) => ({
      ...prev,
      savedRoutes: [...prev.savedRoutes, newRoute],
    }));
  };

  const removeSavedRoute = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      savedRoutes: prev.savedRoutes.filter((route) => route.id !== id),
    }));
  };

  const toggleWidget = (widgetId: 'savedRoutes') => {
    setConfig((prev) => ({
      ...prev,
      activeWidgets: prev.activeWidgets.includes(widgetId)
        ? prev.activeWidgets.filter((id) => id !== widgetId)
        : [...prev.activeWidgets, widgetId],
    }));
  };

  const isRouteAlreadySaved = (from: string, to: string, viaStations: string[] = []) => {
    return config.savedRoutes.some(
      (route) =>
        route.from === from &&
        route.to === to &&
        JSON.stringify(route.viaStations.sort()) === JSON.stringify(viaStations.sort())
    );
  };

  return {
    config,
    addSavedRoute,
    removeSavedRoute,
    toggleWidget,
    isRouteAlreadySaved,
  };
}
