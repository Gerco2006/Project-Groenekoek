import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import TrainBadge from "./TrainBadge";
import RollingStockBadge from "./RollingStockBadge";

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
    <div className="border-b last:border-b-0 border-border">
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-3 h-auto hover-elevate bg-card rounded-none"
        onClick={onClick}
        data-testid={`button-${mode}`}
      >
        <div className="w-full min-w-0">
          {/* Mobile layout */}
          <div className="grid sm:hidden grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {/* Time — spans 2 rows */}
            <div className="row-span-2 flex items-center text-xl font-bold min-w-[56px]">
              <div>
                {time}
                {delay && delay > 0 && (
                  <div className="text-xs text-destructive">+{delay}'</div>
                )}
              </div>
            </div>

            {/* Row 1: TrainBadge + RollingStock (scrollable) + Platform */}
            <div className="flex items-center gap-1.5 justify-between min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="shrink-0">
                  <TrainBadge type={trainType} number={trainNumber} />
                </div>
                <RollingStockBadge trainNumber={trainNumber} className="flex-1 min-w-0" />
              </div>
              <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold text-xs text-center shrink-0 ml-1">
                Spoor {platform}
              </div>
            </div>

            {/* Row 2: destination */}
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{destination}</span>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden sm:flex items-center gap-4 w-full min-w-0">
            <div className="text-2xl font-bold min-w-[80px]" data-testid={`text-${mode}-time`}>
              {time}
              {delay && delay > 0 && (
                <span className="text-sm text-destructive ml-2">+{delay}'</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <TrainBadge type={trainType} number={trainNumber} />
              <RollingStockBadge trainNumber={trainNumber} />
            </div>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span
                className="font-medium truncate"
                data-testid="text-destination"
              >
                {destination}
              </span>
            </div>

            <div
              className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold min-w-[60px] text-center text-sm shrink-0"
              data-testid="text-platform"
            >
              Spoor {platform}
            </div>
          </div>
        </div>
      </Button>
    </div>
  );
}
