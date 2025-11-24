import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, Train, AlertCircle, Users } from "lucide-react";
import TrainBadge from "./TrainBadge";
import type { TripLeg } from "@shared/schema";
import { useQueries } from "@tanstack/react-query";

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

  // Fetch crowding data for all train legs
  const crowdingQueries = useQueries({
    queries: legs.map(leg => ({
      queryKey: ["/api/train-crowding", leg.trainNumber],
      enabled: !!leg.trainNumber,
      queryFn: async () => {
        const response = await fetch(`/api/train-crowding/${leg.trainNumber}`);
        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error("Failed to fetch crowding data");
        }
        return response.json();
      },
      retry: 1,
      staleTime: 60000, // Cache for 1 minute
    })),
  });

  // Calculate average crowding level
  const getAverageCrowding = () => {
    const crowdingLevels = crowdingQueries
      .map((query, idx) => {
        if (!query.data?.prognoses) return null;
        
        // Get crowding for origin and destination of this leg
        const leg = legs[idx];
        const originPrognosis = query.data.prognoses.find((p: any) => 
          p.station?.toLowerCase().includes(leg.from.toLowerCase())
        );
        const destPrognosis = query.data.prognoses.find((p: any) => 
          p.station?.toLowerCase().includes(leg.to.toLowerCase())
        );
        
        // Average of origin and destination crowding
        const crowdings = [originPrognosis?.uitstapPrognose?.classification, destPrognosis?.instapPrognose?.classification]
          .filter(Boolean);
        
        if (crowdings.length === 0) return null;
        
        const values = crowdings.map((c: string) => 
          c === 'HIGH' ? 3 : c === 'MEDIUM' ? 2 : 1
        );
        return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      })
      .filter((v): v is number => v !== null);
    
    if (crowdingLevels.length === 0) return null;
    
    const avg = crowdingLevels.reduce((a, b) => a + b, 0) / crowdingLevels.length;
    if (avg >= 2.5) return 'HIGH';
    if (avg >= 1.5) return 'MEDIUM';
    return 'LOW';
  };

  const averageCrowding = getAverageCrowding();

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
        <div className="flex gap-1.5 flex-wrap shrink-0">
          {averageCrowding && (
            <Badge variant="outline" className={`gap-1 text-xs ${crowdingColors[averageCrowding as keyof typeof crowdingColors]}`}>
              <Users className="w-3 h-3" />
              {crowdingLabels[averageCrowding as keyof typeof crowdingLabels]}
            </Badge>
          )}
          {delayMinutes && delayMinutes > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              +{delayMinutes}
            </Badge>
          )}
        </div>
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
