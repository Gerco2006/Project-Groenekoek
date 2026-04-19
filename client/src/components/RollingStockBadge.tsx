import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface RollingStockBadgeProps {
  trainNumber: string;
  className?: string;
}

export default function RollingStockBadge({ trainNumber, className = "" }: RollingStockBadgeProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/train-composition", trainNumber],
    enabled: !!trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/train-composition/${trainNumber}?features=zitplaats`);
      if (!response.ok) return null;
      return response.json();
    },
    retry: 0,
    staleTime: 60_000,
  });

  if (isLoading || !data?.materieeldelen?.length) return null;

  const types: string[] = Array.from(
    new Set<string>(
      (data.materieeldelen as any[]).map((d: any) => d.type).filter(Boolean)
    )
  );

  if (!types.length) return null;

  return (
    <div
      className={`flex items-center gap-0 overflow-x-auto flex-nowrap ${className}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      data-testid="rolling-stock-container"
    >
      {types.map((type, i) => (
        <div key={type} className="flex items-center shrink-0">
          {i > 0 && (
            <span className="text-muted-foreground/40 text-xs select-none px-1">|</span>
          )}
          <Badge
            variant="outline"
            className="text-xs font-medium text-muted-foreground border-muted-foreground/25 bg-muted/40 px-1.5 h-5"
            data-testid={`badge-rolling-stock-${type.toLowerCase()}`}
          >
            {type}
          </Badge>
        </div>
      ))}
    </div>
  );
}
