import { useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';
import type { SavedRoute, SavedTrip, WidgetConfig } from '@shared/schema';

const DEFAULT_CONFIG: WidgetConfig = {
  activeWidgets: [],
  savedRoutes: [],
  savedTrips: [],
};

export function useWidgetManager() {
  const [config, setConfig] = useLocalStorage<WidgetConfig>('travnl-widgets', DEFAULT_CONFIG);

  useEffect(() => {
    const cleanupExpiredTrips = () => {
      const now = new Date();
      setConfig((prev) => {
        const validTrips = prev.savedTrips.filter((trip) => {
          const departureTime = new Date(trip.departureTime);
          return departureTime >= now;
        });
        
        if (validTrips.length === prev.savedTrips.length) {
          return prev;
        }
        
        return {
          ...prev,
          savedTrips: validTrips,
        };
      });
    };

    cleanupExpiredTrips();
    
    const interval = setInterval(cleanupExpiredTrips, 60000);
    
    return () => clearInterval(interval);
  }, [setConfig]);

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

  const addSavedTrip = (trip: Omit<SavedTrip, 'id' | 'createdAt'>) => {
    const newTrip: SavedTrip = {
      ...trip,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setConfig((prev) => ({
      ...prev,
      savedTrips: [...prev.savedTrips, newTrip],
    }));
  };

  const removeSavedTrip = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      savedTrips: prev.savedTrips.filter((trip) => trip.id !== id),
    }));
  };

  const toggleWidget = (widgetId: 'savedRoutes' | 'savedTrips') => {
    setConfig((prev) => ({
      ...prev,
      activeWidgets: prev.activeWidgets.includes(widgetId)
        ? prev.activeWidgets.filter((id) => id !== widgetId)
        : [...prev.activeWidgets, widgetId],
    }));
  };

  const moveWidgetUp = (widgetId: 'savedRoutes' | 'savedTrips') => {
    setConfig((prev) => {
      const currentIndex = prev.activeWidgets.indexOf(widgetId);
      if (currentIndex <= 0) return prev;
      
      const newActiveWidgets = [...prev.activeWidgets];
      [newActiveWidgets[currentIndex - 1], newActiveWidgets[currentIndex]] = 
        [newActiveWidgets[currentIndex], newActiveWidgets[currentIndex - 1]];
      
      return {
        ...prev,
        activeWidgets: newActiveWidgets,
      };
    });
  };

  const moveWidgetDown = (widgetId: 'savedRoutes' | 'savedTrips') => {
    setConfig((prev) => {
      const currentIndex = prev.activeWidgets.indexOf(widgetId);
      if (currentIndex === -1 || currentIndex >= prev.activeWidgets.length - 1) return prev;
      
      const newActiveWidgets = [...prev.activeWidgets];
      [newActiveWidgets[currentIndex], newActiveWidgets[currentIndex + 1]] = 
        [newActiveWidgets[currentIndex + 1], newActiveWidgets[currentIndex]];
      
      return {
        ...prev,
        activeWidgets: newActiveWidgets,
      };
    });
  };

  const isRouteAlreadySaved = (from: string, to: string, viaStations: string[] = []) => {
    return config.savedRoutes.some(
      (route) =>
        route.from === from &&
        route.to === to &&
        JSON.stringify(route.viaStations.sort()) === JSON.stringify(viaStations.sort())
    );
  };

  const isTripAlreadySaved = (departureTime: string, from: string, to: string) => {
    return config.savedTrips.some(
      (trip) =>
        trip.departureTime === departureTime &&
        trip.from === from &&
        trip.to === to
    );
  };

  return {
    config,
    addSavedRoute,
    removeSavedRoute,
    addSavedTrip,
    removeSavedTrip,
    toggleWidget,
    moveWidgetUp,
    moveWidgetDown,
    isRouteAlreadySaved,
    isTripAlreadySaved,
  };
}
