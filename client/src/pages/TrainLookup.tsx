import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Hash, Train } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import TripDetailPanel from "@/components/TripDetailPanel";
import PageContainer from "@/components/PageContainer";

export default function TrainLookup() {
  const [searchMode, setSearchMode] = useState<"journey" | "material">("journey");
  const [journeyNumber, setJourneyNumber] = useState("");
  const [searchedNumber, setSearchedNumber] = useState("");
  const [searchedMode, setSearchedMode] = useState<"journey" | "material">("journey");
  const { toast } = useToast();

  const { data: materialJourneyData, isLoading: isMaterialLoading, error: materialError } = useQuery({
    queryKey: ["/api/journey-by-material", searchedNumber],
    enabled: !!searchedNumber && searchedMode === "material",
    queryFn: async () => {
      const response = await fetch(`/api/journey-by-material?material=${searchedNumber}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Kon geen ritnr vinden voor dit treinnr");
      }
      return response.json();
    },
    retry: 1,
  });

  const { data: journeyData, isLoading: isJourneyLoading, error: journeyError } = useQuery({
    queryKey: ["/api/journey", searchedNumber],
    enabled: !!searchedNumber && searchedMode === "journey",
    queryFn: async () => {
      const response = await fetch(`/api/journey?train=${searchedNumber}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Fout bij ophalen ritinfo");
      }
      return response.json();
    },
    retry: 1,
  });

  const isLoading = searchedMode === "material" ? isMaterialLoading : isJourneyLoading;
  const error = materialError || journeyError;
  
  const actualJourneyData = searchedMode === "material" ? materialJourneyData?.journeyData : journeyData;
  const actualJourneyNumber = searchedMode === "material" ? materialJourneyData?.ritnummer : searchedNumber;

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
        title: searchMode === "journey" ? "Ritnummer vereist" : "Materieelnummer vereist",
        description: searchMode === "journey" 
          ? "Voer een ritnummer in om de treininfo op te zoeken"
          : "Voer een materieelnummer in om de treininfo op te zoeken",
        variant: "destructive",
      });
      return;
    }
    setSearchedNumber(journeyNumber);
    setSearchedMode(searchMode);
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  };

  const trainInfo = actualJourneyData?.payload;
  const stops = trainInfo?.stops || [];
  
  const origin = stops.length > 0 ? stops[0]?.stop?.name : null;
  const destination = stops.length > 0 ? stops[stops.length - 1]?.stop?.name : null;

  const getTrainType = () => {
    const categoryCode = trainInfo?.product?.categoryCode;
    const shortName = trainInfo?.product?.shortCategoryName;
    
    if (categoryCode === "SPR") return "Sprinter";
    if (categoryCode === "IC") return "Intercity";
    if (categoryCode === "INT") return "International";
    
    return shortName || categoryCode || "Trein";
  };

  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 pt-0 pb-3 md:py-6 space-y-6">

        <div className="backdrop-blur-sm bg-card/80 rounded-t-none md:rounded-xl rounded-b-xl p-6 space-y-4 border">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Zoek op</Label>
            <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as "journey" | "material")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="journey" data-testid="toggle-journey">
                  <Hash className="w-4 h-4 mr-2" />
                  Ritnummer
                </TabsTrigger>
                <TabsTrigger value="material" data-testid="toggle-material">
                  <Train className="w-4 h-4 mr-2" />
                  Materieelnummer
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="journey-number" className="text-sm font-medium">
              {searchMode === "journey" ? "Ritnummer" : "Materieelnummer"}
            </Label>
            <div className="relative">
              {searchMode === "journey" ? (
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              ) : (
                <Train className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              )}
              <Input
                id="journey-number"
                data-testid={searchMode === "journey" ? "input-journey-number" : "input-material-number"}
                type="text"
                value={journeyNumber}
                onChange={(e) => setJourneyNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={searchMode === "journey" ? "Bijv. 12345" : "Bijv. 2345"}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {searchMode === "journey" 
                ? "Voer een ritnummer in voor ritinformatie"
                : "Voer een materieelnummer in (bijv. 8743, 9438)"}
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

        {!isLoading && searchedNumber && !actualJourneyData && (
          <div className="backdrop-blur-sm bg-card/80 rounded-xl p-8 border text-center text-muted-foreground">
            <p>Geen treininfo gevonden voor {searchedMode === "journey" ? "ritnummer" : "materieelnummer"} {searchedNumber}</p>
            {searchedMode === "material" && (
              <p className="mt-2 text-sm">Controleer of het materieelnummer correct is</p>
            )}
          </div>
        )}

        {!isLoading && !searchedNumber && (
          <div className="backdrop-blur-sm bg-muted/50 rounded-xl p-6 border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              Voer een {searchMode === "journey" ? "ritnummer" : "materieelnummer"} in om de volledige route en actuele informatie te bekijken
            </p>
          </div>
        )}

        {searchedMode === "material" && materialJourneyData?.ritnummer && (
          <div className="backdrop-blur-sm bg-card/80 rounded-xl p-4 border">
            <p className="text-sm text-muted-foreground">
              Materieelnummer <span className="font-semibold text-foreground">{searchedNumber}</span> rijdt als ritnummer <span className="font-semibold text-foreground">{materialJourneyData.ritnummer}</span>
            </p>
          </div>
        )}

        {trainInfo && (
          <TripDetailPanel
            open={!!searchedNumber && !!trainInfo}
            onClose={() => setSearchedNumber("")}
            trainType={getTrainType()}
            trainNumber={actualJourneyNumber}
            from={origin || "Onbekend"}
            to={destination || "Onbekend"}
          />
        )}
      </div>
    </PageContainer>
  );
}
