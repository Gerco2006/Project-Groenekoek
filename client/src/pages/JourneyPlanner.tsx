import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowDownUp, Search, Calendar as CalendarIcon, Clock, Loader2, Plus, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import StationSearch from "@/components/StationSearch";
import TripCard from "@/components/TripCard";
import TrainDialog from "@/components/TrainDialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SelectedTrain {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
}

export default function JourneyPlanner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viaStations, setViaStations] = useState<string[]>([]);
  const [searchedFrom, setSearchedFrom] = useState("");
  const [searchedTo, setSearchedTo] = useState("");
  const [searchedViaStations, setSearchedViaStations] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<"departure" | "arrival">("departure");
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const { toast } = useToast();

  const swapStations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const addViaStation = () => {
    setViaStations([...viaStations, ""]);
  };

  const removeViaStation = (index: number) => {
    setViaStations(viaStations.filter((_, i) => i !== index));
  };

  const updateViaStation = (index: number, value: string) => {
    const updated = [...viaStations];
    updated[index] = value;
    setViaStations(updated);
  };

  const buildDateTime = () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return `${dateStr}T${time}:00`;
  };

  const { data: tripsData, isLoading, error } = useQuery<any>({
    queryKey: ["/api/trips", searchedFrom, searchedTo, searchedViaStations, searchMode, date, time],
    enabled: !!searchedFrom && !!searchedTo,
    queryFn: async () => {
      const dateTime = buildDateTime();
      const params = new URLSearchParams({
        fromStation: searchedFrom,
        toStation: searchedTo,
        dateTime: dateTime,
      });

      if (searchMode === "arrival") {
        params.append("searchForArrival", "true");
      }

      searchedViaStations.forEach((via) => {
        if (via.trim()) {
          params.append("viaStation", via);
        }
      });

      const response = await fetch(`/api/trips?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch trips");
      }
      return response.json();
    },
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Fout bij ophalen reisadviezen",
        description: error instanceof Error ? error.message : "Er is een fout opgetreden",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleSearch = () => {
    if (!from.trim() || !to.trim()) {
      toast({
        title: "Stations vereist",
        description: "Voer zowel een vertrek- als aankomststation in",
        variant: "destructive",
      });
      return;
    }
    setSearchedFrom(from);
    setSearchedTo(to);
    setSearchedViaStations(viaStations.filter(v => v.trim() !== ""));
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const calculateDuration = (departureTime: string, arrivalTime: string) => {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const diffMs = arrival.getTime() - departure.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return hours > 0 ? `${hours}u ${minutes}m` : `${minutes}m`;
  };

  const trips = tripsData?.trips?.map((trip: any) => {
    const legs = trip.legs
      ?.filter((leg: any) => leg.product?.categoryCode)
      ?.map((leg: any) => ({
        trainType: leg.product.categoryCode === "SPR" ? "Sprinter" : 
                   leg.product.categoryCode === "IC" ? "Intercity" :
                   leg.product.categoryCode === "INT" ? "International" :
                   leg.product.shortCategoryName || "Trein",
        trainNumber: leg.product.number || "",
        from: leg.origin.name,
        to: leg.destination.name,
        departure: formatTime(leg.origin.actualDateTime || leg.origin.plannedDateTime),
        arrival: formatTime(leg.destination.actualDateTime || leg.destination.plannedDateTime),
        platform: leg.origin.actualTrack || leg.origin.plannedTrack,
      })) || [];

    const departureTime = formatTime(trip.legs[0]?.origin?.actualDateTime || trip.legs[0]?.origin?.plannedDateTime);
    const arrivalTime = formatTime(trip.legs[trip.legs.length - 1]?.destination?.actualDateTime || trip.legs[trip.legs.length - 1]?.destination?.plannedDateTime);
    const duration = calculateDuration(
      trip.legs[0]?.origin?.actualDateTime || trip.legs[0]?.origin?.plannedDateTime,
      trip.legs[trip.legs.length - 1]?.destination?.actualDateTime || trip.legs[trip.legs.length - 1]?.destination?.plannedDateTime
    );

    return {
      departureTime,
      arrivalTime,
      duration,
      transfers: trip.transfers || 0,
      legs,
    };
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reisplanner</h1>
          <p className="text-muted-foreground">Plan je reis met de trein</p>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <StationSearch
              label="Van"
              value={from}
              onChange={setFrom}
              placeholder="Bijv. Amsterdam Centraal"
              testId="input-from-station"
            />
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={swapStations}
              className="mb-0 self-end"
              data-testid="button-swap-stations"
            >
              <ArrowDownUp className="w-4 h-4" />
            </Button>
            
            <StationSearch
              label="Naar"
              value={to}
              onChange={setTo}
              placeholder="Bijv. Rotterdam Centraal"
              testId="input-to-station"
            />
          </div>

          {viaStations.length > 0 && (
            <div className="space-y-3">
              {viaStations.map((via, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <StationSearch
                      label="Via station (optioneel)"
                      value={via}
                      onChange={(value) => updateViaStation(index, value)}
                      placeholder="Bijv. Utrecht Centraal"
                      testId={`input-via-station-${index}`}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeViaStation(index)}
                    className="shrink-0 mb-0"
                    data-testid={`button-remove-via-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {viaStations.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addViaStation}
              className="gap-2"
              data-testid="button-add-via-station"
            >
              <Plus className="w-4 h-4" />
              Tussenstation toevoegen
            </Button>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: nl })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-sm font-medium">Tijd</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="time-input"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pl-9"
                    data-testid="input-time"
                  />
                </div>
                <ToggleGroup 
                  type="single" 
                  value={searchMode}
                  onValueChange={(value) => value && setSearchMode(value as "departure" | "arrival")}
                  className="border rounded-md"
                  data-testid="toggle-search-mode"
                >
                  <ToggleGroupItem value="departure" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground" data-testid="toggle-departure">
                    Vertrek
                  </ToggleGroupItem>
                  <ToggleGroupItem value="arrival" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground" data-testid="toggle-arrival">
                    Aankomst
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSearch}
            disabled={isLoading}
            data-testid="button-search-trips"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Bezig met zoeken...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Zoek reis
              </>
            )}
          </Button>
        </div>

        {searchedFrom && searchedTo && !isLoading && trips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Reismogelijkheden</h2>
            {trips.map((trip: any, idx: number) => (
              <TripCard
                key={idx}
                {...trip}
                onTrainClick={(leg) => setSelectedTrain(leg)}
              />
            ))}
          </div>
        )}

        {searchedFrom && searchedTo && !isLoading && trips.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Geen reismogelijkheden gevonden voor deze route.</p>
          </div>
        )}

        {selectedTrain && (
          <TrainDialog
            open={!!selectedTrain}
            onOpenChange={(open) => !open && setSelectedTrain(null)}
            trainType={selectedTrain.trainType}
            trainNumber={selectedTrain.trainNumber}
            from={selectedTrain.from}
            to={selectedTrain.to}
          />
        )}
      </div>
    </div>
  );
}
