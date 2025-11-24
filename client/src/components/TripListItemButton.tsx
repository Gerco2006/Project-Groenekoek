import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, Train, AlertCircle } from "lucide-react";
import TrainBadge from "./TrainBadge";
import type { TripLeg } from "@shared/schema";

interface TripListItemButtonProps {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  transfers: number;
  legs: TripLeg[];
  onClick?: () => void;
  isSelected?: boolean;
  delayMinutes?: number;
}

export default function TripListItemButton({ 
  departureTime, 
  arrivalTime, 
  duration, 
  transfers, 
  legs,
  onClick,
  isSelected = false,
  delayMinutes
}: TripListItemButtonProps) {
  const uniqueTrainTypes = Array.from(new Set(legs.map(leg => leg.trainType)));
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];

  return (
    <Button
      variant="ghost"
      className={`w-full h-auto p-4 hover-elevate flex-col items-stretch ${
        isSelected ? "bg-primary/10 border-primary border-2" : "bg-card"
      }`}
      onClick={onClick}
      data-testid="button-trip"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {uniqueTrainTypes.map((type, idx) => (
            <TrainBadge key={idx} type={type} />
          ))}
        </div>
        {delayMinutes && delayMinutes > 0 && (
          <Badge variant="destructive" className="gap-1 shrink-0">
            <AlertCircle className="w-3 h-3" />
            +{delayMinutes}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <div className="text-2xl font-bold" data-testid="text-departure-time">{departureTime}</div>
            {firstLeg?.departureDelayMinutes && firstLeg.departureDelayMinutes > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                +{firstLeg.departureDelayMinutes}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{firstLeg?.from}</div>
        </div>
        
        <div className="flex-1 flex items-center gap-2 min-w-[60px]">
          <div className="h-px bg-border flex-1" />
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="h-px bg-border flex-1" />
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <div className="text-2xl font-bold" data-testid="text-arrival-time">{arrivalTime}</div>
            {lastLeg?.arrivalDelayMinutes && lastLeg.arrivalDelayMinutes > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                +{lastLeg.arrivalDelayMinutes}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{lastLeg?.to}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span className="font-medium">{duration}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <Train className="w-4 h-4" />
          <span className="font-medium">
            {transfers === 0 ? "Direct" : `${transfers} overstap${transfers > 1 ? 'pen' : ''}`}
          </span>
        </div>
      </div>
    </Button>
  );
}
