import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, Train, Users } from "lucide-react";
import TrainBadge from "./TrainBadge";
import type { TripLeg } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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

interface LiveDelayInfo {
  departureDelay: number;
  arrivalDelay: number;
}

export default function TripListItemButton({ 
  departureTime, 
  arrivalTime, 
  duration, 
  transfers, 
  legs,
  onClick,
  isSelected = false,
}: TripListItemButtonProps) {
  const uniqueTrainTypes = Array.from(new Set(legs.map(leg => leg.trainType)));
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  
  // Get train number for live delay fetching
  const trainNumber = firstLeg?.trainNumber;
  const fromStation = firstLeg?.from?.toLowerCase() || '';
  const toStation = lastLeg?.to?.toLowerCase() || '';

  // Fetch live delays from journey API
  const { data: liveDelays } = useQuery<LiveDelayInfo | null>({
    queryKey: ['/api/journey-delay', trainNumber, fromStation, toStation],
    queryFn: async () => {
      if (!trainNumber) return null;
      
      try {
        const response = await fetch(`/api/journey?train=${trainNumber}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        const stops = data?.payload?.stops;
        if (!stops || stops.length === 0) return null;
        
        let departureDelay = 0;
        let arrivalDelay = 0;
        
        for (const stop of stops) {
          const stopName = stop.stop?.name?.toLowerCase() || '';
          
          // Match departure station
          if (stopName.includes(fromStation) || fromStation.includes(stopName)) {
            if (stop.departures?.[0]) {
              const dep = stop.departures[0];
              if (dep.plannedTime && dep.actualTime) {
                const planned = new Date(dep.plannedTime).getTime();
                const actual = new Date(dep.actualTime).getTime();
                departureDelay = Math.max(0, Math.round((actual - planned) / 60000));
              }
            }
          }
          
          // Match arrival station
          if (stopName.includes(toStation) || toStation.includes(stopName)) {
            if (stop.arrivals?.[0]) {
              const arr = stop.arrivals[0];
              if (arr.plannedTime && arr.actualTime) {
                const planned = new Date(arr.plannedTime).getTime();
                const actual = new Date(arr.actualTime).getTime();
                arrivalDelay = Math.max(0, Math.round((actual - planned) / 60000));
              }
            }
          }
        }
        
        return { departureDelay, arrivalDelay };
      } catch {
        return null;
      }
    },
    enabled: !!trainNumber,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Use live delays if available, otherwise fall back to stored delays
  const departureDelay = liveDelays?.departureDelay ?? firstLeg?.departureDelayMinutes ?? 0;
  const arrivalDelay = liveDelays?.arrivalDelay ?? lastLeg?.arrivalDelayMinutes ?? 0;

  // Calculate average crowding level from embedded crowdForecast data
  const averageCrowding = useMemo(() => {
    const crowdingLevels: number[] = [];
    
    legs.forEach((leg) => {
      if (!leg.crowdForecast) return;
      
      const value = leg.crowdForecast === 'HIGH' ? 3 : leg.crowdForecast === 'MEDIUM' ? 2 : 1;
      crowdingLevels.push(value);
    });
    
    if (crowdingLevels.length === 0) return null;
    
    const avg = crowdingLevels.reduce((a, b) => a + b, 0) / crowdingLevels.length;
    if (avg >= 2.5) return 'HIGH';
    if (avg >= 1.5) return 'MEDIUM';
    return 'LOW';
  }, [legs]);

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
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <div className="text-2xl font-bold" data-testid="text-departure-time">{departureTime}</div>
            {departureDelay > 0 && (
              <span className="text-red-500 font-bold text-sm">+{departureDelay}</span>
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
            {arrivalDelay > 0 && (
              <span className="text-red-500 font-bold text-sm">+{arrivalDelay}</span>
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
