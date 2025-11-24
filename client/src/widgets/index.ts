import { widgetRegistry } from "@/lib/widgetRegistry";
import SavedRoutesWidget from "@/components/widgets/SavedRoutesWidget";

widgetRegistry.register({
  id: "saved-routes",
  name: "Opgeslagen Routes",
  description: "Snel toegang tot je favoriete routes",
  component: SavedRoutesWidget,
  defaultEnabled: true,
});

export { widgetRegistry };
