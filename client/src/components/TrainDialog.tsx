import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock } from "lucide-react";
import TrainBadge from "./TrainBadge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrainStop {
  name: string;
  arrival: string | null;
  departure: string | null;
  platform?: string;
}

interface TrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
  stops: TrainStop[];
}

export default function TrainDialog({
  open,
  onOpenChange,
  trainType,
  trainNumber,
  from,
  to,
  stops,
}: TrainDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]" data-testid="dialog-train-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TrainBadge type={trainType} number={trainNumber} />
            <span className="text-xl">
              {from} → {to}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-1">
            {stops.map((stop, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg hover-elevate"
                data-testid={`row-stop-${idx}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative">
                    {idx === 0 ? (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    ) : idx === stops.length - 1 ? (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                    )}
                    {idx < stops.length - 1 && (
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

                  {stop.platform && (
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded font-semibold text-sm">
                      Spoor {stop.platform}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
