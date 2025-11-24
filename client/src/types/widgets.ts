export interface Widget {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<WidgetProps>;
  defaultEnabled: boolean;
}

export interface WidgetProps {
  onAction?: (action: string, data?: any) => void;
}

export interface WidgetSettings {
  [widgetId: string]: {
    enabled: boolean;
  };
}

export interface SavedRoute {
  id: string;
  from: string;
  to: string;
  viaStations: string[];
  savedAt: number;
  nickname?: string;
}
