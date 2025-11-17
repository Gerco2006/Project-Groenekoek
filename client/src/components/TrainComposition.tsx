import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, Bike, BatteryCharging, Accessibility, Droplet, Train as TrainIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface TrainCompositionProps {
  ritnummer: string;
}

interface Facility {
  type: string;
  icon: JSX.Element;
  label: string;
}

const facilityMap: Record<string, Facility> = {
  WIFI: { type: "WIFI", icon: <Wifi className="w-4 h-4" />, label: "WiFi" },
  FIETS: { type: "FIETS", icon: <Bike className="w-4 h-4" />, label: "Fiets" },
  STROOM: { type: "STROOM", icon: <BatteryCharging className="w-4 h-4" />, label: "Stroom" },
  TOEGANKELIJK: { type: "TOEGANKELIJK", icon: <Accessibility className="w-4 h-4" />, label: "Toegankelijk" },
  TOILET: { type: "TOILET", icon: <Droplet className="w-4 h-4" />, label: "Toilet" },
};

export default function TrainComposition({ ritnummer }: TrainCompositionProps) {
  const isMobile = useIsMobile();

  const { data: compositionData, isLoading: isCompositionLoading } = useQuery({
    queryKey: ["/api/train-composition", ritnummer],
    enabled: !!ritnummer,
    queryFn: async () => {
      const response = await fetch(`/api/train-composition/${ritnummer}?features=zitplaats`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch train composition");
      }
      return response.json();
    },
    retry: 1,
  });

  if (isCompositionLoading) {
    return (
      <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 border">
        <p className="text-sm text-muted-foreground text-center">Materieelinfo laden...</p>
      </div>
    );
  }

  if (!compositionData || !compositionData.materieeldelen || compositionData.materieeldelen.length === 0) {
    return null;
  }

  const materieeldelen = compositionData.materieeldelen || [];

  // Calculate totals
  const totalSeatsFirstClass = materieeldelen.reduce((sum: number, deel: any) => 
    sum + (deel.zitplaatsen?.zitplaatsEersteKlas || 0) + (deel.zitplaatsen?.klapstoelEersteKlas || 0), 0
  );
  const totalSeatsSecondClass = materieeldelen.reduce((sum: number, deel: any) => 
    sum + (deel.zitplaatsen?.zitplaatsTweedeKlas || 0) + (deel.zitplaatsen?.klapstoelTweedeKlas || 0), 0
  );
  const totalBikeSpots = materieeldelen.reduce((sum: number, deel: any) => 
    sum + (deel.zitplaatsen?.fietsplekken || 0), 0
  );

  // Get unique facilities across all parts
  const allFacilities = new Set<string>();
  materieeldelen.forEach((deel: any) => {
    deel.faciliteiten?.forEach((fac: string) => allFacilities.add(fac));
  });

  return (
    <div className="space-y-4" data-testid="train-composition">
      {/* Overview Card - Moved to top without header */}
      <Card className="backdrop-blur-sm bg-card/80 p-4 space-y-3">
        {/* Capacity Overview */}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-3 text-center">Totale capaciteit materieel</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">{totalSeatsFirstClass}</p>
              <p className="text-xs text-muted-foreground">1e klas</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">{totalSeatsSecondClass}</p>
              <p className="text-xs text-muted-foreground">2e klas</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">{totalBikeSpots}</p>
              <p className="text-xs text-muted-foreground">Fietsplekken</p>
            </div>
          </div>
        </div>

        {/* Facilities */}
        {allFacilities.size > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {Array.from(allFacilities).map((fac) => {
              const facility = facilityMap[fac];
              if (!facility) return null;
              return (
                <Badge key={fac} variant="outline" className="gap-1" data-testid={`facility-${fac.toLowerCase()}`}>
                  {facility.icon}
                  <span className="text-xs">{facility.label}</span>
                </Badge>
              );
            })}
          </div>
        )}
      </Card>

      {/* Material Parts - With header */}
      <div className="flex items-center gap-2 mb-2">
        <TrainIcon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Materieelinfo</h3>
      </div>
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {materieeldelen.map((deel: any, index: number) => (
          <Card key={index} className="backdrop-blur-sm bg-card/80 p-4 space-y-3" data-testid={`material-part-${index}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm" data-testid={`material-number-${index}`}>
                  {deel.materieelnummer}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`material-type-${index}`}>
                  {deel.type}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {deel.bakken?.length || 0} bakken
              </Badge>
            </div>

            {/* Seats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="font-semibold">{(deel.zitplaatsen?.zitplaatsEersteKlas || 0) + (deel.zitplaatsen?.klapstoelEersteKlas || 0)}</p>
                <p className="text-muted-foreground">1e klas</p>
              </div>
              <div>
                <p className="font-semibold">{(deel.zitplaatsen?.zitplaatsTweedeKlas || 0) + (deel.zitplaatsen?.klapstoelTweedeKlas || 0)}</p>
                <p className="text-muted-foreground">2e klas</p>
              </div>
              <div>
                <p className="font-semibold">{deel.zitplaatsen?.fietsplekken || 0}</p>
                <p className="text-muted-foreground">Fietsen</p>
              </div>
            </div>

            {/* Facilities */}
            {deel.faciliteiten && deel.faciliteiten.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {deel.faciliteiten.map((fac: string) => {
                  const facility = facilityMap[fac];
                  if (!facility) return null;
                  return (
                    <div key={fac} className="p-1.5 rounded bg-muted" title={facility.label} data-testid={`part-${index}-facility-${fac.toLowerCase()}`}>
                      {facility.icon}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Train Visualization */}
      <Card className="backdrop-blur-sm bg-card/80 p-4 space-y-3">
        <h4 className="font-semibold text-sm">Trein samenstelling</h4>
        <div 
          className="overflow-x-auto overflow-y-hidden pb-2 rounded-lg p-3 max-w-full"
          style={{ scrollbarWidth: 'thin' }}
          data-testid="train-visualization"
        >
          <div className="flex w-max">
            {materieeldelen.map((deel: any, deelIndex: number) => (
              <div 
                key={deelIndex} 
                className="relative overflow-hidden shrink-0 border-y border-r first:border-l first:rounded-l-lg last:rounded-r-lg border-border/50"
                style={{ 
                  width: isMobile ? '500px' : '400px',
                  height: isMobile ? '80px' : '100px',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.85) 100%)'
                }}
                data-testid={`train-part-${deelIndex}`}
              >
                {deel.afbeelding ? (
                  <img 
                    src={deel.afbeelding} 
                    alt={`${deel.type} - ${deel.materieelnummer}`}
                    className="w-full h-full object-contain"
                    style={{
                      mixBlendMode: 'darken',
                      objectPosition: 'center'
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrainIcon className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-xs">{deel.type}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Scroll horizontaal om alle treindelen te bekijken
        </p>
      </Card>
    </div>
  );
}
