import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, ArrowRight, Train } from "lucide-react";
import { useState } from "react";
import TrainBadge from "./TrainBadge";
import { Badge } from "@/components/ui/badge";
import type { TripLeg } from "@shared/schema";

interface TripCardProps {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  transfers: number;
  legs: TripLeg[];
  onTrainClick?: (leg: TripLeg) => void;
}

export default function TripCard({ 
  departureTime, 
  arrivalTime, 
  duration, 
  transfers, 
  legs,
  onTrainClick 
}: TripCardProps) {
  const [expanded, setExpanded] = useState(false);

  const uniqueTrainTypes = Array.from(new Set(legs.map(leg => leg.trainType)));

  return (
    <Card className="overflow-hidden hover-elevate" data-testid="card-trip">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        data-testid="button-expand-trip"
      >
        {/* Header with key information */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {uniqueTrainTypes.map((type, idx) => (
                <TrainBadge key={idx} type={type} />
              ))}
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
          </div>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-departure-time">{departureTime}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{legs[0]?.from}</div>
              </div>
              
              <div className="flex-1 flex items-center gap-2 min-w-[100px]">
                <div className="h-px bg-border flex-1" />
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="h-px bg-border flex-1" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-arrival-time">{arrivalTime}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{legs[legs.length - 1]?.to}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="px-4 pb-4 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
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
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 p-4 space-y-3" data-testid="section-trip-details">
          {legs.map((leg, idx) => (
            <div key={idx} className="space-y-3">
              <Card 
                className="hover-elevate cursor-pointer overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  onTrainClick?.(leg);
                }}
                data-testid={`button-train-${idx}`}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <TrainBadge type={leg.trainType} number={leg.trainNumber} />
                    {leg.platform && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5 h-5 shrink-0">
                        <span className="sm:hidden">Sp. {leg.platform}</span>
                        <span className="hidden sm:inline">Spoor {leg.platform}</span>
                      </Badge>
                    )}
                  </div>
                  
                  {leg.direction && (
                    <div className="text-xs sm:text-sm text-muted-foreground truncate mb-3 min-w-0">
                      Richting <span className="font-medium text-foreground">{leg.direction}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-[12px,1fr] gap-x-3">
                    <div className="relative flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 w-px bg-border my-1" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-semibold">{leg.departure}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">{leg.from}</div>
                      </div>
                      
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-semibold">{leg.arrival}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">{leg.to}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              
              {idx < legs.length - 1 && (
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    Overstap in <span className="font-semibold">{leg.to}</span> 
                    {" • "}
                    {(() => {
                      const arrivalTime = new Date(`2000-01-01T${leg.arrival}`);
                      const nextDeparture = new Date(`2000-01-01T${legs[idx + 1].departure}`);
                      const diffMinutes = Math.round((nextDeparture.getTime() - arrivalTime.getTime()) / 60000);
                      return `${diffMinutes} min`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
