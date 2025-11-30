import { useEffect, useRef, useState, useMemo } from "react";
import { X, Clock, AlertCircle, Navigation, Loader2, Info, Train, Wifi, UtensilsCrossed, Accessibility, BatteryCharging, ChevronDown, ChevronUp, Droplet, Bike, Users, Link, Unlink } from "lucide-react";
import TrainBadge from "./TrainBadge";
import TrainComposition from "./TrainComposition";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useBackButtonClose } from "@/hooks/use-back-button";

const crowdingColors = {
  LOW: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  MEDIUM: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  HIGH: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const crowdingLabels = {
  LOW: "Rustig",
  MEDIUM: "Gemiddelde drukte",
  HIGH: "Druk, mogelijk vol",
};

interface TripDetailPanelProps {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export default function TripDetailPanel({
  trainType,
  trainNumber,
  from,
  to,
  open,
  onClose,
  onBack,
}: TripDetailPanelProps) {
  const isMobile = useIsMobile();
  useBackButtonClose(open && !!isMobile, onClose);
  const [showAllStations, setShowAllStations] = useState(false);
  const [trainInfoOpen, setTrainInfoOpen] = useState(true);
  const [materialInfoOpen, setMaterialInfoOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!open) {
      setShowAllStations(false);
      setTrainInfoOpen(false);
      setMaterialInfoOpen(false);
    }
  }, [open]);
  
  const { data: journeyData, isLoading } = useQuery<any>({
    queryKey: ["/api/journey", trainNumber],
    enabled: open && !!trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${trainNumber}`);
      if (!response.ok) throw new Error("Failed to fetch journey details");
      return response.json();
    },
    retry: 1,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const { data: crowdingData } = useQuery({
    queryKey: ["/api/train-crowding", trainNumber],
    enabled: open && !!trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/train-crowding/${trainNumber}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch crowding data");
      }
      return response.json();
    },
    retry: 1,
  });

  const { data: compositionData } = useQuery({
    queryKey: ["/api/train-composition", trainNumber],
    enabled: open && !!trainNumber,
    queryFn: async () => {
      const response = await fetch(`/api/train-composition/${trainNumber}?features=zitplaats`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch composition data");
      }
      return response.json();
    },
    retry: 1,
  });

  // Normalize station name for comparison
  const normalizeStationName = (name: string | undefined | null): string => {
    if (!name) return "";
    return name.toLowerCase().trim();
  };

  // Calculate composition changes per stop
  const compositionChangesPerStop = useMemo(() => {
    if (!compositionData?.materieeldelen || !journeyData?.payload?.stops) return {};
    
    const stoppingStops = journeyData.payload.stops.filter((s: any) => s.status !== "PASSING");
    const journeyFirstStop = normalizeStationName(stoppingStops[0]?.stop?.name);
    const journeyLastStop = normalizeStationName(stoppingStops[stoppingStops.length - 1]?.stop?.name);
    
    // Map normalized stop names to original names for display
    const stopNameMap: Record<string, string> = {};
    for (const stop of stoppingStops) {
      const normalized = normalizeStationName(stop.stop?.name);
      if (normalized && stop.stop?.name) {
        stopNameMap[normalized] = stop.stop.name;
      }
    }
    
    const changes: Record<string, { joining: string[]; leaving: string[] }> = {};
    
    for (const deel of compositionData.materieeldelen) {
      const deelStart = deel.vertrekStationNaam || deel.vertrekStation?.naam;
      const deelEnd = deel.eindStationNaam || deel.eindStation?.naam;
      const normalizedDeelStart = normalizeStationName(deelStart);
      const normalizedDeelEnd = normalizeStationName(deelEnd);
      const materialInfo = `${deel.type} ${deel.materieelnummer}`;
      
      // Check if this unit joins later (different start than journey first stop)
      if (normalizedDeelStart && journeyFirstStop && normalizedDeelStart !== journeyFirstStop) {
        // Find the matching stop name from the journey
        const matchingStopName = stopNameMap[normalizedDeelStart] || deelStart;
        if (!changes[matchingStopName]) changes[matchingStopName] = { joining: [], leaving: [] };
        changes[matchingStopName].joining.push(materialInfo);
      }
      
      // Check if this unit leaves early (different end than journey last stop)
      if (normalizedDeelEnd && journeyLastStop && normalizedDeelEnd !== journeyLastStop) {
        // Find the matching stop name from the journey
        const matchingStopName = stopNameMap[normalizedDeelEnd] || deelEnd;
        if (!changes[matchingStopName]) changes[matchingStopName] = { joining: [], leaving: [] };
        changes[matchingStopName].leaving.push(materialInfo);
      }
    }
    
    return changes;
  }, [compositionData, journeyData]);

  const formatTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const calculateDelay = (planned: string, actual: string) => {
    if (!planned || !actual) return 0;
    const plannedTime = new Date(planned).getTime();
    const actualTime = new Date(actual).getTime();
    return Math.round((actualTime - plannedTime) / 60000);
  };

  const getCurrentLocation = () => {
    if (!journeyData?.payload?.stops) return null;
    const now = new Date();
    const stops = journeyData.payload.stops;
    
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const departure = stop.departures?.[0];
      const arrival = stop.arrivals?.[0];
      
      const departureTime = departure?.actualTime || departure?.plannedTime;
      const arrivalTime = arrival?.actualTime || arrival?.plannedTime;
      
      if (arrivalTime && new Date(arrivalTime) > now) {
        if (i === 0) return null;
        return i - 0.5;
      }
      
      if (departureTime && new Date(departureTime) > now) {
        return i;
      }
    }
    
    const lastStop = stops[stops.length - 1];
    const lastArrival = lastStop?.arrivals?.[0];
    const lastArrivalTime = lastArrival?.actualTime || lastArrival?.plannedTime;
    if (lastArrivalTime && new Date(lastArrivalTime) <= now) {
      return stops.length - 1;
    }
    
    return null;
  };

  const currentLocationIndex = getCurrentLocation();
  const allStops = journeyData?.payload?.stops || [];
  const displayedStops = showAllStations 
    ? allStops 
    : allStops.filter((stop: any) => stop.status !== "PASSING");
  
  const firstStopName = allStops.find((stop: any) => stop.status !== "PASSING")?.stop?.name || "";
  const lastStopName = [...allStops].reverse().find((stop: any) => stop.status !== "PASSING")?.stop?.name || "";
  const displayFrom = from || firstStopName;
  const displayTo = to || lastStopName;
  
  const firstStopWithStock = allStops.find((stop: any) => stop.actualStock || stop.plannedStock);
  const actualStock = firstStopWithStock?.actualStock;
  const plannedStock = firstStopWithStock?.plannedStock;
  
  const isNonTrainTransport = trainType && (
    trainType.toLowerCase().includes('bus') ||
    trainType.toLowerCase().includes('tram') ||
    trainType.toLowerCase().includes('metro')
  );

  const getFacilityIcon = (facilityName: string) => {
    const name = facilityName.toLowerCase();
    if (name.includes('wifi') || name.includes('internet')) {
      return <Wifi className="w-3.5 h-3.5" />;
    }
    if (name.includes('toilet') || name.includes('wc')) {
      return <Droplet className="w-3.5 h-3.5" />;
    }
    if (name.includes('bistro') || name.includes('restaurant') || name.includes('eten')) {
      return <UtensilsCrossed className="w-3.5 h-3.5" />;
    }
    if (name.includes('toegankelijk') || name.includes('rolstoel')) {
      return <Accessibility className="w-3.5 h-3.5" />;
    }
    if (name.includes('fiets')) {
      return <Bike className="w-3.5 h-3.5" />;
    }
    if (name.includes('stopcontact') || name.includes('stroom')) {
      return <BatteryCharging className="w-3.5 h-3.5" />;
    }
    return null;
  };
  
  useEffect(() => {
    if (!open || !journeyData?.payload?.stops || currentLocationIndex === null || currentLocationIndex < 0) {
      return;
    }

    const scrollToCurrentStop = () => {
      const targetIndex = Math.floor(currentLocationIndex);
      const stopElement = document.querySelector(`[data-testid="row-stop-${targetIndex}"]`) as HTMLElement;
      
      if (stopElement) {
        if (isMobile) {
          stopElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
        } else {
          const scrollContainer = scrollAreaRef.current;
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = stopElement.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;
            const targetScroll = scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
            
            scrollContainer.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    const timeouts = [100, 300, 500];
    timeouts.forEach(delay => {
      setTimeout(scrollToCurrentStop, delay);
    });
  }, [open, journeyData?.payload?.stops, currentLocationIndex, isMobile]);
  
  const content = (
    <div className={`flex flex-col ${isMobile ? '' : 'h-full overflow-hidden'}`}>
      {!isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TrainBadge type={trainType} number={trainNumber} />
            <span className="text-lg font-semibold truncate">
              {displayFrom} → {displayTo}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                data-testid="button-back-to-trip-desktop"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="button-close-detail"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : isNonTrainTransport ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">Geen gegevens beschikbaar</p>
            <p className="text-sm text-muted-foreground max-w-md">
              De NS API geeft helaas geen rit-informatie voor bussen, trams en metro's. Het is nog onbekend of hier verandering in komt.
            </p>
          </div>
        </div>
      ) : (
        <div className={`${isMobile ? '' : 'flex-1 flex flex-col min-h-0 overflow-hidden'}`}>
          {/* Material Info Section (includes location map button) */}
          <div className={`pt-4 ${isMobile ? '' : 'shrink-0 max-h-[40%] overflow-y-auto'}`}>
            <TrainComposition ritnummer={trainNumber} journeyStops={allStops} />
          </div>

          {!isNonTrainTransport && (
            <div className={`px-4 py-3 ${isMobile ? '' : 'shrink-0'}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllStations(!showAllStations)}
                className="gap-2"
                data-testid="button-toggle-all-stations"
              >
                <Info className="w-4 h-4" />
                {showAllStations ? "Toon alleen stops" : "Toon alle stations"}
              </Button>
            </div>
          )}

          <div ref={scrollAreaRef} className={`px-4 pb-4 ${isMobile ? '' : 'flex-1 overflow-y-auto min-h-0 basis-0'}`}>
            <div className="space-y-2">
              {displayedStops.map((stop: any, displayIdx: number) => {
                const isPassing = stop.status === "PASSING";
                const originalIdx = allStops.indexOf(stop);
                const isCurrentLocation = currentLocationIndex === originalIdx;
                const isBetweenStops = currentLocationIndex === originalIdx - 0.5;
                const isPast = currentLocationIndex !== null && 
                              !isBetweenStops && 
                              !isCurrentLocation && 
                              originalIdx < Math.floor(currentLocationIndex);
                
                const arrival = stop.arrivals?.[0];
                const departure = stop.departures?.[0];
                
                const arrivalTime = formatTime(arrival?.plannedTime);
                const departureTime = formatTime(departure?.plannedTime);
                const arrivalDelay = calculateDelay(arrival?.plannedTime, arrival?.actualTime);
                const departureDelay = calculateDelay(departure?.plannedTime, departure?.actualTime);
                const platform = arrival?.actualTrack || arrival?.plannedTrack || 
                                departure?.actualTrack || departure?.plannedTrack;

                // Find crowding data for this stop
                const stopCrowding = crowdingData?.prognoses?.find(
                  (prognosis: any) => prognosis.stationUic === stop.stop?.uicCode
                );

                return (
                  <div key={originalIdx}>
                    {isBetweenStops && (
                      <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg mb-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Trein rijdt nu tussen stations
                        </span>
                      </div>
                    )}
                    <div
                      className={`bg-card border rounded-lg p-3 ${
                        isPassing ? "opacity-60" : isPast ? "opacity-50" : "hover-elevate"
                      } ${isCurrentLocation ? "border-primary border-2 bg-primary/5" : ""}`}
                      data-testid={`row-stop-${originalIdx}`}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <div className="flex flex-col items-center pt-1">
                          {isCurrentLocation ? (
                            <div className="w-4 h-4 rounded-full bg-primary animate-pulse shrink-0" />
                          ) : originalIdx === 0 ? (
                            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                          ) : originalIdx === allStops.length - 1 ? (
                            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                          ) : isPassing ? (
                            <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-primary bg-background shrink-0" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`font-semibold ${isPassing ? "text-muted-foreground" : ""}`}>
                              {stop.stop?.name}
                            </span>
                            {isCurrentLocation && (
                              <Badge variant="default" className="shrink-0">
                                <Navigation className="w-3 h-3 mr-1" />
                                Nu hier
                              </Badge>
                            )}
                            {stopCrowding && !isPassing && !isMobile && (
                              <Badge 
                                variant="outline" 
                                className={`shrink-0 gap-1 ${crowdingColors[stopCrowding.classification as keyof typeof crowdingColors]}`}
                                data-testid={`crowding-${originalIdx}`}
                              >
                                <Users className="w-3 h-3" />
                                {crowdingLabels[stopCrowding.classification as keyof typeof crowdingLabels]}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Composition changes at this stop */}
                          {compositionChangesPerStop[stop.stop?.name] && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {compositionChangesPerStop[stop.stop?.name].joining.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" data-testid={`stop-joining-${originalIdx}`}>
                                  <Link className="w-3 h-3 mr-1" />
                                  +{compositionChangesPerStop[stop.stop?.name].joining.length} stel(len) erbij
                                </Badge>
                              )}
                              {compositionChangesPerStop[stop.stop?.name].leaving.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400" data-testid={`stop-leaving-${originalIdx}`}>
                                  <Unlink className="w-3 h-3 mr-1" />
                                  -{compositionChangesPerStop[stop.stop?.name].leaving.length} stel(len) eraf
                                </Badge>
                              )}
                            </div>
                          )}

                          {isPassing ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="w-3 h-3" />
                              <span>Trein stopt hier niet</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {arrivalTime && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Aankomst:</span>
                                  <span className="font-medium">{arrivalTime}</span>
                                  {arrivalDelay > 0 && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                      +{arrivalDelay}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {departureTime && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Vertrek:</span>
                                  <span className="font-medium">{departureTime}</span>
                                  {departureDelay > 0 && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                      +{departureDelay}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {isMobile && platform && (
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                  <Badge variant="outline" className="shrink-0">
                                    Spoor {platform}
                                  </Badge>
                                  {stopCrowding && (
                                    <Badge 
                                      variant="outline" 
                                      className={`shrink-0 gap-1 ${crowdingColors[stopCrowding.classification as keyof typeof crowdingColors]}`}
                                      data-testid={`crowding-${originalIdx}`}
                                    >
                                      <Users className="w-3 h-3" />
                                      {crowdingLabels[stopCrowding.classification as keyof typeof crowdingLabels]}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {platform && !isPassing && !isMobile && (
                          <Badge variant="outline" className="shrink-0">
                            Spoor {platform}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(newOpen) => !newOpen && onClose()} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="border-b shrink-0 pl-3 pr-1 py-2.5">
            <DrawerTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1" style={{
                overflow: 'hidden'
              }}>
                <div className="shrink-0">
                  <TrainBadge type={trainType} number={trainNumber} />
                </div>
                <span className="text-xs" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0
                }}>{displayFrom} → {displayTo}</span>
              </div>
              <div className="flex items-center shrink-0">
                {onBack && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    data-testid="button-back-to-trip"
                  >
                    <ChevronDown className="w-5 h-5 rotate-90" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  data-testid="button-close-mobile-train-detail"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : isNonTrainTransport ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-lg font-semibold">Geen gegevens beschikbaar</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  De NS API geeft helaas geen rit-informatie voor bussen, trams en metro's. Het is nog onbekend of hier verandering in komt.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Fixed Train Composition Section (includes location map button) */}
              <div className="pt-4 shrink-0">
                <TrainComposition ritnummer={trainNumber} journeyStops={allStops} />
              </div>

              {!isNonTrainTransport && (
                <div className="px-4 py-3 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllStations(!showAllStations)}
                    className="gap-2"
                    data-testid="button-toggle-all-stations"
                  >
                    <Info className="w-4 h-4" />
                    {showAllStations ? "Toon alleen stops" : "Toon alle stations"}
                  </Button>
                </div>
              )}

              {/* Scrollable Station List */}
              <div ref={mobileScrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                  {displayedStops.map((stop: any, displayIdx: number) => {
                    const isPassing = stop.status === "PASSING";
                    const originalIdx = allStops.indexOf(stop);
                    const isCurrentLocation = currentLocationIndex === originalIdx;
                    const isBetweenStops = currentLocationIndex === originalIdx - 0.5;
                    const isPast = currentLocationIndex !== null && 
                                  !isBetweenStops && 
                                  !isCurrentLocation && 
                                  originalIdx < Math.floor(currentLocationIndex);
                    
                    const arrival = stop.arrivals?.[0];
                    const departure = stop.departures?.[0];
                    
                    const arrivalTime = formatTime(arrival?.plannedTime);
                    const departureTime = formatTime(departure?.plannedTime);
                    const arrivalDelay = calculateDelay(arrival?.plannedTime, arrival?.actualTime);
                    const departureDelay = calculateDelay(departure?.plannedTime, departure?.actualTime);
                    const platform = arrival?.actualTrack || arrival?.plannedTrack || 
                                    departure?.actualTrack || departure?.plannedTrack;

                    // Find crowding data for this stop
                    const stopCrowding = crowdingData?.prognoses?.find(
                      (prognosis: any) => prognosis.stationUic === stop.stop?.uicCode
                    );

                    return (
                      <div key={originalIdx}>
                        {isBetweenStops && (
                          <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg mb-2">
                            <Navigation className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">
                              Trein rijdt nu tussen stations
                            </span>
                          </div>
                        )}
                        <div
                          className={`bg-card border rounded-lg p-3 ${
                            isPassing ? "opacity-60" : isPast ? "opacity-50" : "hover-elevate"
                          } ${isCurrentLocation ? "border-primary border-2 bg-primary/5" : ""}`}
                          data-testid={`row-stop-${originalIdx}`}
                        >
                          <div className="flex items-start gap-4 w-full">
                            <div className="flex flex-col items-center pt-1">
                              {isCurrentLocation ? (
                                <div className="w-4 h-4 rounded-full bg-primary animate-pulse shrink-0" />
                              ) : originalIdx === 0 ? (
                                <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                              ) : originalIdx === allStops.length - 1 ? (
                                <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                              ) : isPassing ? (
                                <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border-2 border-primary bg-background shrink-0" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className={`font-semibold ${isPassing ? "text-muted-foreground" : ""}`}>
                                  {stop.stop?.name}
                                </span>
                                {isCurrentLocation && (
                                  <Badge variant="default" className="shrink-0">
                                    <Navigation className="w-3 h-3 mr-1" />
                                    Nu hier
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Composition changes at this stop (mobile) */}
                              {compositionChangesPerStop[stop.stop?.name] && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {compositionChangesPerStop[stop.stop?.name].joining.length > 0 && (
                                    <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" data-testid={`mobile-stop-joining-${originalIdx}`}>
                                      <Link className="w-3 h-3 mr-1" />
                                      +{compositionChangesPerStop[stop.stop?.name].joining.length} stel(len) erbij
                                    </Badge>
                                  )}
                                  {compositionChangesPerStop[stop.stop?.name].leaving.length > 0 && (
                                    <Badge variant="outline" className="text-xs bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400" data-testid={`mobile-stop-leaving-${originalIdx}`}>
                                      <Unlink className="w-3 h-3 mr-1" />
                                      -{compositionChangesPerStop[stop.stop?.name].leaving.length} stel(len) eraf
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {isPassing ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Trein stopt hier niet</span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {arrivalTime && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground">Aankomst:</span>
                                      <span className="font-medium">{arrivalTime}</span>
                                      {arrivalDelay > 0 && (
                                        <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                          +{arrivalDelay}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {departureTime && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground">Vertrek:</span>
                                      <span className="font-medium">{departureTime}</span>
                                      {departureDelay > 0 && (
                                        <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                          +{departureDelay}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {platform && (
                                    <div className="flex items-center gap-2 text-sm flex-wrap">
                                      <Badge variant="outline" className="shrink-0">
                                        Spoor {platform}
                                      </Badge>
                                      {stopCrowding && (
                                        <Badge 
                                          variant="outline" 
                                          className={`shrink-0 gap-1 ${crowdingColors[stopCrowding.classification as keyof typeof crowdingColors]}`}
                                          data-testid={`crowding-${originalIdx}`}
                                        >
                                          <Users className="w-3 h-3" />
                                          {crowdingLabels[stopCrowding.classification as keyof typeof crowdingLabels]}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className="h-full border-l bg-background flex flex-col overflow-hidden" data-testid="panel-trip-detail">
      {content}
    </div>
  );
}
