import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation, ChevronRight, Settings, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const FAVORITE_STATIONS_KEY = "travnl-favorite-stations";
const WIDGET_STATIONS_KEY = "travnl-widget-stations";
const MAX_WIDGET_STATIONS = 5;

interface Station {
  namen: {
    lang: string;
    middel: string;
    kort: string;
  };
  code: string;
  UICCode: string;
  stationType: string;
  land: string;
}

interface FavoriteStationsWidgetProps {
  onSetDeparture: (stationName: string) => void;
  onSetDestination: (stationName: string) => void;
}

function getFavoriteStationCodes(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITE_STATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getWidgetStationCodes(): string[] {
  try {
    const stored = localStorage.getItem(WIDGET_STATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWidgetStationCodes(codes: string[]) {
  localStorage.setItem(WIDGET_STATIONS_KEY, JSON.stringify(codes.slice(0, MAX_WIDGET_STATIONS)));
}

function isValidTrainStation(stationType: string): boolean {
  const validTypes = [
    'MEGA_STATION',
    'KNOOPPUNT_INTERCITY_STATION',
    'INTERCITY_STATION',
    'KNOOPPUNT_SNELTREIN_STATION',
    'SNELTREIN_STATION',
    'KNOOPPUNT_STOPTREIN_STATION',
    'STOPTREIN_STATION',
    'FACULTATIEF_STATION',
  ];
  return validTypes.includes(stationType);
}

export default function FavoriteStationsWidget({
  onSetDeparture,
  onSetDestination,
}: FavoriteStationsWidgetProps) {
  const [favoriteStationCodes, setFavoriteStationCodes] = useState<string[]>(() => getFavoriteStationCodes());
  const [widgetStationCodes, setWidgetStationCodes] = useState<string[]>(() => getWidgetStationCodes());
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleStorageChange = () => {
      setFavoriteStationCodes(getFavoriteStationCodes());
      setWidgetStationCodes(getWidgetStationCodes());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const currentFavorites = getFavoriteStationCodes();
      const currentWidget = getWidgetStationCodes();
      if (JSON.stringify(currentFavorites) !== JSON.stringify(favoriteStationCodes)) {
        setFavoriteStationCodes(currentFavorites);
      }
      if (JSON.stringify(currentWidget) !== JSON.stringify(widgetStationCodes)) {
        setWidgetStationCodes(currentWidget);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [favoriteStationCodes, widgetStationCodes]);

  const { data: stationsData } = useQuery<any>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      return response.json();
    },
  });

  const allStations: Station[] = stationsData?.payload || [];
  
  const allFavoriteStations = favoriteStationCodes
    .map(code => allStations.find(s => s.code === code))
    .filter((s): s is Station => s !== undefined);

  const displayedStations = widgetStationCodes.length > 0
    ? widgetStationCodes
        .map(code => allStations.find(s => s.code === code))
        .filter((s): s is Station => s !== undefined && favoriteStationCodes.includes(s.code))
        .slice(0, MAX_WIDGET_STATIONS)
    : allFavoriteStations.slice(0, MAX_WIDGET_STATIONS);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setIsOpen(true);
  };

  const handleOpenDepartures = () => {
    if (selectedStation && isValidTrainStation(selectedStation.stationType)) {
      setLocation(`/vertrektijden?station=${encodeURIComponent(selectedStation.namen.lang)}`);
    }
    setIsOpen(false);
  };

  const handleSetDeparture = () => {
    if (selectedStation) {
      onSetDeparture(selectedStation.namen.lang);
    }
    setIsOpen(false);
  };

  const handleSetDestination = () => {
    if (selectedStation) {
      onSetDestination(selectedStation.namen.lang);
    }
    setIsOpen(false);
  };

  const toggleWidgetStation = (stationCode: string) => {
    const newCodes = widgetStationCodes.includes(stationCode)
      ? widgetStationCodes.filter(c => c !== stationCode)
      : widgetStationCodes.length < MAX_WIDGET_STATIONS
        ? [...widgetStationCodes, stationCode]
        : widgetStationCodes;
    
    setWidgetStationCodes(newCodes);
    saveWidgetStationCodes(newCodes);
  };

  const isStationValid = selectedStation ? isValidTrainStation(selectedStation.stationType) : false;

  const actionButtons = (
    <div className="space-y-2 p-4" data-vaul-no-drag>
      {isStationValid ? (
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12"
          onClick={handleOpenDepartures}
          data-testid="button-open-departures"
        >
          <Clock className="w-5 h-5 text-primary" />
          <span>Openen in Vertrektijden</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12 opacity-50 cursor-not-allowed"
          disabled
          data-testid="button-open-departures-disabled"
        >
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-muted-foreground">Geen treinstation</span>
        </Button>
      )}
      <Button
        variant="outline"
        className="w-full justify-start gap-3 h-12"
        onClick={handleSetDeparture}
        data-testid="button-set-departure"
      >
        <Navigation className="w-5 h-5 text-green-500" />
        <span>Vertrek van</span>
      </Button>
      <Button
        variant="outline"
        className="w-full justify-start gap-3 h-12"
        onClick={handleSetDestination}
        data-testid="button-set-destination"
      >
        <MapPin className="w-5 h-5 text-red-500" />
        <span>Bestemming</span>
      </Button>
    </div>
  );

  const settingsContent = (
    <div className="p-4 space-y-4" data-vaul-no-drag>
      <p className="text-sm text-muted-foreground">
        Selecteer max {MAX_WIDGET_STATIONS} stations om in de widget te tonen ({widgetStationCodes.length}/{MAX_WIDGET_STATIONS} geselecteerd)
      </p>
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {allFavoriteStations.map((station) => {
            const isSelected = widgetStationCodes.includes(station.code);
            const canSelect = isSelected || widgetStationCodes.length < MAX_WIDGET_STATIONS;
            
            return (
              <button
                key={station.code}
                onClick={() => canSelect && toggleWidgetStation(station.code)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  canSelect ? 'hover-elevate active-elevate-2' : 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!canSelect}
                data-testid={`settings-station-${station.code}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{station.namen.lang}</p>
                  <p className="text-xs text-muted-foreground">{station.code}</p>
                </div>
                {!isValidTrainStation(station.stationType) && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Geen station
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  if (allFavoriteStations.length === 0) {
    return (
      <Card data-testid="widget-favorite-stations">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Favoriete Plekken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Geen favoriete stations. Voeg stations toe via het zoeken naar een station.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="widget-favorite-stations">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Favoriete Plekken
            <div className="ml-auto flex items-center gap-2">
              {allFavoriteStations.length > MAX_WIDGET_STATIONS && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsOpen(true);
                  }}
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Badge variant="secondary" className="ml-auto">
                {displayedStations.length}/{allFavoriteStations.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {displayedStations.map((station) => (
            <button
              key={station.code}
              onClick={() => handleStationClick(station)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover-elevate active-elevate-2 text-left"
              data-testid={`favorite-station-${station.code}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{station.namen.lang}</p>
                  <p className="text-xs text-muted-foreground">{station.code}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {isMobile ? (
        <>
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {selectedStation?.namen.lang}
                </DrawerTitle>
              </DrawerHeader>
              {actionButtons}
            </DrawerContent>
          </Drawer>
          <Drawer open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Widget Instellingen
                </DrawerTitle>
              </DrawerHeader>
              {settingsContent}
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {selectedStation?.namen.lang}
                </DialogTitle>
              </DialogHeader>
              {actionButtons}
            </DialogContent>
          </Dialog>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Widget Instellingen
                </DialogTitle>
              </DialogHeader>
              {settingsContent}
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
