import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowDownUp, Search, Calendar as CalendarIcon, Clock } from "lucide-react";
import StationSearch from "@/components/StationSearch";
import TripCard from "@/components/TripCard";
import TrainDialog from "@/components/TrainDialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SelectedTrain {
  trainType: string;
  trainNumber: string;
  from: string;
  to: string;
}

export default function JourneyPlanner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const swapStations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
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

  const mockTrips = [
    {
      departureTime: "10:23",
      arrivalTime: "11:27",
      duration: "1u 04m",
      transfers: 0,
      legs: [
        {
          trainType: "Intercity",
          trainNumber: "1234",
          from: "Amsterdam Centraal",
          to: "Rotterdam Centraal",
          departure: "10:23",
          arrival: "11:27",
          platform: "5"
        }
      ]
    },
    {
      departureTime: "10:38",
      arrivalTime: "11:52",
      duration: "1u 14m",
      transfers: 1,
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
    },
    {
      departureTime: "10:52",
      arrivalTime: "12:27",
      duration: "1u 35m",
      transfers: 2,
      legs: [
        {
          trainType: "Sprinter",
          trainNumber: "4455",
          from: "Amsterdam Centraal",
          to: "Leiden Centraal",
          departure: "10:52",
          arrival: "11:24",
          platform: "4"
        },
        {
          trainType: "Intercity",
          trainNumber: "5566",
          from: "Leiden Centraal",
          to: "Den Haag Centraal",
          departure: "11:37",
          arrival: "11:50",
          platform: "8"
        },
        {
          trainType: "Sprinter",
          trainNumber: "6677",
          from: "Den Haag Centraal",
          to: "Rotterdam Centraal",
          departure: "12:05",
          arrival: "12:27",
          platform: "3"
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

        <div className="backdrop-blur-sm bg-card/80 rounded-xl p-6 space-y-4 border">
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
              className="mb-0 self-end"
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

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: nl })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-sm font-medium">Tijd</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9"
                  data-testid="input-time"
                />
              </div>
            </div>
          </div>

          <Button className="w-full" size="lg" data-testid="button-search-trips">
            <Search className="w-4 h-4 mr-2" />
            Zoek reis
          </Button>
        </div>

        {from && to && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Reismogelijkheden</h2>
            {mockTrips.map((trip, idx) => (
              <TripCard
                key={idx}
                {...trip}
                onTrainClick={(leg) => setSelectedTrain(leg)}
              />
            ))}
          </div>
        )}

        {selectedTrain && (
          <TrainDialog
            open={!!selectedTrain}
            onOpenChange={(open) => !open && setSelectedTrain(null)}
            trainType={selectedTrain.trainType}
            trainNumber={selectedTrain.trainNumber}
            from={selectedTrain.from}
            to={selectedTrain.to}
            stops={mockTrainStops}
          />
        )}
      </div>
    </div>
  );
}
