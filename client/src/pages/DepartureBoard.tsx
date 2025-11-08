import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import StationSearch from "@/components/StationSearch";
import DepartureRow from "@/components/DepartureRow";
import TrainDialog from "@/components/TrainDialog";

interface SelectedTrain {
  trainType: string;
  trainNumber: string;
  destination: string;
}

export default function DepartureBoard() {
  const [station, setStation] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);

  const mockDepartures = [
    {
      time: "10:23",
      destination: "Rotterdam Centraal",
      platform: "5",
      trainType: "Intercity",
      trainNumber: "1234"
    },
    {
      time: "10:27",
      destination: "Utrecht Centraal",
      platform: "8b",
      trainType: "Sprinter",
      trainNumber: "5678",
      delay: 3
    },
    {
      time: "10:35",
      destination: "Den Haag Centraal",
      platform: "12",
      trainType: "Intercity",
      trainNumber: "2345"
    },
    {
      time: "10:42",
      destination: "Eindhoven Centraal",
      platform: "7",
      trainType: "Intercity",
      trainNumber: "3456"
    },
    {
      time: "10:45",
      destination: "Schiphol Airport",
      platform: "3",
      trainType: "Sprinter",
      trainNumber: "4567"
    }
  ];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vertrektijden</h1>
            <p className="text-muted-foreground">Bekijk actuele vertrektijden</p>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => console.log("Refresh departures")}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 border">
          <StationSearch
            label="Station"
            value={station}
            onChange={setStation}
            placeholder="Bijv. Amsterdam Centraal"
            testId="input-station"
          />
        </div>

        {station && (
          <Card className="divide-y">
            {mockDepartures.map((departure, idx) => (
              <DepartureRow
                key={idx}
                {...departure}
                onClick={() => setSelectedTrain({
                  trainType: departure.trainType,
                  trainNumber: departure.trainNumber,
                  destination: departure.destination
                })}
              />
            ))}
          </Card>
        )}

        {selectedTrain && (
          <TrainDialog
            open={!!selectedTrain}
            onOpenChange={(open) => !open && setSelectedTrain(null)}
            trainType={selectedTrain.trainType}
            trainNumber={selectedTrain.trainNumber}
            from={station || "Amsterdam Centraal"}
            to={selectedTrain.destination}
            stops={mockTrainStops}
          />
        )}
      </div>
    </div>
  );
}
