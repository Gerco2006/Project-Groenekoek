import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Hash } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import TrainDialog from "@/components/TrainDialog";

export default function TrainLookup() {
  const [journeyNumber, setJourneyNumber] = useState("");
  const [searchedNumber, setSearchedNumber] = useState("");
  const { toast } = useToast();

  const { data: journeyData, isLoading, error } = useQuery({
    queryKey: ["/api/journey", searchedNumber],
    enabled: !!searchedNumber,
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${searchedNumber}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch journey details");
      }
      return response.json();
    },
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Fout bij ophalen treininfo",
        description: error instanceof Error ? error.message : "Er is een fout opgetreden",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleSearch = () => {
    if (!journeyNumber.trim()) {
      toast({
        title: "Ritnummer vereist",
        description: "Voer een ritnummer in om de treininfo op te zoeken",
        variant: "destructive",
      });
      return;
    }
    setSearchedNumber(journeyNumber);
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const trainStops = journeyData?.payload?.stops
    ?.filter((stop: any) => stop.stop?.name)
    ?.map((stop: any) => ({
      name: stop.stop.name,
      arrival: stop.actualArrivalTime ? formatTime(stop.actualArrivalTime) : (stop.plannedArrivalTime ? formatTime(stop.plannedArrivalTime) : null),
      departure: stop.actualDepartureTime ? formatTime(stop.actualDepartureTime) : (stop.plannedDepartureTime ? formatTime(stop.plannedDepartureTime) : null),
      platform: stop.actualArrivalTrack || stop.plannedArrivalTrack || stop.actualDepartureTrack || stop.plannedDepartureTrack || "",
    })) || [];

  const trainInfo = journeyData?.payload;
  const origin = trainStops.find((stop: any) => stop.departure && !stop.arrival);
  const destination = trainStops.length > 0 ? trainStops[trainStops.length - 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ritnummer zoeker</h1>
          <p className="text-muted-foreground">Zoek op ritnummer</p>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
          <div className="space-y-2">
            <Label htmlFor="journey-number" className="text-sm font-medium">
              Ritnummer
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="journey-number"
                data-testid="input-journey-number"
                type="text"
                value={journeyNumber}
                onChange={(e) => setJourneyNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Bijv. 12345"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Voer een ritnummer in voor specifieke ritinformatie
            </p>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSearch}
            disabled={!journeyNumber.trim() || isLoading}
            data-testid="button-search-journey"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? "Laden..." : "Zoek rit"}
          </Button>
        </div>

        {isLoading && (
          <div className="backdrop-blur-sm bg-card/80 rounded-xl p-8 border text-center text-muted-foreground">
            <p>Treininfo laden...</p>
          </div>
        )}

        {!isLoading && searchedNumber && !journeyData && (
          <div className="backdrop-blur-sm bg-card/80 rounded-xl p-8 border text-center text-muted-foreground">
            <p>Geen treininfo gevonden voor ritnummer {searchedNumber}</p>
          </div>
        )}

        {!isLoading && !searchedNumber && (
          <div className="backdrop-blur-sm bg-muted/50 rounded-xl p-6 border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              Voer een ritnummer in om de volledige route en actuele informatie te bekijken
            </p>
          </div>
        )}

        {trainInfo && (
          <TrainDialog
            open={!!searchedNumber && !!trainInfo}
            onOpenChange={(open) => !open && setSearchedNumber("")}
            trainType={trainInfo.product?.longCategoryName || "Trein"}
            trainNumber={searchedNumber}
            from={origin?.name || "Onbekend"}
            to={destination?.name || "Onbekend"}
          />
        )}
      </div>
    </div>
  );
}
