import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowDownUp, Search, Calendar as CalendarIcon, Clock, Loader2, Plus, X, Settings2, AlertTriangle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StationSearch from "@/components/StationSearch";
import TripListItemButton from "@/components/TripListItemButton";
import TripAdviceDetailPanel from "@/components/TripAdviceDetailPanel";
import TripDetailPanel from "@/components/TripDetailPanel";
import CollapsibleSearchForm from "@/components/CollapsibleSearchForm";
import MasterDetailLayout from "@/components/MasterDetailLayout";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface TripLeg {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  platform?: string;
  plannedDeparture?: string;
  actualDeparture?: string;
  plannedArrival?: string;
  actualArrival?: string;
  departureDelayMinutes?: number;
  arrivalDelayMinutes?: number;
  cancelled?: boolean;
}

interface SelectedTrip {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  transfers: number;
  legs: TripLeg[];
  delayMinutes?: number;
  status?: string;
}

interface SelectedTrain {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
}

export default function JourneyPlanner() {
  const isMobile = useIsMobile();
  const hasAutoSelectedRef = useRef(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viaStations, setViaStations] = useState<string[]>([]);
  const [searchedFrom, setSearchedFrom] = useState("");
  const [searchedTo, setSearchedTo] = useState("");
  const [searchedViaStations, setSearchedViaStations] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<"departure" | "arrival">("departure");
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const [detailMode, setDetailMode] = useState<'trip' | 'train' | null>(null);
  const [isSearchFormOpen, setIsSearchFormOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
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
        searchType: searchMode === "arrival" ? "ARRIVAL" : "DEPART",
      });

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

  const { data: disruptionsData } = useQuery<any>({
    queryKey: ["/api/disruptions"],
    enabled: !!searchedFrom || !!searchedTo,
    queryFn: async () => {
      const response = await fetch(`/api/disruptions?isActive=true`);
      if (!response.ok) return [];
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

  const routeStations = searchedFrom && searchedTo ? [searchedFrom, searchedTo, ...searchedViaStations.filter(v => v.trim())] : [];
  const routeDisruptions = Array.isArray(disruptionsData) 
    ? disruptionsData.filter((d: any) => {
        const affectedStations = d.publicationSections
          ?.flatMap((ps: any) => ps.section?.stations || [])
          .map((s: any) => s.name.toLowerCase()) || [];
        return routeStations.some(rs => 
          affectedStations.some((as: string) => as.includes(rs.toLowerCase()) || rs.toLowerCase().includes(as))
        );
      })
    : [];

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
    setSelectedTripIndex(null);
    setSelectedTrain(null);
    setDetailMode(null);
    hasAutoSelectedRef.current = false;
    if (isMobile) {
      setIsSearchFormOpen(false);
    }
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

  const calculateDelayMinutes = (plannedTime: string | null, actualTime: string | null): number | undefined => {
    if (!plannedTime || !actualTime) return undefined;
    const planned = new Date(plannedTime);
    const actual = new Date(actualTime);
    const diffMs = actual.getTime() - planned.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return diffMins > 0 ? diffMins : undefined;
  };

  const trips: SelectedTrip[] = tripsData?.trips?.map((trip: any) => {
    const legs: TripLeg[] = trip.legs
      ?.filter((leg: any) => leg.product?.categoryCode)
      ?.map((leg: any) => {
        const plannedDeparture = leg.origin.plannedDateTime;
        const actualDeparture = leg.origin.actualDateTime;
        const plannedArrival = leg.destination.plannedDateTime;
        const actualArrival = leg.destination.actualDateTime;
        
        return {
          trainType: leg.product.categoryCode === "SPR" ? "Sprinter" : 
                     leg.product.categoryCode === "IC" ? "Intercity" :
                     leg.product.categoryCode === "INT" ? "International" :
                     leg.product.shortCategoryName || "Trein",
          trainNumber: leg.product.number || "",
          from: leg.origin.name,
          to: leg.destination.name,
          departure: formatTime(actualDeparture || plannedDeparture),
          arrival: formatTime(actualArrival || plannedArrival),
          platform: leg.origin.actualTrack || leg.origin.plannedTrack,
          plannedDeparture,
          actualDeparture,
          plannedArrival,
          actualArrival,
          departureDelayMinutes: calculateDelayMinutes(plannedDeparture, actualDeparture),
          arrivalDelayMinutes: calculateDelayMinutes(plannedArrival, actualArrival),
          cancelled: leg.cancelled || false,
        };
      }) || [];

    const departureTime = formatTime(trip.legs[0]?.origin?.actualDateTime || trip.legs[0]?.origin?.plannedDateTime);
    const arrivalTime = formatTime(trip.legs[trip.legs.length - 1]?.destination?.actualDateTime || trip.legs[trip.legs.length - 1]?.destination?.plannedDateTime);
    const duration = calculateDuration(
      trip.legs[0]?.origin?.actualDateTime || trip.legs[0]?.origin?.plannedDateTime,
      trip.legs[trip.legs.length - 1]?.destination?.actualDateTime || trip.legs[trip.legs.length - 1]?.destination?.plannedDateTime
    );

    const delayMinutes = trip.actualDurationInMinutes && trip.plannedDurationInMinutes 
      ? trip.actualDurationInMinutes - trip.plannedDurationInMinutes 
      : 0;

    return {
      departureTime,
      arrivalTime,
      duration,
      transfers: trip.transfers || 0,
      legs,
      delayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
      status: trip.status,
    };
  }) || [];

  useEffect(() => {
    hasAutoSelectedRef.current = false;
    setSelectedTripIndex(null);
    setSelectedTrain(null);
    setDetailMode(null);
  }, [searchedFrom, searchedTo, searchedViaStations, searchMode, date, time]);

  useEffect(() => {
    if (isMobile === false && trips.length > 0 && !hasAutoSelectedRef.current) {
      setSelectedTripIndex(0);
      setDetailMode('trip');
      hasAutoSelectedRef.current = true;
    }
  }, [isMobile, trips]);
  
  const selectedTrip = selectedTripIndex !== null ? trips[selectedTripIndex] : null;

  const searchFormContent = (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 min-w-0">
            <StationSearch
              label="Van"
              value={from}
              onChange={setFrom}
              placeholder="Bijv. Amsterdam Centraal"
              testId="input-from-station"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <StationSearch
              label="Naar"
              value={to}
              onChange={setTo}
              placeholder="Bijv. Rotterdam Centraal"
              testId="input-to-station"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={swapStations}
            className="shrink-0"
            data-testid="button-swap-stations"
          >
            <ArrowDownUp className="w-4 h-4" />
          </Button>

          {viaStations.length === 0 && (
            <Button
              variant="outline"
              onClick={addViaStation}
              className="gap-2 flex-1"
              data-testid="button-add-via-station"
            >
              <Plus className="w-4 h-4" />
              Tussenstation toevoegen
            </Button>
          )}
        </div>
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

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            data-testid="button-toggle-advanced"
          >
            <Settings2 className="w-4 h-4" />
            {isAdvancedOpen ? "Verberg opties" : "Toon opties"}
            <span className="ml-auto text-xs text-muted-foreground">
              {!isAdvancedOpen && `${format(date, "d MMM", { locale: nl })} · ${time} · ${searchMode === "departure" ? "Vertrek" : "Aankomst"}`}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
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
            <Label htmlFor="time-input" className="text-sm font-medium">Tijd & Richting</Label>
            <div className="flex flex-col sm:flex-row gap-2">
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
                className="border rounded-md shrink-0"
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
        </CollapsibleContent>
      </Collapsible>

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
    </>
  );

  const masterContent = (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reisplanner</h1>
          <p className="text-muted-foreground">Plan je reis met de trein</p>
        </div>
        <CollapsibleSearchForm
          isOpen={isSearchFormOpen}
          onToggle={() => setIsSearchFormOpen(!isSearchFormOpen)}
          title="Plan je reis"
        >
          {searchFormContent}
        </CollapsibleSearchForm>
        
        {!isSearchFormOpen && isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Reismogelijkheden laden...</span>
          </div>
        )}
      </div>

      {searchedFrom && searchedTo && routeDisruptions.length > 0 && (
        <div className="shrink-0 px-4 pb-4">
          <Alert className="border-yellow-500/50 bg-yellow-500/10" data-testid="alert-route-disruptions">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="ml-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="font-semibold">
                    {routeDisruptions.length} {routeDisruptions.length === 1 ? 'storing/werkzaamheid' : 'storingen/werkzaamheden'}
                  </span>
                  {' '}op dit traject
                </div>
                <Link href="/storingen">
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-route-disruptions">
                    Bekijk details
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {searchedFrom && searchedTo && !isLoading && trips.length > 0 && (
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 pb-6">
            <h2 className="text-xl font-semibold">Reismogelijkheden</h2>
            {trips.map((trip, idx) => (
              <TripListItemButton
                key={idx}
                {...trip}
                onClick={() => {
                  setSelectedTripIndex(idx);
                  setDetailMode('trip');
                }}
                isSelected={selectedTripIndex === idx}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {searchedFrom && searchedTo && !isLoading && trips.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-muted-foreground">Geen reismogelijkheden gevonden voor deze route.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto h-full">
      <MasterDetailLayout
        master={masterContent}
        detail={
          detailMode === 'trip' && selectedTrip ? (
            <TripAdviceDetailPanel
              {...selectedTrip}
              open={!!selectedTrip}
              onClose={() => {
                setSelectedTripIndex(null);
                setDetailMode(null);
              }}
              onTrainClick={(leg) => {
                setSelectedTrain(leg);
                setDetailMode('train');
              }}
            />
          ) : detailMode === 'train' && selectedTrain ? (
            <TripDetailPanel
              trainType={selectedTrain.trainType}
              trainNumber={selectedTrain.trainNumber}
              from={selectedTrain.from}
              to={selectedTrain.to}
              open={!!selectedTrain}
              onClose={() => {
                setSelectedTrain(null);
                setDetailMode(selectedTrip ? 'trip' : null);
              }}
              onBack={selectedTripIndex !== null ? () => {
                setSelectedTrain(null);
                setDetailMode('trip');
              } : undefined}
            />
          ) : null
        }
        hasDetail={detailMode !== null}
      />
      {isMobile && selectedTrain && detailMode === 'train' && (
        <TripDetailPanel
          trainType={selectedTrain.trainType}
          trainNumber={selectedTrain.trainNumber}
          from={selectedTrain.from}
          to={selectedTrain.to}
          open={detailMode === 'train'}
          onClose={() => {
            setSelectedTrain(null);
            setDetailMode(selectedTrip ? 'trip' : null);
          }}
          onBack={selectedTripIndex !== null ? () => {
            setSelectedTrain(null);
            setDetailMode('trip');
          } : undefined}
        />
      )}
    </div>
  );
}
