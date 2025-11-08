import { useState } from "react";
import TripCard from "../TripCard";
import TrainDialog from "../TrainDialog";

export default function TripCardExample() {
  const [selectedTrain, setSelectedTrain] = useState<any>(null);

  const mockTrip = {
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
  };

  const mockStops = [
    { name: "Amsterdam Centraal", arrival: null, departure: "10:23", platform: "5" },
    { name: "Utrecht Centraal", arrival: "10:52", departure: null, platform: "8b" }
  ];

  return (
    <div className="max-w-2xl p-8">
      <TripCard 
        {...mockTrip} 
        onTrainClick={(leg) => setSelectedTrain(leg)}
      />
      {selectedTrain && (
        <TrainDialog
          open={!!selectedTrain}
          onOpenChange={(open) => !open && setSelectedTrain(null)}
          trainType={selectedTrain.trainType}
          trainNumber={selectedTrain.trainNumber}
          from={selectedTrain.from}
          to={selectedTrain.to}
          stops={mockStops}
        />
      )}
    </div>
  );
}
