import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, X, Star, ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface WidgetOption {
  id: 'savedRoutes' | 'savedTrips';
  name: string;
  description: string;
  icon: JSX.Element;
}

const AVAILABLE_WIDGETS: WidgetOption[] = [
  {
    id: 'savedRoutes',
    name: 'Favoriete Routes',
    description: 'Snel toegang tot je meest gebruikte routes',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    id: 'savedTrips',
    name: 'Opgeslagen Reisadviezen',
    description: 'Favoriete reisadviezen voor snel terugvinden',
    icon: <Star className="w-5 h-5" />,
  },
];

interface WidgetSelectorProps {
  activeWidgets: string[];
  onToggleWidget: (widgetId: 'savedRoutes' | 'savedTrips') => void;
  onMoveWidgetUp: (widgetId: 'savedRoutes' | 'savedTrips') => void;
  onMoveWidgetDown: (widgetId: 'savedRoutes' | 'savedTrips') => void;
}

export default function WidgetSelector({ activeWidgets, onToggleWidget, onMoveWidgetUp, onMoveWidgetDown }: WidgetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const availableToAdd = AVAILABLE_WIDGETS.filter(
    widget => !activeWidgets.includes(widget.id)
  );

  const activeWidgetsList = activeWidgets
    .map(id => AVAILABLE_WIDGETS.find(w => w.id === id))
    .filter((w): w is WidgetOption => w !== undefined);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-add-widget">
          <Plus className="w-4 h-4" />
          Beheer widgets
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Widgets beheren</DialogTitle>
          <DialogDescription>
            Kies welke widgets je wilt zien op je startpagina
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {activeWidgets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Actieve widgets</h3>
              <div className="space-y-2">
                {activeWidgetsList.map((widget, index) => (
                  <Card key={widget.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-primary">{widget.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{widget.name}</h4>
                        <p className="text-xs text-muted-foreground">{widget.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMoveWidgetUp(widget.id)}
                          disabled={index === 0}
                          data-testid={`button-move-up-${widget.id}`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMoveWidgetDown(widget.id)}
                          disabled={index === activeWidgetsList.length - 1}
                          data-testid={`button-move-down-${widget.id}`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleWidget(widget.id)}
                          data-testid={`button-remove-widget-${widget.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {availableToAdd.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                {activeWidgets.length > 0 ? 'Meer widgets' : 'Beschikbare widgets'}
              </h3>
              <div className="space-y-2">
                {availableToAdd.map((widget) => (
                  <Card key={widget.id} className="p-4 hover-elevate cursor-pointer" onClick={() => {
                    onToggleWidget(widget.id);
                  }} data-testid={`widget-option-${widget.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-primary">{widget.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{widget.name}</h4>
                        <p className="text-xs text-muted-foreground">{widget.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWidget(widget.id);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeWidgets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Je hebt nog geen widgets toegevoegd. Selecteer er een om te beginnen!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
