import { Badge } from "@/components/ui/badge";

interface RollingStockBadgeProps {
  types?: string[];
  className?: string;
}

export default function RollingStockBadge({ types, className = "" }: RollingStockBadgeProps) {
  if (!types?.length) return null;

  return (
    <div
      className={`overflow-x-auto flex-1 min-w-0 ${className}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      data-testid="rolling-stock-container"
    >
      <Badge
        variant="outline"
        className="whitespace-nowrap text-xs font-medium text-muted-foreground border-muted-foreground/25 bg-muted/40 px-1.5 h-5"
        data-testid="badge-rolling-stock"
      >
        {types.join(" | ")}
      </Badge>
    </div>
  );
}
