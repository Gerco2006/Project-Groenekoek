import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, ChevronRight } from "lucide-react";
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

const FAVORITE_STATIONS_KEY = "travnl-favorite-stations";

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

export default function FavoriteStationsWidget({
  onSetDeparture,
  onSetDestination,
}: FavoriteStationsWidgetProps) {
  const [favoriteStationCodes, setFavoriteStationCodes] = useState<string[]>(() => getFavoriteStationCodes());
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleStorageChange = () => {
      setFavoriteStationCodes(getFavoriteStationCodes());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const current = getFavoriteStationCodes();
      if (JSON.stringify(current) !== JSON.stringify(favoriteStationCodes)) {
        setFavoriteStationCodes(current);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [favoriteStationCodes]);

  const { data: stationsData } = useQuery<any>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      return response.json();
    },
  });

  const allStations: Station[] = stationsData?.payload || [];
  
  const favoriteStations = favoriteStationCodes
    .map(code => allStations.find(s => s.code === code))
    .filter((s): s is Station => s !== undefined)
    .slice(0, 10);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setIsOpen(true);
  };

  const handleOpenDepartures = () => {
    if (selectedStation) {
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

  const actionButtons = (
    <div className="space-y-2 p-4">
      <Button
        variant="outline"
        className="w-full justify-start gap-3 h-12"
        onClick={handleOpenDepartures}
        data-testid="button-open-departures"
      >
        <Clock className="w-5 h-5 text-primary" />
        <span>Openen in Vertrektijden</span>
      </Button>
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
        <span>Bestemming instellen</span>
      </Button>
    </div>
  );

  if (favoriteStations.length === 0) {
    return (
      <Card data-testid="widget-favorite-stations">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Favoriete Stations
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
            Favoriete Stations
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              {favoriteStations.length} station{favoriteStations.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {favoriteStations.map((station) => (
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
      ) : (
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
      )}
    </>
  );
}
