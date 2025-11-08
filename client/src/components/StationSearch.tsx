import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useState } from "react";

interface StationSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}

export default function StationSearch({ 
  label, 
  value, 
  onChange, 
  placeholder = "Zoek station...",
  testId = "input-station"
}: StationSearchProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={testId} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id={testId}
          data-testid={testId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className="pl-9 backdrop-blur-md bg-card/50"
        />
      </div>
    </div>
  );
}
