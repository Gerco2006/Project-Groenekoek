import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Train } from "lucide-react";
import TrainDialog from "@/components/TrainDialog";

export default function TrainLookup() {
  const [trainNumber, setTrainNumber] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const handleSearch = () => {
    if (trainNumber.trim()) {
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
          <h1 className="text-3xl font-bold mb-2">Treininfo opzoeken</h1>
          <p className="text-muted-foreground">Zoek op treinnummer of ritnummer</p>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
          <div className="space-y-2">
            <Label htmlFor="train-number" className="text-sm font-medium">
              Treinnummer of Ritnummer
            </Label>
            <div className="relative">
              <Train className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="train-number"
                data-testid="input-train-number"
                type="text"
                value={trainNumber}
                onChange={(e) => setTrainNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Bijv. IC 1234 of 1234"
                className="pl-9"
              />
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSearch}
            disabled={!trainNumber.trim()}
            data-testid="button-search-train"
          >
            <Search className="w-4 h-4 mr-2" />
            Zoek trein
          </Button>
        </div>

        <div className="backdrop-blur-sm bg-muted/50 rounded-xl p-6 border border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            Voer een treinnummer in om de volledige route en actuele informatie te bekijken
          </p>
        </div>

        {showDialog && (
          <TrainDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            trainType="Intercity"
            trainNumber={trainNumber}
            from="Amsterdam Centraal"
            to="Rotterdam Centraal"
            stops={mockTrainStops}
          />
        )}
      </div>
    </div>
  );
}
