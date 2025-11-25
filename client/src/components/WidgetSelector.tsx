import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, X, Star, AlertTriangle, Train, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";

type WidgetId = 'savedRoutes' | 'savedTrips' | 'disruptions' | 'materieelTracker';

interface WidgetOption {
  id: WidgetId;
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
  {
    id: 'disruptions',
    name: 'Storingen & Werkzaamheden',
    description: 'Volg storingen van tot 3 stations',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    id: 'materieelTracker',
    name: 'Materieel Tracker',
    description: 'Volg specifieke treinstellen en hun actuele ritten',
    icon: <Train className="w-5 h-5" />,
  },
];

interface WidgetSelectorProps {
  activeWidgets: string[];
  onToggleWidget: (widgetId: WidgetId) => void;
  onReorderWidgets: (newOrder: WidgetId[]) => void;
}

export default function WidgetSelector({ activeWidgets, onToggleWidget, onReorderWidgets }: WidgetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const availableToAdd = AVAILABLE_WIDGETS.filter(
    widget => !activeWidgets.includes(widget.id)
  );

  const activeWidgetsList = activeWidgets
    .map(id => AVAILABLE_WIDGETS.find(w => w.id === id))
    .filter((w): w is WidgetOption => w !== undefined);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    });
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const newOrder = [...activeWidgetsList];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    
    onReorderWidgets(newOrder.map(w => w.id));
    handleDragEnd();
  };

  const handleTouchStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (draggedIndex === null) return;
    
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    
    for (const el of elements) {
      const widgetCard = el.closest('[data-widget-index]');
      if (widgetCard) {
        const index = parseInt(widgetCard.getAttribute('data-widget-index') || '-1');
        if (index !== -1 && index !== draggedIndex) {
          setDragOverIndex(index);
        }
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newOrder = [...activeWidgetsList];
      const [draggedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dragOverIndex, 0, draggedItem);
      onReorderWidgets(newOrder.map(w => w.id));
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const content = (
    <div className="space-y-4">
          {activeWidgets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Actieve widgets</h3>
              <p className="text-xs text-muted-foreground mb-3">Sleep om te herordenen</p>
              <div className="space-y-2">
                {activeWidgetsList.map((widget, index) => (
                  <Card 
                    key={widget.id} 
                    className={`p-4 transition-all duration-200 ${
                      dragOverIndex === index ? 'border-primary border-2' : ''
                    } ${draggedIndex === index ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchStart={() => handleTouchStart(index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    data-widget-index={index}
                    data-testid={`draggable-widget-${widget.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
                        data-testid={`drag-handle-${widget.id}`}
                      >
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="text-primary">{widget.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{widget.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleWidget(widget.id)}
                        data-testid={`button-remove-widget-${widget.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
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
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" className="gap-2" data-testid="button-add-widget">
            <Plus className="w-4 h-4" />
            Beheer widgets
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Widgets beheren</DrawerTitle>
            <DrawerDescription>
              Kies welke widgets je wilt zien op je startpagina
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

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
        {content}
      </DialogContent>
    </Dialog>
  );
}
