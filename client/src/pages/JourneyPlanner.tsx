import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Search } from "lucide-react";
import StationSearch from "@/components/StationSearch";
import TripCard from "@/components/TripCard";

export default function JourneyPlanner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const swapStations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const mockTrips = [
    {
      departureTime: "10:23",
      arrivalTime: "11:47",
      duration: "1u 24m",
      transfers: 1,
      legs: [
        {
          trainType: "Intercity",
          trainNumber: "1234",
          from: "Amsterdam Centraal",
          to: "Utrecht Centraal",
          departure: "10:23",
          arrival: "10:52",
          platform: "5"
        },
        {
          trainType: "Sprinter",
          trainNumber: "5678",
          from: "Utrecht Centraal",
          to: "Rotterdam Centraal",
          departure: "11:05",
          arrival: "11:47",
          platform: "8b"
        }
      ]
    },
    {
      departureTime: "10:38",
      arrivalTime: "11:52",
      duration: "1u 14m",
      transfers: 0,
      legs: [
        {
          trainType: "Intercity",
          trainNumber: "2345",
          from: "Amsterdam Centraal",
          to: "Rotterdam Centraal",
          departure: "10:38",
          arrival: "11:52",
          platform: "7"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reisplanner</h1>
          <p className="text-muted-foreground">Plan je reis met de trein</p>
        </div>

        <div className="backdrop-blur-lg bg-card/80 rounded-xl p-6 space-y-4 border">
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <StationSearch
              label="Van"
              value={from}
              onChange={setFrom}
              placeholder="Bijv. Amsterdam Centraal"
              testId="input-from-station"
            />

            <Button
              variant="outline"
              size="icon"
              onClick={swapStations}
              className="mb-0.5"
              data-testid="button-swap-stations"
            >
              <ArrowDownUp className="w-4 h-4" />
            </Button>

            <StationSearch
              label="Naar"
              value={to}
              onChange={setTo}
              placeholder="Bijv. Rotterdam Centraal"
              testId="input-to-station"
            />
          </div>

          <Button className="w-full" size="lg" data-testid="button-search-trips">
            <Search className="w-4 h-4 mr-2" />
            Zoek reis
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Reismogelijkheden</h2>
          {mockTrips.map((trip, idx) => (
            <TripCard
              key={idx}
              {...trip}
              onTrainClick={(leg) => console.log("Navigate to train:", leg)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
