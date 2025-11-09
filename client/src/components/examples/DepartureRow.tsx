import DepartureRow from "../DepartureRow";

export default function DepartureRowExample() {
  return (
    <div className="max-w-2xl space-y-2 p-8">
      <DepartureRow
        time="10:23"
        destination="Rotterdam Centraal"
        platform="5"
        trainType="Intercity"
        trainNumber="1234"
        onClick={() => console.log("Departure clicked")}
      />
      <DepartureRow
        time="10:27"
        destination="Utrecht Centraal"
        platform="8b"
        trainType="Sprinter"
        trainNumber="5678"
        delay={3}
        onClick={() => console.log("Departure clicked")}
      />
      <DepartureRow
        time="10:35"
        destination="Den Haag Centraal"
        platform="12"
        trainType="other"
        trainNumber="9012"
        onClick={() => console.log("Departure clicked")}
      />
    </div>
  );
}
