import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrainBadge from "@/components/TrainBadge";

export default function TrainDetail() {
  const mockTrain = {
    type: "Intercity",
    number: "1234",
    from: "Amsterdam Centraal",
    to: "Rotterdam Centraal",
    stops: [
      { name: "Amsterdam Centraal", arrival: null, departure: "10:23", platform: "5" },
      { name: "Amsterdam Sloterdijk", arrival: "10:28", departure: "10:29", platform: "3" },
      { name: "Schiphol Airport", arrival: "10:37", departure: "10:38", platform: "1" },
      { name: "Leiden Centraal", arrival: "10:52", departure: "10:53", platform: "4" },
      { name: "Den Haag Centraal", arrival: "11:05", departure: "11:07", platform: "8" },
      { name: "Delft", arrival: "11:15", departure: "11:16", platform: "2" },
      { name: "Rotterdam Centraal", arrival: "11:27", departure: null, platform: "7" }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => console.log("Go back")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>

        <div className="backdrop-blur-lg bg-card/80 rounded-xl p-6 border">
          <div className="flex items-start gap-4">
            <TrainBadge type={mockTrain.type} number={mockTrain.number} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">
                {mockTrain.from} → {mockTrain.to}
              </h1>
              <p className="text-muted-foreground">Treinrit details</p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Stops</h2>
          <div className="space-y-1">
            {mockTrain.stops.map((stop, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg hover-elevate"
                data-testid={`row-stop-${idx}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative">
                    {idx === 0 ? (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    ) : idx === mockTrain.stops.length - 1 ? (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                    )}
                    {idx < mockTrain.stops.length - 1 && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-[52px] bg-border" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{stop.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {stop.arrival && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Aankomst: {stop.arrival}
                        </div>
                      )}
                      {stop.departure && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Vertrek: {stop.departure}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary/10 text-primary px-3 py-1 rounded font-semibold text-sm">
                    Spoor {stop.platform}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
