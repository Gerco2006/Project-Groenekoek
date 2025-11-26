import { X, Clock, ArrowRight, Train, MapPin, AlertCircle, Star, Users } from "lucide-react";
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
import type { TripLeg } from "@shared/schema";

const crowdingColors = {
  LOW: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  MEDIUM: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  HIGH: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const crowdingLabels = {
  LOW: "Rustig",
  MEDIUM: "Gemiddelde drukte",
  HIGH: "Druk, mogelijk vol",
};

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
  status?: string;
  onSaveTrip?: () => void;
  isTripSaved?: boolean;
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
  status,
  onSaveTrip,
  isTripSaved = false,
}: TripAdviceDetailPanelProps) {
  const isMobile = useIsMobile();

  // Calculate average crowding level from embedded crowdForecast data
  const getAverageCrowding = () => {
    const crowdingLevels: number[] = [];
    
    legs.forEach((leg) => {
      if (!leg.crowdForecast) return;
      
      // Convert to numeric value
      const value = leg.crowdForecast === 'HIGH' ? 3 : leg.crowdForecast === 'MEDIUM' ? 2 : 1;
      crowdingLevels.push(value);
    });
    
    if (crowdingLevels.length === 0) return null;
    
    const avg = crowdingLevels.reduce((a, b) => a + b, 0) / crowdingLevels.length;
    if (avg >= 2.5) return 'HIGH';
    if (avg >= 1.5) return 'MEDIUM';
    return 'LOW';
  };

  const averageCrowding = getAverageCrowding();

  const calculateTransferTime = (leg: TripLeg, nextLeg?: TripLeg) => {
    if (!nextLeg) return null;
    
    const legArrival = leg.actualArrival || leg.plannedArrival;
    const nextLegDeparture = nextLeg.actualDeparture || nextLeg.plannedDeparture;
    
    if (!legArrival || !nextLegDeparture) {
      const arrivalTime = new Date(`2000-01-01T${leg.arrival}`);
      const nextDeparture = new Date(`2000-01-01T${nextLeg.departure}`);
      const diffMinutes = Math.round((nextDeparture.getTime() - arrivalTime.getTime()) / 60000);
      return diffMinutes;
    }
    
    const arrival = new Date(legArrival);
    const departure = new Date(nextLegDeparture);
    const diffMinutes = Math.round((departure.getTime() - arrival.getTime()) / 60000);
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
          <div className="flex items-center gap-2 shrink-0">
            {onSaveTrip && (
              <Button
                variant={isTripSaved ? "default" : "ghost"}
                size="icon"
                onClick={onSaveTrip}
                data-testid="button-save-trip"
              >
                <Star className={`w-5 h-5 ${isTripSaved ? 'fill-current' : ''}`} />
              </Button>
            )}
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
                  +{delayMinutes}
                </Badge>
              )}
              {averageCrowding && (
                <Badge variant="outline" className={`gap-1.5 ${crowdingColors[averageCrowding as keyof typeof crowdingColors]}`}>
                  <Users className="w-3.5 h-3.5" />
                  {crowdingLabels[averageCrowding as keyof typeof crowdingLabels]}
                </Badge>
              )}
            </div>
          </Card>

          {/* Journey Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Reisverloop</h3>
            
            {legs.map((leg, idx) => {
              const transferTime = calculateTransferTime(leg, legs[idx + 1]);
              const legCrowding = leg.crowdForecast;
              
              return (
                <div key={idx} className="space-y-3">
                  <Card 
                    className="hover-elevate cursor-pointer overflow-hidden"
                    onClick={() => onTrainClick?.(leg)}
                    data-testid={`card-leg-${idx}`}
                  >
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <TrainBadge type={leg.trainType} number={leg.trainNumber} />
                        <div className="flex items-center gap-1.5 shrink-0">
                          {leg.cancelled && (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 py-0.5 h-5">
                              Vervalt
                            </Badge>
                          )}
                          {legCrowding && (
                            <Badge variant="outline" className={`gap-1 text-[10px] sm:text-xs px-1.5 py-0.5 h-5 ${crowdingColors[legCrowding as keyof typeof crowdingColors]}`}>
                              <Users className="w-3 h-3" />
                              <span className="hidden sm:inline">{crowdingLabels[legCrowding as keyof typeof crowdingLabels]}</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {leg.direction && (
                        <div className="text-xs sm:text-sm text-muted-foreground truncate mb-3 min-w-0">
                          <span className="sm:hidden">→ </span>
                          <span className="hidden sm:inline">Richting </span>
                          <span className="font-medium text-foreground">{leg.direction}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-[12px,1fr] gap-x-3">
                        <div className="relative flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <div className="flex-1 w-px bg-border my-1" />
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm sm:text-base font-semibold">{leg.departure}</span>
                                {leg.departureDelayMinutes && leg.departureDelayMinutes > 0 && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                    +{leg.departureDelayMinutes}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">{leg.from}</div>
                            </div>
                            {leg.platform && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5 h-5 shrink-0">
                                <span className="sm:hidden">Sp. {leg.platform}</span>
                                <span className="hidden sm:inline">Spoor {leg.platform}</span>
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm sm:text-base font-semibold">{leg.arrival}</span>
                                {leg.arrivalDelayMinutes && leg.arrivalDelayMinutes > 0 && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                    +{leg.arrivalDelayMinutes}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">{leg.to}</div>
                            </div>
                            {leg.arrivalPlatform && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5 h-5 shrink-0">
                                <span className="sm:hidden">Sp. {leg.arrivalPlatform}</span>
                                <span className="hidden sm:inline">Spoor {leg.arrivalPlatform}</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  {transferTime !== null && (
                    <div className={`flex items-center gap-2 px-2 py-2 rounded-lg ${
                      transferTime < 0 ? 'bg-destructive/10' : 
                      transferTime < 5 ? 'bg-amber-500/10' : 
                      'bg-muted/50'
                    }`}>
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground flex-1 min-w-0">
                        <span className="font-semibold truncate">Overstap in {leg.to}</span>
                        {" • "}
                        {transferTime < 0 ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Aansluiting gemist ({Math.abs(transferTime)} min te kort)
                          </span>
                        ) : (
                          <>
                            {transferTime} min
                            {transferTime < 5 && (
                              <span className="inline-flex items-center gap-1 ml-2 text-amber-600 dark:text-amber-500">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Krap
                              </span>
                            )}
                          </>
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
              <div className="flex items-center gap-1 shrink-0">
                {onSaveTrip && (
                  <Button
                    variant={isTripSaved ? "default" : "ghost"}
                    size="icon"
                    onClick={onSaveTrip}
                    data-testid="button-save-trip-mobile"
                  >
                    <Star className={`w-4 h-4 ${isTripSaved ? 'fill-current' : ''}`} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="shrink-0"
                  data-testid="button-close-mobile-detail"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
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
