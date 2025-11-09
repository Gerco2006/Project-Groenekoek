import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw, Search, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import StationSearch from "@/components/StationSearch";
import DepartureRow from "@/components/DepartureRow";
import TrainDialog from "@/components/TrainDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface Arrival {
  origin: string;
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
  arrivalStatus?: string;
  messages?: Array<{ message: string }>;
}

export default function DepartureBoard() {
  const [station, setStation] = useState("");
  const [searchedStation, setSearchedStation] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const [activeTab, setActiveTab] = useState<"departures" | "arrivals">("departures");
  const { toast } = useToast();

  const { data: departuresData, isLoading: isDeparturesLoading, refetch: refetchDepartures, error: departuresError } = useQuery<any>({
    queryKey: ["/api/departures", searchedStation],
    enabled: !!searchedStation && activeTab === "departures",
    queryFn: async () => {
      const response = await fetch(`/api/departures?station=${encodeURIComponent(searchedStation)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch departures");
      }
      return response.json();
    },
  });

  const { data: arrivalsData, isLoading: isArrivalsLoading, refetch: refetchArrivals, error: arrivalsError } = useQuery<any>({
    queryKey: ["/api/arrivals", searchedStation],
    enabled: !!searchedStation && activeTab === "arrivals",
    queryFn: async () => {
      const response = await fetch(`/api/arrivals?station=${encodeURIComponent(searchedStation)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch arrivals");
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
  const arrivals: Arrival[] = arrivalsData?.payload?.arrivals || [];
  const isLoading = activeTab === "departures" ? isDeparturesLoading : isArrivalsLoading;
  
  const fullStationName = activeTab === "departures" 
    ? (departures[0]?.routeStations?.[0]?.mediumName || searchedStation)
    : (arrivals[0]?.routeStations?.[arrivals[0]?.routeStations?.length - 1]?.mediumName || searchedStation);

  const { data: disruptionsData } = useQuery<any>({
    queryKey: ["/api/disruptions/station", fullStationName],
    enabled: !!fullStationName,
    queryFn: async () => {
      const response = await fetch(`/api/disruptions/station/${encodeURIComponent(fullStationName)}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    retry: 1,
  });

  const disruptions = Array.isArray(disruptionsData) ? disruptionsData : (disruptionsData?.payload || []);
  const activeDisruptions = disruptions.filter((d: any) => d.isActive);

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
    if (arrivalsError) {
      toast({
        title: "Fout bij ophalen aankomsttijden",
        description: arrivalsError instanceof Error ? arrivalsError.message : "Er is een fout opgetreden",
        variant: "destructive",
      });
    }
  }, [arrivalsError, toast]);

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
      if (activeTab === "departures") {
        refetchDepartures();
        toast({
          title: "Vernieuwd",
          description: "Vertrektijden zijn bijgewerkt",
        });
      } else {
        refetchArrivals();
        toast({
          title: "Vernieuwd",
          description: "Aankomsttijden zijn bijgewerkt",
        });
      }
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
          <h1 className="text-3xl font-bold mb-2">Vertrektijden & Aankomsten</h1>
          <p className="text-muted-foreground">Bekijk actuele trein informatie</p>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
          <StationSearch
            label="Station"
            value={station}
            onChange={setStation}
            placeholder="Bijv. Amsterdam Centraal"
            testId="input-station"
          />
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "departures" | "arrivals")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="departures" data-testid="tab-departures">Vertrek</TabsTrigger>
              <TabsTrigger value="arrivals" data-testid="tab-arrivals">Aankomst</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              size="lg"
              disabled={!station.trim() || isLoading}
              onClick={handleSearch}
              data-testid="button-search"
            >
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? "Laden..." : activeTab === "departures" ? "Zoek vertrektijden" : "Zoek aankomsten"}
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

        {!isLoading && searchedStation && activeDisruptions.length > 0 && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10" data-testid="alert-disruptions">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="ml-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="font-semibold">
                    {activeDisruptions.length} {activeDisruptions.length === 1 ? 'storing' : 'storingen'}
                  </span>
                  {' '}op dit station
                </div>
                <Link href={`/storingen?station=${encodeURIComponent(fullStationName)}`}>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-disruptions">
                    Bekijk details
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>{activeTab === "departures" ? "Vertrektijden laden..." : "Aankomsttijden laden..."}</p>
          </Card>
        )}

        {!isLoading && searchedStation && activeTab === "departures" && departures.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Geen vertrektijden gevonden voor {searchedStation}</p>
          </Card>
        )}

        {!isLoading && searchedStation && activeTab === "arrivals" && arrivals.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Geen aankomsten gevonden voor {searchedStation}</p>
          </Card>
        )}

        {!isLoading && activeTab === "departures" && departures.length > 0 && (
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
                  mode="departure"
                  onClick={() => setSelectedTrain({
                    trainType: departure.product.longCategoryName,
                    trainNumber: departure.product.number,
                    destination: departure.direction,
                  })}
                  data-testid={`row-departure-${idx}`}
                />
              );
            })}
          </Card>
        )}

        {!isLoading && activeTab === "arrivals" && arrivals.length > 0 && (
          <Card className="divide-y">
            {arrivals.map((arrival, idx) => {
              const delay = calculateDelay(arrival.plannedDateTime, arrival.actualDateTime);
              return (
                <DepartureRow
                  key={idx}
                  time={formatTime(arrival.actualDateTime || arrival.plannedDateTime)}
                  destination={arrival.origin}
                  platform={arrival.actualTrack || arrival.plannedTrack}
                  trainType={arrival.product.longCategoryName}
                  trainNumber={arrival.product.number}
                  delay={delay > 0 ? delay : undefined}
                  mode="arrival"
                  onClick={() => setSelectedTrain({
                    trainType: arrival.product.longCategoryName,
                    trainNumber: arrival.product.number,
                    destination: arrival.origin,
                  })}
                  data-testid={`row-arrival-${idx}`}
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
