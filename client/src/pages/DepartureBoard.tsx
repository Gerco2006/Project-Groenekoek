import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw, Search, AlertTriangle, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearch, useLocation } from "wouter";
import StationSearch from "@/components/StationSearch";
import DepartureRow from "@/components/DepartureRow";
import TripDetailPanel from "@/components/TripDetailPanel";
import MasterDetailLayout from "@/components/MasterDetailLayout";
import LiveTrainMap from "@/components/LiveTrainMap";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const isMobile = useIsMobile();
  const hasAutoSelectedRef = useRef(false);
  const lastProcessedStationRef = useRef<string | null>(null);
  const [station, setStation] = useState("");
  const [searchedStation, setSearchedStation] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const [activeTab, setActiveTab] = useState<"departures" | "arrivals">("departures");
  const [searchOpen, setSearchOpen] = useState(true);
  const { toast } = useToast();
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const stationParam = params.get("station");
    
    if (stationParam && stationParam !== lastProcessedStationRef.current) {
      lastProcessedStationRef.current = stationParam;
      setStation(stationParam);
      setSearchedStation(stationParam);
      setSearchOpen(false);
      hasAutoSelectedRef.current = false;
      setLocation("/vertrektijden", { replace: true });
    }
  }, [searchString, setLocation]);

  const { data: departuresData, isLoading: isDeparturesLoading, refetch: refetchDepartures, error: departuresError } = useQuery<any>({
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

  const { data: arrivalsData, isLoading: isArrivalsLoading, refetch: refetchArrivals, error: arrivalsError } = useQuery<any>({
    queryKey: ["/api/arrivals", searchedStation],
    enabled: !!searchedStation,
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
  
  const fullStationName = searchedStation;

  const { data: disruptionsData } = useQuery<any>({
    queryKey: ["/api/disruptions/station", fullStationName],
    enabled: !!fullStationName && !isLoading,
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
    setSelectedTrain(null);
    hasAutoSelectedRef.current = false;
  };

  useEffect(() => {
    setSelectedTrain(null);
    hasAutoSelectedRef.current = false;
  }, [activeTab]);

  useEffect(() => {
    hasAutoSelectedRef.current = false;
  }, [searchedStation]);

  useEffect(() => {
    if (isMobile === false && !hasAutoSelectedRef.current && !selectedTrain) {
      if (activeTab === "departures" && departures.length > 0) {
        const firstItem = departures[0];
        setSelectedTrain({
          trainType: firstItem.product.longCategoryName,
          trainNumber: firstItem.product.number,
          destination: firstItem.direction,
        });
        hasAutoSelectedRef.current = true;
      } else if (activeTab === "arrivals" && arrivals.length > 0) {
        const firstItem = arrivals[0];
        setSelectedTrain({
          trainType: firstItem.product.longCategoryName,
          trainNumber: firstItem.product.number,
          destination: firstItem.origin,
        });
        hasAutoSelectedRef.current = true;
      }
    }
  }, [isMobile, departures, arrivals, activeTab, selectedTrain]);

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

  const handleMapTrainClick = (ritId: string, trainNumber: number, trainType: string) => {
    setSelectedTrain({
      trainType: trainType,
      trainNumber: String(trainNumber),
      destination: "",
      journeyId: ritId,
    });
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

  const searchForm = (
    <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
      <Card className="backdrop-blur-sm bg-card/80 rounded-t-none md:rounded-xl rounded-b-xl">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full p-6 h-auto hover:bg-transparent no-default-hover-elevate justify-between rounded-b-none"
            data-testid="button-toggle-search"
          >
            <span className="font-semibold text-base">Zoek vertrek en aankomsttijden</span>
            {searchOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-6 pb-6 space-y-4">
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

          <div className="flex flex-wrap gap-2">
            <Button 
              className="flex-1 min-w-[200px] sm:min-w-0" 
              size="lg"
              disabled={!station.trim() || isLoading}
              onClick={handleSearch}
              data-testid="button-search"
            >
              <Search className="w-4 h-4 mr-2 shrink-0" />
              <span className="truncate">{isLoading ? "Laden..." : activeTab === "departures" ? "Zoek vertrektijden" : "Zoek aankomsten"}</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleRefresh}
              disabled={!searchedStation || isLoading}
              data-testid="button-refresh"
              className="shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  const masterContent = (
    <div className="h-full flex flex-col">
      <div className="shrink-0 md:px-4 pt-0 pb-3 md:py-6 space-y-4">
        {searchForm}
        <LiveTrainMap onTrainClick={handleMapTrainClick} collapsed={!!searchedStation} />
      </div>

      {!isLoading && searchedStation && activeDisruptions.length > 0 && (
        <div className="shrink-0 md:px-4 pb-4">
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
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex items-center justify-center md:px-4">
          <p className="text-muted-foreground">{activeTab === "departures" ? "Vertrektijden laden..." : "Aankomsttijden laden..."}</p>
        </div>
      )}

      {!isLoading && searchedStation && activeTab === "departures" && departures.length === 0 && (
        <div className="flex-1 flex items-center justify-center md:px-4">
          <p className="text-muted-foreground">Geen vertrektijden gevonden voor {searchedStation}</p>
        </div>
      )}

      {!isLoading && searchedStation && activeTab === "arrivals" && arrivals.length === 0 && (
        <div className="flex-1 flex items-center justify-center md:px-4">
          <p className="text-muted-foreground">Geen aankomsten gevonden voor {searchedStation}</p>
        </div>
      )}

      {!isLoading && activeTab === "departures" && departures.length > 0 && (
        <ScrollArea className="flex-1">
          <div className="md:px-4 pb-6">
            <Card className="divide-y">
              {departures.map((departure, idx) => {
                const delay = calculateDelay(departure.plannedDateTime, departure.actualDateTime);
                return (
                  <DepartureRow
                    key={idx}
                    time={formatTime(departure.plannedDateTime)}
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
          </div>
        </ScrollArea>
      )}

      {!isLoading && activeTab === "arrivals" && arrivals.length > 0 && (
        <ScrollArea className="flex-1">
          <div className="md:px-4 pb-6">
            <Card className="divide-y">
              {arrivals.map((arrival, idx) => {
                const delay = calculateDelay(arrival.plannedDateTime, arrival.actualDateTime);
                return (
                  <DepartureRow
                    key={idx}
                    time={formatTime(arrival.plannedDateTime)}
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
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const detailFrom = activeTab === "arrivals" 
    ? selectedTrain?.destination 
    : (searchedStation || station);
  const detailTo = activeTab === "arrivals" 
    ? (searchedStation || station) 
    : selectedTrain?.destination;

  const detailContent = selectedTrain && (
    <TripDetailPanel
      trainType={selectedTrain.trainType}
      trainNumber={selectedTrain.trainNumber}
      from={detailFrom || ""}
      to={detailTo || ""}
      open={!!selectedTrain}
      onClose={() => setSelectedTrain(null)}
    />
  );

  return (
    <div className="md:max-w-6xl mx-auto h-full overflow-hidden">
      <MasterDetailLayout
        master={masterContent}
        detail={detailContent}
        hasDetail={!!selectedTrain}
      />
    </div>
  );
}
