import TrainBadge from "../TrainBadge";

export default function TrainBadgeExample() {
  return (
    <div className="flex flex-wrap gap-4 p-8">
      <TrainBadge type="Intercity" number="1234" />
      <TrainBadge type="Sprinter" number="5678" />
      <TrainBadge type="other" number="9012" />
    </div>
  );
}
