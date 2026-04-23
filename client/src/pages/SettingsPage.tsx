import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  Star,
  ChevronUp,
  ChevronDown,
  Trash2,
  Check,
  MapPin,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";
import { useQuery } from "@tanstack/react-query";
import StationSearch from "@/components/StationSearch";

const FAVORITE_STATIONS_KEY = "travnl-favorite-stations";

interface Station {
  namen: { lang: string; middel: string; kort: string };
  code: string;
  UICCode: string;
  stationType: string;
  land: string;
}

function loadFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITE_STATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistFavorites(codes: string[]) {
  localStorage.setItem(FAVORITE_STATIONS_KEY, JSON.stringify(codes));
  window.dispatchEvent(new Event("travnl-favorites-changed"));
}

type ThemeMode = "light" | "dark" | "system";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Volg systeem", icon: Monitor },
  { value: "light", label: "Altijd licht", icon: Sun },
  { value: "dark", label: "Altijd donker", icon: Moon },
];

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [addValue, setAddValue] = useState("");
  const [addKey, setAddKey] = useState(0);

  const { data: stationsData } = useQuery<{ payload: Station[] }>({
    queryKey: ["/api/stations"],
  });

  const stations: Station[] = stationsData?.payload ?? [];

  const stationMap = new Map<string, string>();
  const stationByName = new Map<string, Station>();
  for (const s of stations) {
    stationMap.set(s.code.toUpperCase(), s.namen.lang);
    stationByName.set(s.namen.lang, s);
  }

  function getStationName(code: string): string {
    return stationMap.get(code.toUpperCase()) ?? code;
  }

  function update(newFavorites: string[]) {
    setFavorites(newFavorites);
    persistFavorites(newFavorites);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...favorites];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    update(next);
  }

  function moveDown(idx: number) {
    if (idx === favorites.length - 1) return;
    const next = [...favorites];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    update(next);
  }

  function remove(idx: number) {
    update(favorites.filter((_, i) => i !== idx));
  }

  function handleAddStation(value: string) {
    const matched = stationByName.get(value);
    if (matched && !favorites.includes(matched.code)) {
      update([...favorites, matched.code]);
      setAddKey((k) => k + 1);
      setAddValue("");
    } else {
      setAddValue(value);
    }
  }

  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/meer">
            <Button variant="ghost" size="icon" data-testid="button-back-meer">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">Instellingen</h1>
            <p className="text-muted-foreground">Pas de app aan naar jouw wensen</p>
          </div>
        </div>

        {/* Weergave */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Weergave
          </p>
          <Card className="overflow-hidden" data-testid="card-theme">
            {themeOptions.map((opt, idx) => {
              const Icon = opt.icon;
              const isSelected = mode === opt.value;
              return (
                <div key={opt.value}>
                  {idx > 0 && <div className="border-t mx-4" />}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer text-left"
                    onClick={() => setMode(opt.value)}
                    data-testid={`radio-theme-${opt.value}`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted/50"}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <Label className="cursor-pointer font-medium text-sm">
                        {opt.label}
                      </Label>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Favoriete stations */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Favoriete stations
          </p>
          <Card className="overflow-hidden" data-testid="card-favorite-stations">
            {favorites.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <div className="p-3 bg-muted/50 rounded-full">
                  <Star className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-no-favorites">
                  Nog geen favoriete stations opgeslagen.
                </p>
              </div>
            ) : (
              <div data-testid="list-favorite-stations">
                {favorites.map((code, idx) => (
                  <div key={code}>
                    {idx > 0 && <div className="border-t mx-4" />}
                    <div
                      className="flex items-center gap-3 px-4 py-3"
                      data-testid={`row-favorite-${code}`}
                    >
                      <div className="p-1.5 bg-muted/50 rounded-md shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span
                        className="flex-1 text-sm font-medium"
                        data-testid={`text-station-${code}`}
                      >
                        {getStationName(code)}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          data-testid={`button-move-up-${code}`}
                          aria-label="Omhoog"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveDown(idx)}
                          disabled={idx === favorites.length - 1}
                          data-testid={`button-move-down-${code}`}
                          aria-label="Omlaag"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(idx)}
                          data-testid={`button-remove-${code}`}
                          aria-label="Verwijder"
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t mx-4" />
            <div className="px-4 py-3" data-testid="section-add-favorite">
              <StationSearch
                key={addKey}
                label="Station toevoegen"
                value={addValue}
                onChange={handleAddStation}
                placeholder="Zoek een station..."
                testId="input-add-favorite-station"
                showClearButton={true}
              />
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
