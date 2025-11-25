import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Train, X, Plus, Loader2, ChevronRight, RefreshCw, AlertCircle, MapPin, Clock } from "lucide-react";
import type { TrackedMaterial } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import TripDetailPanel from "./TripDetailPanel";

interface MaterieelTrackerWidgetProps {
  trackedMaterials: TrackedMaterial[];
  onMaterialAdd: (materialNumber: string, name?: string) => void;
  onMaterialRemove: (id: string) => void;
  onMaterialNameUpdate: (materialNumber: string, name: string) => void;
}

interface ProductInfo {
  categoryCode?: string;
  shortCategoryName?: string;
  longCategoryName?: string;
}

interface JourneyData {
  ritnummer: string;
  journeyData: {
    payload: {
      productNumbers: string[];
      stops: Array<{
        id: string;
        stop: {
          name: string;
          uicCode: string;
        };
        arrivals?: Array<{
          plannedTime: string;
          actualTime?: string;
          delayInSeconds?: number;
          cancelled?: boolean;
          status?: string;
          product?: ProductInfo;
        }>;
        departures?: Array<{
          plannedTime: string;
          actualTime?: string;
          delayInSeconds?: number;
          cancelled?: boolean;
          status?: string;
          product?: ProductInfo;
        }>;
        status?: string;
      }>;
      product?: ProductInfo;
    };
  };
}

function MaterialCard({ 
  material, 
  onRemove,
  onShowDetail,
  onNameUpdate,
  isLast
}: { 
  material: TrackedMaterial; 
  onRemove: () => void;
  onShowDetail: (data: JourneyData) => void;
  onNameUpdate: (name: string) => void;
  isLast: boolean;
}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery<JourneyData>({
    queryKey: ["/api/journey-by-material", material.materialNumber],
    queryFn: async () => {
      const response = await fetch(`/api/journey-by-material?material=${material.materialNumber}`);
      if (!response.ok) {
        throw new Error("Kon rit niet ophalen");
      }
      return response.json();
    },
    refetchInterval: 60000,
    retry: 1,
  });

  const ritnummer = data?.ritnummer;
  
  // Only fetch composition if we don't have the name saved yet
  const { data: compositionData } = useQuery({
    queryKey: ["/api/train-composition", ritnummer],
    queryFn: async () => {
      const response = await fetch(`/api/train-composition/${ritnummer}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!ritnummer && !material.name,
    staleTime: 60000,
  });
  
  // Track if we've already saved the name to prevent duplicate updates
  const hasSavedName = useRef(false);
  
  // Get materieel type from composition data
  const getMaterieelType = () => {
    if (material.name) return material.name;
    if (!compositionData?.materieeldelen) return null;
    
    const materieeldelen = compositionData.materieeldelen;
    const searchNum = String(material.materialNumber);
    
    // Try exact match first
    let deel = materieeldelen.find(
      (d: any) => String(d.materieelnummer) === searchNum
    );
    
    // Try partial match
    if (!deel) {
      deel = materieeldelen.find(
        (d: any) => String(d.materieelnummer).includes(searchNum) ||
                    searchNum.includes(String(d.materieelnummer))
      );
    }
    
    // Fallback to first
    if (!deel && materieeldelen.length > 0) {
      deel = materieeldelen[0];
    }
    
    return deel?.type || null;
  };
  
  const materieelType = getMaterieelType();
  
  // Save type to localStorage when we get it from the API
  useEffect(() => {
    if (materieelType && !material.name && !hasSavedName.current) {
      hasSavedName.current = true;
      onNameUpdate(materieelType);
    }
  }, [materieelType, material.name, onNameUpdate]);

  const formatTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const getTrainType = (categoryCode?: string, shortName?: string) => {
    if (categoryCode === "SPR") return "Sprinter";
    if (categoryCode === "IC") return "Intercity";
    if (categoryCode === "INT") return "International";
    return shortName || categoryCode || "Onbekend";
  };

  const getTrainTypeColor = (categoryCode?: string) => {
    if (categoryCode === "IC" || categoryCode === "INT") return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    if (categoryCode === "SPR") return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    return "bg-green-500/20 text-green-700 dark:text-green-400";
  };

  const trainInfo = data?.journeyData?.payload;
  const stops = trainInfo?.stops || [];
  const origin = stops.length > 0 ? stops[0]?.stop?.name : null;
  const destination = stops.length > 0 ? stops[stops.length - 1]?.stop?.name : null;
  
  // Get product info from stops (NS API returns it there for material lookups)
  const getProductFromStops = () => {
    for (const stop of stops) {
      const depProduct = stop.departures?.[0]?.product;
      if (depProduct?.categoryCode) return depProduct;
      const arrProduct = stop.arrivals?.[0]?.product;
      if (arrProduct?.categoryCode) return arrProduct;
    }
    return null;
  };
  
  const product = trainInfo?.product || getProductFromStops();
  const categoryCode = product?.categoryCode;
  const shortCategoryName = product?.shortCategoryName;
  const trainType = getTrainType(categoryCode, shortCategoryName);


  // Find the next stop based on time comparison and status fields
  const getNextStop = () => {
    const now = new Date();
    
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const stopStatus = stop.status?.toUpperCase();
      const isLastStop = i === stops.length - 1;
      const isFirstStop = i === 0;
      const dep = stop.departures?.[0];
      const arr = stop.arrivals?.[0];
      
      // Get effective times (actual if available, otherwise planned)
      const effectiveArrival = arr ? new Date(arr.actualTime || arr.plannedTime) : null;
      const effectiveDeparture = dep ? new Date(dep.actualTime || dep.plannedTime) : null;
      
      // Check status flags at stop level and event level
      const depStatus = dep?.status?.toUpperCase();
      const arrStatus = arr?.status?.toUpperCase();
      const isPassing = stopStatus === 'PASSING' || depStatus === 'PASSING' || arrStatus === 'PASSING';
      const isExplicitlyPassed = stopStatus === 'PASSED' || depStatus === 'PASSED';
      
      // Skip first stop (origin) - train has already departed
      if (isFirstStop && effectiveDeparture && effectiveDeparture <= now) {
        continue;
      }
      
      // Skip if explicitly marked as passed
      if (isExplicitlyPassed) {
        continue;
      }
      
      // For intermediate stops: check if departure time is in the past
      if (!isLastStop && effectiveDeparture) {
        if (effectiveDeparture <= now) {
          // This stop's departure is in the past - train has passed
          continue;
        }
        
        // Departure is in the future - this is a candidate stop
        if (isPassing) {
          return { stop, label: "Passeert", time: dep };
        }
        
        // No arrival time (origin station) or train has arrived - train is at station
        if (!effectiveArrival || (effectiveArrival <= now && effectiveDeparture > now)) {
          return { stop, label: "Op station", time: dep };
        }
        
        // Train hasn't arrived yet
        return { stop, label: "Volgende", time: arr || dep };
      }
      
      // For last stop: check arrival time
      if (isLastStop && effectiveArrival) {
        if (effectiveArrival <= now) {
          // Already arrived at destination
          continue;
        }
        return { stop, label: "Aankomst", time: arr };
      }
    }
    
    return null;
  };
  
  const nextStopInfo = getNextStop();
  const displayStop = nextStopInfo?.stop;

  const getNextDepartureTime = () => {
    if (!nextStopInfo?.time) return null;
    const timeData = nextStopInfo.time;
    return {
      time: formatTime(timeData.actualTime || timeData.plannedTime),
      delay: timeData.delayInSeconds ? Math.round(timeData.delayInSeconds / 60) : 0
    };
  };

  const nextDep = getNextDepartureTime();

  const hasJourneyData = data && trainInfo;

  return (
    <Card className="p-2 md:overflow-visible overflow-visible group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2 md:mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary flex-shrink-0">
                <Train className="w-4 h-4" />
              </div>
              {materieelType && (
                <span className="font-semibold text-sm">
                  {materieelType.replace(material.materialNumber, '').trim()}
                </span>
              )}
              <Badge variant="outline" className="text-xs font-mono">
                #{material.materialNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-opacity"
                data-testid={`button-refresh-material-${material.id}`}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-opacity"
                data-testid={`button-remove-material-${material.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {hasJourneyData && (
            <div className="md:hidden -mx-2 mb-0">
              <Separator />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Ritinfo laden...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span>Niet in dienst of niet gevonden</span>
            </div>
          ) : hasJourneyData ? (
            <div className="md:space-y-2 md:px-0 -mx-2 md:mx-0 -mb-2 md:mb-0">
              <div 
                className="md:p-2 py-2 px-2 md:rounded-md md:border hover-elevate cursor-pointer"
                onClick={() => onShowDetail(data)}
                data-testid={`material-journey-${material.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${getTrainTypeColor(categoryCode)}`}>
                        {trainType}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {data.ritnummer}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{origin}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{destination}</span>
                    </div>
                    {displayStop && nextStopInfo && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {nextStopInfo.label}: {displayStop.stop.name}
                        </span>
                        {nextDep && (
                          <span className="font-medium">
                            {nextDep.time}
                            {nextDep.delay > 0 && (
                              <span className="text-destructive ml-1">+{nextDep.delay}</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Geen actieve rit gevonden
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function MaterieelTrackerWidget({
  trackedMaterials,
  onMaterialAdd,
  onMaterialRemove,
  onMaterialNameUpdate,
}: MaterieelTrackerWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMaterialNumber, setNewMaterialNumber] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<JourneyData | null>(null);

  const canAddMore = trackedMaterials.length < 3;

  const handleAdd = () => {
    if (!newMaterialNumber.trim() || !canAddMore) return;
    onMaterialAdd(newMaterialNumber.trim());
    setNewMaterialNumber("");
    setIsAdding(false);
  };

  const getTrainType = (categoryCode?: string, shortName?: string) => {
    if (categoryCode === "SPR") return "Sprinter";
    if (categoryCode === "IC") return "Intercity";
    if (categoryCode === "INT") return "International";
    return shortName || categoryCode || "Onbekend";
  };

  const trainInfo = selectedMaterial?.journeyData?.payload;
  const stops = trainInfo?.stops || [];
  const origin = stops.length > 0 ? stops[0]?.stop?.name : null;
  const destination = stops.length > 0 ? stops[stops.length - 1]?.stop?.name : null;

  // Get product info from stops (NS API returns it there for material lookups)
  const getProductFromStops = () => {
    for (const stop of stops) {
      const depProduct = stop.departures?.[0]?.product;
      if (depProduct?.categoryCode) return depProduct;
      const arrProduct = stop.arrivals?.[0]?.product;
      if (arrProduct?.categoryCode) return arrProduct;
    }
    return null;
  };
  
  const product = trainInfo?.product || getProductFromStops();

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Train className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Materieel Tracker</h3>
          {trackedMaterials.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {trackedMaterials.length}
            </Badge>
          )}
        </div>

        {trackedMaterials.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Volg tot 3 treinstellen om hun actuele ritten te zien
            </p>
            {!isAdding ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="gap-2"
                data-testid="button-add-first-material"
              >
                <Plus className="w-4 h-4" />
                Materieel toevoegen
              </Button>
            ) : (
              <div className="space-y-2 max-w-xs mx-auto">
                <Input
                  type="text"
                  value={newMaterialNumber}
                  onChange={(e) => setNewMaterialNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Bijv. 8743"
                  data-testid="input-material-number"
                />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={handleAdd} data-testid="button-confirm-add-material">
                    Toevoegen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewMaterialNumber("");
                    }}
                    data-testid="button-cancel-add-material"
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {trackedMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onRemove={() => onMaterialRemove(material.id)}
                onShowDetail={setSelectedMaterial}
                onNameUpdate={(name) => onMaterialNameUpdate(material.materialNumber, name)}
                isLast={false}
              />
            ))}

            {canAddMore && !isAdding && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="w-full gap-2"
                data-testid="button-add-another-material"
              >
                <Plus className="w-4 h-4" />
                Materieel toevoegen ({trackedMaterials.length}/3)
              </Button>
            )}

            {isAdding && (
              <Card className="p-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={newMaterialNumber}
                    onChange={(e) => setNewMaterialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="Bijv. 8743"
                    data-testid="input-add-material-number"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd} data-testid="button-confirm-add-another-material">
                      Toevoegen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAdding(false);
                        setNewMaterialNumber("");
                      }}
                      data-testid="button-cancel-add-another-material"
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>

      {selectedMaterial && trainInfo && (
        <TripDetailPanel
          open={!!selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          trainType={getTrainType(product?.categoryCode, product?.shortCategoryName)}
          trainNumber={selectedMaterial.ritnummer}
          from={origin || "Onbekend"}
          to={destination || "Onbekend"}
        />
      )}
    </>
  );
}
