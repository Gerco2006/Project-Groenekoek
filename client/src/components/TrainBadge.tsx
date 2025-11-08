import { Badge } from "@/components/ui/badge";
import { Train } from "lucide-react";

interface TrainBadgeProps {
  type: string;
  number?: string;
  className?: string;
}

export default function TrainBadge({ type, number, className = "" }: TrainBadgeProps) {
  const getTrainColor = () => {
    const normalized = type.toLowerCase();
    if (normalized.includes("ic") || normalized.includes("intercity")) {
      return "bg-train-intercity/10 text-train-intercity border-train-intercity/20";
    }
    if (normalized.includes("spr") || normalized.includes("sprinter")) {
      return "bg-train-sprinter/10 text-train-sprinter border-train-sprinter/20";
    }
    return "bg-train-other/10 text-train-other border-train-other/20";
  };

  const displayType = type.includes("IC") || type.includes("Intercity") ? "IC" : 
                      type.includes("SPR") || type.includes("Sprinter") ? "SPR" : 
                      type;

  return (
    <Badge 
      variant="outline" 
      className={`${getTrainColor()} gap-1 ${className}`}
      data-testid={`badge-train-${type.toLowerCase()}`}
    >
      <Train className="w-3 h-3" />
      <span className="font-semibold">{displayType}</span>
      {number && <span className="font-normal">{number}</span>}
    </Badge>
  );
}
