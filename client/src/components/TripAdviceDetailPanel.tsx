import { X, Clock, ArrowRight, Train, MapPin, AlertCircle } from "lucide-react";
import TrainBadge from "./TrainBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface TripLeg {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  platform?: string;
}

interface TripAdviceDetailPanelProps {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  transfers: number;
  legs: TripLeg[];
  open: boolean;
  onClose: () => void;
  onTrainClick?: (leg: TripLeg) => void;
  delayMinutes?: number;
}

export default function TripAdviceDetailPanel({
  departureTime,
  arrivalTime,
  duration,
  transfers,
  legs,
  open,
  onClose,
  onTrainClick,
  delayMinutes,
}: TripAdviceDetailPanelProps) {
  const isMobile = useIsMobile();

  const calculateTransferTime = (leg: TripLeg, nextLeg?: TripLeg) => {
    if (!nextLeg) return null;
    const arrivalTime = new Date(`2000-01-01T${leg.arrival}`);
    const nextDeparture = new Date(`2000-01-01T${nextLeg.departure}`);
    const diffMinutes = Math.round((nextDeparture.getTime() - arrivalTime.getTime()) / 60000);
    return diffMinutes;
  };

  const content = (
    <div className={`flex flex-col ${isMobile ? '' : 'h-full'}`}>
      {!isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Train className="w-5 h-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-lg truncate" data-testid="text-trip-title">
                Reisadvies
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {legs[0]?.from} → {legs[legs.length - 1]?.to}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0"
            data-testid="button-close-detail"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className={`${isMobile ? 'p-4 space-y-6' : 'flex-1 overflow-y-auto'}`}>
        <div className={`${isMobile ? '' : 'p-4 space-y-6'}`}>
          {/* Trip Summary Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="text-center min-w-0">
                <div className="text-2xl sm:text-3xl font-bold" data-testid="text-summary-departure">{departureTime}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{legs[0]?.from}</div>
              </div>
              
              <div className="flex-1 flex flex-col items-center gap-1 min-w-[60px] max-w-[100px]">
                <div className="w-full h-px bg-border" />
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="font-medium whitespace-nowrap">{duration}</span>
                </div>
                <div className="w-full h-px bg-border" />
              </div>
              
              <div className="text-center min-w-0">
                <div className="text-2xl sm:text-3xl font-bold" data-testid="text-summary-arrival">{arrivalTime}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{legs[legs.length - 1]?.to}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <Badge variant="outline" className="gap-1.5">
                <Train className="w-3.5 h-3.5" />
                {transfers === 0 ? "Direct" : `${transfers} overstap${transfers > 1 ? 'pen' : ''}`}
              </Badge>
              {delayMinutes && delayMinutes > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  +{delayMinutes} min vertraging
                </Badge>
              )}
            </div>
          </Card>

          {/* Journey Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Reisverloop</h3>
            
            {legs.map((leg, idx) => {
              const transferTime = calculateTransferTime(leg, legs[idx + 1]);
              
              return (
                <div key={idx} className="space-y-3">
                  <Card 
                    className="hover-elevate cursor-pointer overflow-hidden"
                    onClick={() => onTrainClick?.(leg)}
                    data-testid={`card-leg-${idx}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <TrainBadge type={leg.trainType} number={leg.trainNumber} />
                        {leg.platform && (
                          <Badge variant="outline" className="ml-auto">
                            Spoor {leg.platform}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{leg.departure}</div>
                            <div className="text-sm text-muted-foreground truncate">{leg.from}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pl-[7px]">
                          <div className="w-px h-6 bg-border" />
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-border shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{leg.arrival}</div>
                            <div className="text-sm text-muted-foreground truncate">{leg.to}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  {transferTime !== null && (
                    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground flex-1 min-w-0">
                        <span className="font-semibold truncate">Overstap in {leg.to}</span>
                        {" • "}
                        {transferTime} min
                        {transferTime < 5 && (
                          <span className="inline-flex items-center gap-1 ml-2 text-amber-600 dark:text-amber-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Krap
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} shouldScaleBackground={false}>
        <DrawerContent 
          className="max-h-[85vh] flex flex-col"
          data-testid="drawer-trip-detail"
        >
          <DrawerHeader className="border-b shrink-0 px-3 py-2.5">
            <DrawerTitle className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Train className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs truncate" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{legs[0]?.from} → {legs[legs.length - 1]?.to}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0"
                data-testid="button-close-mobile-detail"
              >
                <X className="w-4 h-4" />
              </Button>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className="h-full border-l bg-card" data-testid="panel-trip-detail">
      {content}
    </div>
  );
}
