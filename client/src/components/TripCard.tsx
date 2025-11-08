import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
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
        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        data-testid="button-expand-trip"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-1 min-w-[300px]">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-departure-time">{departureTime}</div>
            </div>
            
            <div className="flex-1 flex items-center gap-2">
              <div className="h-px bg-border flex-1" />
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration}
              </div>
              <div className="h-px bg-border flex-1" />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-arrival-time">{arrivalTime}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5">
              {uniqueTrainTypes.map((type, idx) => (
                <TrainBadge key={idx} type={type} />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {transfers === 0 ? "Direct" : `${transfers} overstap${transfers > 1 ? 'pen' : ''}`}
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/30 p-4 space-y-2" data-testid="section-trip-details">
          {legs.map((leg, idx) => (
            <div key={idx} className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start p-3 h-auto hover-elevate"
                onClick={(e) => {
                  e.stopPropagation();
                  onTrainClick?.(leg);
                }}
                data-testid={`button-train-${idx}`}
              >
                <div className="flex items-start gap-3 w-full">
                  <TrainBadge type={leg.trainType} number={leg.trainNumber} />
                  
                  <div className="flex-1 space-y-1 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{leg.departure}</span>
                      <span className="text-muted-foreground">{leg.from}</span>
                      {leg.platform && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Spoor {leg.platform}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{leg.arrival}</span>
                      <span className="text-muted-foreground">{leg.to}</span>
                    </div>
                  </div>
                </div>
              </Button>
              
              {idx < legs.length - 1 && (
                <div className="pl-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Overstap in <span className="font-semibold">{leg.to}</span> 
                    {" - "}
                    {(() => {
                      const arrivalTime = new Date(`2000-01-01T${leg.arrival}`);
                      const nextDeparture = new Date(`2000-01-01T${legs[idx + 1].departure}`);
                      const diffMinutes = Math.round((nextDeparture.getTime() - arrivalTime.getTime()) / 60000);
                      return `${diffMinutes} minuten overstaptijd`;
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
