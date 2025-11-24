import { useState, useEffect } from "react";
import { widgetRegistry } from "@/lib/widgetRegistry";
import { localStorageUtils } from "@/lib/localStorage";
import { WidgetSettings } from "@/types/widgets";

interface WidgetContainerProps {
  onAction?: (widgetId: string, action: string, data?: any) => void;
}

export default function WidgetContainer({ onAction }: WidgetContainerProps) {
  const [settings, setSettings] = useState<WidgetSettings>({});

  useEffect(() => {
    setSettings(localStorageUtils.getWidgetSettings());
    
    const handleStorageChange = () => {
      setSettings(localStorageUtils.getWidgetSettings());
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("widgetSettingsChanged", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("widgetSettingsChanged", handleStorageChange);
    };
  }, []);

  const enabledWidgets = widgetRegistry.getAllEnabled(settings);

  if (enabledWidgets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="widget-container">
      {enabledWidgets.map((widget) => {
        const WidgetComponent = widget.component;
        return (
          <div key={widget.id} data-testid={`widget-${widget.id}`}>
            <WidgetComponent
              onAction={(action, data) => {
                onAction?.(widget.id, action, data);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
