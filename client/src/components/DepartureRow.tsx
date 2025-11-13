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
      <div className="flex items-center gap-4 w-full">
        <div className="text-2xl font-bold min-w-[80px]" data-testid={`text-${mode}-time`}>
          {time}
          {delay && delay > 0 && (
            <span className="text-sm text-destructive ml-2">+{delay}'</span>
          )}
        </div>

        <TrainBadge type={trainType} number={trainNumber} />

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate" data-testid="text-destination">{destination}</span>
        </div>

        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold min-w-[60px] text-center" data-testid="text-platform">
          Spoor {platform}
        </div>
      </div>
    </Button>
  );
}
