import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, Train } from "lucide-react";
import TrainBadge from "./TrainBadge";

interface TripLeg {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  platform?: string;
}

interface TripListItemButtonProps {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  transfers: number;
  legs: TripLeg[];
  onClick?: () => void;
  isSelected?: boolean;
}

export default function TripListItemButton({ 
  departureTime, 
  arrivalTime, 
  duration, 
  transfers, 
  legs,
  onClick,
  isSelected = false
}: TripListItemButtonProps) {
  const uniqueTrainTypes = Array.from(new Set(legs.map(leg => leg.trainType)));

  return (
    <Button
      variant={isSelected ? "secondary" : "ghost"}
      className="w-full h-auto p-4 hover-elevate flex-col items-stretch"
      onClick={onClick}
      data-testid="button-trip"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {uniqueTrainTypes.map((type, idx) => (
            <TrainBadge key={idx} type={type} />
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-center">
          <div className="text-2xl font-bold" data-testid="text-departure-time">{departureTime}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{legs[0]?.from}</div>
        </div>
        
        <div className="flex-1 flex items-center gap-2 min-w-[60px]">
          <div className="h-px bg-border flex-1" />
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="h-px bg-border flex-1" />
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold" data-testid="text-arrival-time">{arrivalTime}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{legs[legs.length - 1]?.to}</div>
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
