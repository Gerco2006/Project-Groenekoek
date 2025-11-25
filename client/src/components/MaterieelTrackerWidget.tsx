import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Train, X, Plus, Loader2, ChevronRight, RefreshCw, AlertCircle, MapPin, Clock } from "lucide-react";
import type { TrackedMaterial } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import TripDetailPanel from "./TripDetailPanel";

interface MaterieelTrackerWidgetProps {
  trackedMaterials: TrackedMaterial[];
  onMaterialAdd: (materialNumber: string, name?: string) => void;
  onMaterialRemove: (id: string) => void;
  onMaterialNameUpdate: (materialNumber: string, name: string) => void;
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
        }>;
        departures?: Array<{
          plannedTime: string;
          actualTime?: string;
          delayInSeconds?: number;
          cancelled?: boolean;
        }>;
        status?: string;
      }>;
      product?: {
        categoryCode: string;
        shortCategoryName?: string;
        longCategoryName?: string;
      };
    };
  };
}

function MaterialCard({ 
  material, 
  onRemove,
  onShowDetail,
  onNameUpdate
}: { 
  material: TrackedMaterial; 
  onRemove: () => void;
  onShowDetail: (data: JourneyData) => void;
  onNameUpdate: (name: string) => void;
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
  
  const { data: compositionData } = useQuery({
    queryKey: ["/api/train-composition", ritnummer],
    queryFn: async () => {
      const response = await fetch(`/api/train-composition/${ritnummer}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!ritnummer,
    staleTime: 60000,
  });
  
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

  const formatTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const getTrainType = (categoryCode?: string, shortName?: string) => {
    if (categoryCode === "SPR") return "Sprinter";
    if (categoryCode === "IC") return "Intercity";
    if (categoryCode === "INT") return "International";
    return shortName || categoryCode || "Trein";
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
  const categoryCode = trainInfo?.product?.categoryCode;
  const shortCategoryName = trainInfo?.product?.shortCategoryName;
  const trainType = getTrainType(categoryCode, shortCategoryName);


  const currentStop = stops.find(s => s.status === "PASSING" || s.status === "STOP");
  const nextStop = stops.find(s => !s.arrivals?.[0]?.actualTime && s.departures?.[0]?.plannedTime);
  const displayStop = currentStop || nextStop;

  const getNextDepartureTime = () => {
    if (!displayStop?.departures?.[0]) return null;
    const dep = displayStop.departures[0];
    return {
      time: formatTime(dep.actualTime || dep.plannedTime),
      delay: dep.delayInSeconds ? Math.round(dep.delayInSeconds / 60) : 0
    };
  };

  const nextDep = getNextDepartureTime();

  return (
    <Card className="p-4 group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
          <Train className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {materieelType && (
                  <span className="font-semibold text-sm">
                    {materieelType.replace(material.materialNumber, '').trim()}
                  </span>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                  #{material.materialNumber}
                </Badge>
              </div>
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

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Ritinfo laden...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <AlertCircle className="w-3 h-3" />
              <span>Niet in dienst of niet gevonden</span>
            </div>
          ) : data && trainInfo ? (
            <div 
              className="mt-3 p-3 rounded-lg border hover-elevate cursor-pointer"
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
                  {displayStop && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {displayStop.status === "PASSING" ? "Passeert" : "Volgende"}: {displayStop.stop.name}
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
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </div>
          ) : null}
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

  const handleAdd = () => {
    if (!newMaterialNumber.trim()) return;
    onMaterialAdd(newMaterialNumber.trim());
    setNewMaterialNumber("");
    setIsAdding(false);
  };

  const getTrainType = (categoryCode?: string, shortName?: string) => {
    if (categoryCode === "SPR") return "Sprinter";
    if (categoryCode === "IC") return "Intercity";
    if (categoryCode === "INT") return "International";
    return shortName || categoryCode || "Trein";
  };

  const trainInfo = selectedMaterial?.journeyData?.payload;
  const stops = trainInfo?.stops || [];
  const origin = stops.length > 0 ? stops[0]?.stop?.name : null;
  const destination = stops.length > 0 ? stops[stops.length - 1]?.stop?.name : null;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
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
              Volg specifieke treinstellen om hun actuele ritten te zien
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
          <div className="space-y-3">
            {trackedMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onRemove={() => onMaterialRemove(material.id)}
                onShowDetail={setSelectedMaterial}
                onNameUpdate={(name) => onMaterialNameUpdate(material.materialNumber, name)}
              />
            ))}

            {!isAdding ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="w-full gap-2"
                data-testid="button-add-another-material"
              >
                <Plus className="w-4 h-4" />
                Materieel toevoegen
              </Button>
            ) : (
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
          trainType={getTrainType(trainInfo.product?.categoryCode, trainInfo.product?.shortCategoryName)}
          trainNumber={selectedMaterial.ritnummer}
          from={origin || "Onbekend"}
          to={destination || "Onbekend"}
        />
      )}
    </>
  );
}
