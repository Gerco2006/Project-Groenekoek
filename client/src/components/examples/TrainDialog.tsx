import { useState } from "react";
import { Button } from "@/components/ui/button";
import TrainDialog from "../TrainDialog";

export default function TrainDialogExample() {
  const [open, setOpen] = useState(false);

  const mockStops = [
    { name: "Amsterdam Centraal", arrival: null, departure: "10:23", platform: "5" },
    { name: "Amsterdam Sloterdijk", arrival: "10:28", departure: "10:29", platform: "3" },
    { name: "Schiphol Airport", arrival: "10:37", departure: "10:38", platform: "1" },
    { name: "Rotterdam Centraal", arrival: "11:27", departure: null, platform: "7" }
  ];

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Trein Dialog</Button>
      <TrainDialog
        open={open}
        onOpenChange={setOpen}
        trainType="Intercity"
        trainNumber="1234"
        from="Amsterdam Centraal"
        to="Rotterdam Centraal"
        stops={mockStops}
      />
    </div>
  );
}
