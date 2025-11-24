import { Widget } from "@/types/widgets";

class WidgetRegistry {
  private widgets: Map<string, Widget> = new Map();

  register(widget: Widget) {
    if (this.widgets.has(widget.id)) {
      console.warn(`Widget with id "${widget.id}" is already registered. Overwriting.`);
    }
    this.widgets.set(widget.id, widget);
  }

  unregister(widgetId: string) {
    this.widgets.delete(widgetId);
  }

  get(widgetId: string): Widget | undefined {
    return this.widgets.get(widgetId);
  }

  getAll(): Widget[] {
    return Array.from(this.widgets.values());
  }

  getAllEnabled(settings: Record<string, { enabled: boolean }>): Widget[] {
    return this.getAll().filter(widget => {
      const setting = settings[widget.id];
      return setting ? setting.enabled : widget.defaultEnabled;
    });
  }
}

export const widgetRegistry = new WidgetRegistry();
