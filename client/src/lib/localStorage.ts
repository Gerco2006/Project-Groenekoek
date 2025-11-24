import { SavedRoute, WidgetSettings } from "@/types/widgets";

const STORAGE_KEYS = {
  SAVED_ROUTES: "travnl_saved_routes",
  WIDGET_SETTINGS: "travnl_widget_settings",
} as const;

export const localStorageUtils = {
  getSavedRoutes(): SavedRoute[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVED_ROUTES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading saved routes:", error);
      return [];
    }
  },

  saveRoute(route: Omit<SavedRoute, "id" | "savedAt">): SavedRoute {
    try {
      const routes = this.getSavedRoutes();
      const newRoute: SavedRoute = {
        ...route,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
      };
      routes.unshift(newRoute);
      localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(routes));
      return newRoute;
    } catch (error) {
      console.error("Error saving route:", error);
      throw error;
    }
  },

  deleteRoute(routeId: string): void {
    try {
      const routes = this.getSavedRoutes().filter(r => r.id !== routeId);
      localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(routes));
    } catch (error) {
      console.error("Error deleting route:", error);
      throw error;
    }
  },

  updateRoute(routeId: string, updates: Partial<SavedRoute>): void {
    try {
      const routes = this.getSavedRoutes();
      const index = routes.findIndex(r => r.id === routeId);
      if (index !== -1) {
        routes[index] = { ...routes[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(routes));
      }
    } catch (error) {
      console.error("Error updating route:", error);
      throw error;
    }
  },

  getWidgetSettings(): WidgetSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WIDGET_SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Error reading widget settings:", error);
      return {};
    }
  },

  setWidgetSettings(settings: WidgetSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WIDGET_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving widget settings:", error);
      throw error;
    }
  },

  toggleWidget(widgetId: string, enabled: boolean): void {
    try {
      const settings = this.getWidgetSettings();
      settings[widgetId] = { enabled };
      this.setWidgetSettings(settings);
    } catch (error) {
      console.error("Error toggling widget:", error);
      throw error;
    }
  },
};
