import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Hash } from "lucide-react";
import TrainDialog from "@/components/TrainDialog";

export default function TrainLookup() {
  const [journeyNumber, setJourneyNumber] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const handleSearch = () => {
    if (journeyNumber.trim()) {
      setShowDialog(true);
    }
  };

  const mockTrainStops = [
    { name: "Amsterdam Centraal", arrival: null, departure: "10:23", platform: "5" },
    { name: "Amsterdam Sloterdijk", arrival: "10:28", departure: "10:29", platform: "3" },
    { name: "Schiphol Airport", arrival: "10:37", departure: "10:38", platform: "1" },
    { name: "Leiden Centraal", arrival: "10:52", departure: "10:53", platform: "4" },
    { name: "Den Haag Centraal", arrival: "11:05", departure: "11:07", platform: "8" },
    { name: "Delft", arrival: "11:15", departure: "11:16", platform: "2" },
    { name: "Rotterdam Centraal", arrival: "11:27", departure: null, platform: "7" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ritnummer zoeker</h1>
          <p className="text-muted-foreground">Zoek op ritnummer</p>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
          <div className="space-y-2">
            <Label htmlFor="journey-number" className="text-sm font-medium">
              Ritnummer
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="journey-number"
                data-testid="input-journey-number"
                type="text"
                value={journeyNumber}
                onChange={(e) => setJourneyNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Bijv. 12345"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Voer een ritnummer in voor specifieke ritinformatie
            </p>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSearch}
            disabled={!journeyNumber.trim()}
            data-testid="button-search-journey"
          >
            <Search className="w-4 h-4 mr-2" />
            Zoek rit
          </Button>
        </div>

        <div className="backdrop-blur-sm bg-muted/50 rounded-xl p-6 border border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            Voer een ritnummer in om de volledige route en actuele informatie te bekijken
          </p>
        </div>

        {showDialog && (
          <TrainDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            trainType="Intercity"
            trainNumber={journeyNumber}
            from="Amsterdam Centraal"
            to="Rotterdam Centraal"
            stops={mockTrainStops}
          />
        )}
      </div>
    </div>
  );
}
