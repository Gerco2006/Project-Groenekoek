import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import StationSearch from "@/components/StationSearch";
import DepartureRow from "@/components/DepartureRow";
import TrainDialog from "@/components/TrainDialog";

interface SelectedTrain {
  trainType: string;
  trainNumber: string;
  destination: string;
  journeyId?: string;
}

interface Departure {
  direction: string;
  name: string;
  plannedDateTime: string;
  actualDateTime?: string;
  plannedTrack: string;
  actualTrack?: string;
  product: {
    number: string;
    categoryCode: string;
    shortCategoryName: string;
    longCategoryName: string;
  };
  trainCategory: string;
  cancelled: boolean;
  routeStations?: Array<{ uicCode: string; mediumName: string }>;
  departureStatus?: string;
  messages?: Array<{ message: string }>;
}

export default function DepartureBoard() {
  const [station, setStation] = useState("");
  const [searchedStation, setSearchedStation] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const { toast } = useToast();

  const { data: departuresData, isLoading, refetch, error: departuresError } = useQuery<any>({
    queryKey: ["/api/departures", searchedStation],
    enabled: !!searchedStation,
    queryFn: async () => {
      const response = await fetch(`/api/departures?station=${encodeURIComponent(searchedStation)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch departures");
      }
      return response.json();
    },
  });

  const { data: journeyData, error: journeyError } = useQuery<any>({
    queryKey: ["/api/journey", selectedTrain?.trainNumber],
    enabled: !!selectedTrain?.trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${selectedTrain?.trainNumber}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch journey details");
      }
      return response.json();
    },
    retry: 1,
  });

  const departures: Departure[] = departuresData?.payload?.departures || [];

  useEffect(() => {
    if (departuresError) {
      toast({
        title: "Fout bij ophalen vertrektijden",
        description: departuresError instanceof Error ? departuresError.message : "Er is een fout opgetreden",
        variant: "destructive",
      });
    }
  }, [departuresError, toast]);

  useEffect(() => {
    if (journeyError) {
      toast({
        title: "Fout bij ophalen treininfo",
        description: journeyError instanceof Error ? journeyError.message : "Er is een fout opgetreden",
        variant: "destructive",
      });
    }
  }, [journeyError, toast]);

  const handleSearch = () => {
    if (!station.trim()) {
      toast({
        title: "Station vereist",
        description: "Voer een station in om vertrektijden te zoeken",
        variant: "destructive",
      });
      return;
    }
    setSearchedStation(station);
  };

  const handleRefresh = () => {
    if (searchedStation) {
      refetch();
      toast({
        title: "Vernieuwd",
        description: "Vertrektijden zijn bijgewerkt",
      });
    }
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const calculateDelay = (planned: string, actual?: string) => {
    if (!actual) return 0;
    const plannedTime = new Date(planned).getTime();
    const actualTime = new Date(actual).getTime();
    return Math.round((actualTime - plannedTime) / 60000);
  };

  const trainStops = journeyData?.payload?.stops
    ?.filter((stop: any) => stop.stop?.name)
    ?.map((stop: any) => ({
      name: stop.stop.name,
      arrival: stop.actualArrivalTime ? formatTime(stop.actualArrivalTime) : (stop.plannedArrivalTime ? formatTime(stop.plannedArrivalTime) : null),
      departure: stop.actualDepartureTime ? formatTime(stop.actualDepartureTime) : (stop.plannedDepartureTime ? formatTime(stop.plannedDepartureTime) : null),
      platform: stop.actualArrivalTrack || stop.plannedArrivalTrack || stop.actualDepartureTrack || stop.plannedDepartureTrack || "",
    })) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vertrektijden</h1>
          <p className="text-muted-foreground">Bekijk actuele vertrektijden</p>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
          <StationSearch
            label="Station"
            value={station}
            onChange={setStation}
            placeholder="Bijv. Amsterdam Centraal"
            testId="input-station"
          />
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              size="lg"
              disabled={!station.trim() || isLoading}
              onClick={handleSearch}
              data-testid="button-search-departures"
            >
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? "Laden..." : "Zoek vertrektijden"}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleRefresh}
              disabled={!searchedStation || isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Vertrektijden laden...</p>
          </Card>
        )}

        {!isLoading && searchedStation && departures.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Geen vertrektijden gevonden voor {searchedStation}</p>
          </Card>
        )}

        {!isLoading && departures.length > 0 && (
          <Card className="divide-y">
            {departures.map((departure, idx) => {
              const delay = calculateDelay(departure.plannedDateTime, departure.actualDateTime);
              return (
                <DepartureRow
                  key={idx}
                  time={formatTime(departure.actualDateTime || departure.plannedDateTime)}
                  destination={departure.direction}
                  platform={departure.actualTrack || departure.plannedTrack}
                  trainType={departure.product.longCategoryName}
                  trainNumber={departure.product.number}
                  delay={delay > 0 ? delay : undefined}
                  onClick={() => setSelectedTrain({
                    trainType: departure.product.longCategoryName,
                    trainNumber: departure.product.number,
                    destination: departure.direction,
                  })}
                />
              );
            })}
          </Card>
        )}

        {selectedTrain && (
          <TrainDialog
            open={!!selectedTrain}
            onOpenChange={(open) => !open && setSelectedTrain(null)}
            trainType={selectedTrain.trainType}
            trainNumber={selectedTrain.trainNumber}
            from={searchedStation || station}
            to={selectedTrain.destination}
          />
        )}
      </div>
    </div>
  );
}
