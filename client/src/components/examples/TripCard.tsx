import TripCard from "../TripCard";

export default function TripCardExample() {
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

  return (
    <div className="max-w-2xl p-8">
      <TripCard 
        {...mockTrip} 
        onTrainClick={(leg) => console.log("Train clicked:", leg)}
      />
    </div>
  );
}
