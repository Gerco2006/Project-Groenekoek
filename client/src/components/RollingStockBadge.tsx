import { useQuery } from "@tanstack/react-query";

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
    <span
      className="text-xs text-muted-foreground font-medium shrink-0 truncate max-w-[120px] sm:max-w-none"
      data-testid="text-rolling-stock"
    >
      {types.join(" | ")}
    </span>
  );
}
