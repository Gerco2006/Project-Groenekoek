import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import TrainBadge from "./TrainBadge";

interface DepartureRowProps {
  time: string;
  destination: string;
  platform: string;
  trainType: string;
  trainNumber: string;
  delay?: number;
  onClick?: () => void;
  mode?: "departure" | "arrival";
}

export default function DepartureRow({
  time,
  destination,
  platform,
  trainType,
  trainNumber,
  delay,
  onClick,
  mode = "departure"
}: DepartureRowProps) {
  const Icon = mode === "arrival" ? ArrowLeft : ArrowRight;
  
  return (
    <Button
      variant="ghost"
      className="w-full justify-start p-4 h-auto hover-elevate bg-card"
      onClick={onClick}
      data-testid={`button-${mode}`}
    >
      <div className="w-full">
        {/* Mobile layout: 2-line grid */}
        <div className="grid sm:hidden grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {/* Time - spans 2 rows */}
          <div className="row-span-2 flex items-center text-xl font-bold min-w-[60px]">
            <div>
              {time}
              {delay && delay > 0 && (
                <div className="text-xs text-destructive">+{delay}'</div>
              )}
            </div>
          </div>

          {/* Row 1: Train badge + Platform */}
          <div className="flex items-center gap-2 justify-between">
            <TrainBadge type={trainType} number={trainNumber} />
            <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold text-xs text-center shrink-0">
              Spoor {platform}
            </div>
          </div>

          {/* Row 2: Destination */}
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {destination}
            </span>
          </div>
        </div>

        {/* Desktop layout: horizontal flex */}
        <div className="hidden sm:flex items-center flex-wrap gap-4 gap-y-2 w-full">
          <div className="text-2xl font-bold min-w-[80px]" data-testid={`text-${mode}-time`}>
            {time}
            {delay && delay > 0 && (
              <span className="text-sm text-destructive ml-2">+{delay}'</span>
            )}
          </div>

          <TrainBadge type={trainType} number={trainNumber} />

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0
            }} data-testid="text-destination">{destination}</span>
          </div>

          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold min-w-[60px] text-center text-sm shrink-0" data-testid="text-platform">
            Spoor {platform}
          </div>
        </div>
      </div>
    </Button>
  );
}
