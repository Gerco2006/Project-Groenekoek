import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, Bike, BatteryCharging, Accessibility, BellOff, Bath, Train as TrainIcon, ChevronDown, ChevronUp, Star, Layers } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useWidgetManager } from "@/hooks/use-widget-manager";
import { useState } from "react";

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
  TOILET: { type: "TOILET", icon: <Bath className="w-4 h-4" />, label: "Toilet" },
  STILTE: { type: "STILTE", icon: <BellOff className="w-4 h-4" />, label: "Stilte" }
};

export default function TrainComposition({ ritnummer }: TrainCompositionProps) {
  const isMobile = useIsMobile();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { addTrackedMaterial, removeTrackedMaterial, isMaterialTracked, config } = useWidgetManager();

  const handleToggleTrack = (materialNumber: string | number, materialType: string) => {
    const matNumStr = String(materialNumber);
    if (isMaterialTracked(matNumStr)) {
      const material = config.trackedMaterials.find(m => m.materialNumber === matNumStr);
      if (material) {
        removeTrackedMaterial(material.id);
      }
    } else {
      addTrackedMaterial(matNumStr, `${materialType} ${matNumStr}`);
    }
  };

  const { data: compositionData, isLoading: isCompositionLoading } = useQuery({
    queryKey: ["/api/train-composition", ritnummer],
    enabled: !!ritnummer,
    queryFn: async () => {
      const response = await fetch(`/api/train-composition/${ritnummer}?features=zitplaats`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Kon trein samenstelling niet ophalen");
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

  // Helper function to get seat counts from various possible data structures
  const getSeatsFromDeel = (deel: any) => {
    // Try zitplaatsen object first (older API structure)
    if (deel.zitplaatsen) {
      return {
        firstClass: (deel.zitplaatsen.zitplaatsEersteKlas || 0) + (deel.zitplaatsen.klapstoelEersteKlas || 0),
        secondClass: (deel.zitplaatsen.zitplaatsTweedeKlas || 0) + (deel.zitplaatsen.klapstoelTweedeKlas || 0),
        bikes: deel.zitplaatsen.fietsplekken || 0
      };
    }
    
    // Try bakken (carriage sections) - aggregate from all bakken
    if (deel.bakken && Array.isArray(deel.bakken)) {
      let firstClass = 0, secondClass = 0, bikes = 0;
      deel.bakken.forEach((bak: any) => {
        if (bak.zitplaatsen) {
          firstClass += (bak.zitplaatsen.zitplaatsEersteKlas || 0) + (bak.zitplaatsen.klapstoelEersteKlas || 0);
          secondClass += (bak.zitplaatsen.zitplaatsTweedeKlas || 0) + (bak.zitplaatsen.klapstoelTweedeKlas || 0);
          bikes += bak.zitplaatsen.fietsplekken || 0;
        }
        // Alternative field names in bakken
        firstClass += bak.aantalZitplaatsenEersteKlas || 0;
        secondClass += bak.aantalZitplaatsenTweedeKlas || 0;
        bikes += bak.aantalFietsplekken || 0;
      });
      return { firstClass, secondClass, bikes };
    }
    
    // Direct fields on deel (alternative naming)
    return {
      firstClass: deel.aantalZitplaatsenEersteKlas || deel.zitplaatsenEersteKlas || 0,
      secondClass: deel.aantalZitplaatsenTweedeKlas || deel.zitplaatsenTweedeKlas || 0,
      bikes: deel.aantalFietsplekken || deel.fietsplekken || 0
    };
  };

  // Bereken totaal aantal zitplaatsen en fietsplekken
  const totals = materieeldelen.reduce((acc: { firstClass: number, secondClass: number, bikes: number }, deel: any) => {
    const seats = getSeatsFromDeel(deel);
    return {
      firstClass: acc.firstClass + seats.firstClass,
      secondClass: acc.secondClass + seats.secondClass,
      bikes: acc.bikes + seats.bikes
    };
  }, { firstClass: 0, secondClass: 0, bikes: 0 });

  const totalSeatsFirstClass = totals.firstClass;
  const totalSeatsSecondClass = totals.secondClass;
  const totalBikeSpots = totals.bikes;

  const allFacilities = new Set<string>();
  materieeldelen.forEach((deel: any) => {
    deel.faciliteiten?.forEach((fac: string) => allFacilities.add(fac));
  });

  return (
    <div className="space-y-1" data-testid="train-composition">
      {/* Trein visualizatie - Always visible */}
      <div className="px-4 pt-2">
        <div className="rounded-lg overflow-hidden border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4" />
            <span className="font-medium text-sm">Treinsamenstelling</span>
          </div>
          <div 
            className="overflow-x-auto overflow-y-hidden w-full"
            style={{ scrollbarWidth: 'thin' }}
            data-testid="train-visualization"
          >
            <div className="flex px-2 w-max">
              {materieeldelen.map((deel: any, deelIndex: number) => (
                <div 
                  key={deelIndex} 
                  className="shrink-0"
                  style={{ 
                    width: 'auto',
                    height: '45px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: 0,
                  }}
                  data-testid={`train-part-${deelIndex}`}
                >
                  {deel.afbeelding && (
                    <img 
                      src={deel.afbeelding}
                      alt={`${deel.type} - ${deel.materieelnummer}`}
                      style={{
                        height: '100%',
                        width: 'auto',
                        display: 'block',
                        objectFit: 'contain',
                        objectPosition: 'center bottom',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Scroll horizontaal om alle treindelen te bekijken
          </p>
        </div>
      </div>

      {/* Material Details - Collapsible */}
      <div className="px-4 py-1">
        <Button
          id="button-toggle-material-info"
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full justify-between gap-2"
          data-testid="button-toggle-material-info"
          aria-expanded={detailsOpen}
          aria-controls="material-info-content"
        >
          <div className="flex items-center gap-2">
            <TrainIcon className="w-4 h-4" />
            <span>Materieelinfo</span>
          </div>
          {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {detailsOpen && (
          <div 
            id="material-info-content"
            role="region"
            aria-labelledby="button-toggle-material-info"
            className={`mt-3 rounded-lg overflow-hidden border p-4 space-y-4 ${isMobile ? 'max-h-[50vh] overflow-y-auto' : ''}`}
          >
            {/* Capacity Overview */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium text-center">Totale capaciteit materieel</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">{totalSeatsFirstClass || "—"}</p>
                  <p className="text-xs text-muted-foreground">Zitplaatsen 1e klas</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">{totalSeatsSecondClass || "—"}</p>
                  <p className="text-xs text-muted-foreground">Zitplaatsen 2e klas</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">{totalBikeSpots || "—"}</p>
                  <p className="text-xs text-muted-foreground">Beschikbare Fietsplekken</p>
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
            </div>

            {/* Material Parts */}
            <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {materieeldelen.map((deel: any, index: number) => {
                const isTracked = isMaterialTracked(String(deel.materieelnummer));
                const deelSeats = getSeatsFromDeel(deel);
                return (
                  <Card key={index} className="bg-card/80 p-4 space-y-3" data-testid={`material-part-${index}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm" data-testid={`material-number-${index}`}>
                          {deel.materieelnummer}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`material-type-${index}`}>
                          {deel.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleTrack(deel.materieelnummer, deel.type)}
                          className={isTracked ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-foreground"}
                          data-testid={`button-track-material-${index}`}
                        >
                          <Star className={`w-4 h-4 ${isTracked ? "fill-current" : ""}`} />
                        </Button>
                        <Badge variant="outline" className="text-xs">
                          {deel.bakken?.length || 0} bakken
                        </Badge>
                      </div>
                    </div>

                    {/* Seats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="font-semibold">{deelSeats.firstClass || "—"}</p>
                        <p className="text-muted-foreground">1e klas</p>
                      </div>
                      <div>
                        <p className="font-semibold">{deelSeats.secondClass || "—"}</p>
                        <p className="text-muted-foreground">2e klas</p>
                      </div>
                      <div>
                        <p className="font-semibold">{deelSeats.bikes || "—"}</p>
                        <p className="text-muted-foreground">Fietsplekken</p>
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
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
