import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface RollingStockBadgeProps {
  trainNumber: string;
}

export default function RollingStockBadge({ trainNumber }: RollingStockBadgeProps) {
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
    <>
      {types.map((type) => (
        <Badge
          key={type}
          variant="outline"
          className="text-xs px-1.5 py-0 h-5 font-medium text-muted-foreground border-muted-foreground/30"
          data-testid={`badge-rolling-stock-${type.toLowerCase()}`}
        >
          {type}
        </Badge>
      ))}
    </>
  );
}
