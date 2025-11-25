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
import { useState, useRef, useEffect, useCallback } from "react";
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

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  targetIndex: number | null;
  startY: number;
  currentY: number;
  itemHeight: number;
}

export default function WidgetSelector({ activeWidgets, onToggleWidget, onReorderWidgets }: WidgetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    targetIndex: null,
    startY: 0,
    currentY: 0,
    itemHeight: 0,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const availableToAdd = AVAILABLE_WIDGETS.filter(
    widget => !activeWidgets.includes(widget.id)
  );

  const activeWidgetsList = activeWidgets
    .map(id => AVAILABLE_WIDGETS.find(w => w.id === id))
    .filter((w): w is WidgetOption => w !== undefined);

  const getTargetIndex = useCallback((currentY: number, startY: number, draggedIndex: number, itemHeight: number) => {
    const deltaY = currentY - startY;
    const indexOffset = Math.round(deltaY / itemHeight);
    let newIndex = draggedIndex + indexOffset;
    newIndex = Math.max(0, Math.min(newIndex, activeWidgetsList.length - 1));
    return newIndex;
  }, [activeWidgetsList.length]);

  const handleDragStart = (index: number, clientY: number) => {
    const item = itemRefs.current[index];
    if (!item) return;
    
    const rect = item.getBoundingClientRect();
    
    setDragState({
      isDragging: true,
      draggedIndex: index,
      targetIndex: index,
      startY: clientY,
      currentY: clientY,
      itemHeight: rect.height + 8, // including gap
    });
  };

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragState.isDragging || dragState.draggedIndex === null) return;
    
    const newTargetIndex = getTargetIndex(clientY, dragState.startY, dragState.draggedIndex, dragState.itemHeight);
    
    setDragState(prev => ({
      ...prev,
      currentY: clientY,
      targetIndex: newTargetIndex,
    }));
  }, [dragState.isDragging, dragState.draggedIndex, dragState.startY, dragState.itemHeight, getTargetIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragState.draggedIndex !== null && dragState.targetIndex !== null && dragState.draggedIndex !== dragState.targetIndex) {
      const newOrder = [...activeWidgetsList];
      const [draggedItem] = newOrder.splice(dragState.draggedIndex, 1);
      newOrder.splice(dragState.targetIndex, 0, draggedItem);
      onReorderWidgets(newOrder.map(w => w.id));
    }
    
    setDragState({
      isDragging: false,
      draggedIndex: null,
      targetIndex: null,
      startY: 0,
      currentY: 0,
      itemHeight: 0,
    });
  }, [dragState.draggedIndex, dragState.targetIndex, activeWidgetsList, onReorderWidgets]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    handleDragStart(index, e.clientY);
  };

  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleDragMove(touch.clientY);
    };

    const handleTouchEndGlobal = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    document.addEventListener('touchend', handleTouchEndGlobal);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMoveGlobal);
      document.removeEventListener('touchend', handleTouchEndGlobal);
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  // Touch events - only start needs to be on the element
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleDragStart(index, touch.clientY);
  };

  const getItemStyle = (index: number): React.CSSProperties => {
    if (!dragState.isDragging || dragState.draggedIndex === null || dragState.targetIndex === null) {
      return {};
    }

    // The dragged item follows the cursor
    if (index === dragState.draggedIndex) {
      const translateY = dragState.currentY - dragState.startY;
      return {
        transform: `translateY(${translateY}px) scale(1.02)`,
        zIndex: 50,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        position: 'relative' as const,
      };
    }

    // Other items make room
    const draggedIdx = dragState.draggedIndex;
    const targetIdx = dragState.targetIndex;

    if (draggedIdx < targetIdx) {
      // Dragging down: items between draggedIdx and targetIdx move up
      if (index > draggedIdx && index <= targetIdx) {
        return {
          transform: `translateY(-${dragState.itemHeight}px)`,
          transition: 'transform 200ms ease',
        };
      }
    } else if (draggedIdx > targetIdx) {
      // Dragging up: items between targetIdx and draggedIdx move down
      if (index >= targetIdx && index < draggedIdx) {
        return {
          transform: `translateY(${dragState.itemHeight}px)`,
          transition: 'transform 200ms ease',
        };
      }
    }

    return {
      transition: 'transform 200ms ease',
    };
  };

  const content = (
    <div className="space-y-4">
      {activeWidgets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Actieve widgets</h3>
          <p className="text-xs text-muted-foreground mb-3">Sleep om te herordenen</p>
          <div className="space-y-2 relative" ref={containerRef}>
            {activeWidgetsList.map((widget, index) => (
              <Card 
                key={widget.id}
                ref={(el) => { itemRefs.current[index] = el; }}
                className={`p-4 select-none ${
                  dragState.isDragging && dragState.draggedIndex === index 
                    ? 'bg-accent' 
                    : ''
                }`}
                style={getItemStyle(index)}
                data-testid={`draggable-widget-${widget.id}`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
                    onMouseDown={(e) => handleMouseDown(e, index)}
                    onTouchStart={(e) => handleTouchStart(e, index)}
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
