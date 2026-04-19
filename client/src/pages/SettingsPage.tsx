import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Moon, Sun, Monitor, ChevronLeft, Star, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";
import { useQuery } from "@tanstack/react-query";

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
  window.dispatchEvent(new Event('travnl-favorites-changed'));
}

export default function SettingsPage() {
  const { mode, theme, setMode } = useTheme();
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  const { data: stationsData } = useQuery<{ payload: Station[] }>({
    queryKey: ["/api/stations"],
  });

  const stationMap = new Map<string, string>();
  if (stationsData?.payload) {
    for (const s of stationsData.payload) {
      stationMap.set(s.code.toUpperCase(), s.namen.lang);
    }
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

  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/meer">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">Instellingen</h1>
            <p className="text-muted-foreground">
              Pas de app aan naar jouw wensen
            </p>
          </div>
        </div>

        <Card data-testid="card-theme">
          <CardHeader>
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <div>
                <CardTitle>Weergave</CardTitle>
                <CardDescription>Pas de kleurenmodus aan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as "light" | "dark" | "system")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="system" id="theme-system" data-testid="radio-theme-system" />
                <Label htmlFor="theme-system" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  Volg systeem
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="light" id="theme-light" data-testid="radio-theme-light" />
                <Label htmlFor="theme-light" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  Altijd licht
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="dark" id="theme-dark" data-testid="radio-theme-dark" />
                <Label htmlFor="theme-dark" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  Altijd donker
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card data-testid="card-favorite-stations">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Favoriete stations</CardTitle>
                <CardDescription>Beheer en sorteer je favoriete stations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-favorites">
                Geen favoriete stations opgeslagen. Gebruik de ster in de zoekbalk om stations toe te voegen.
              </p>
            ) : (
              <div className="space-y-1" data-testid="list-favorite-stations">
                {favorites.map((code, idx) => (
                  <div
                    key={code}
                    className="flex items-center gap-2 py-2 border-b last:border-b-0 border-border"
                    data-testid={`row-favorite-${code}`}
                  >
                    <span className="flex-1 text-sm font-medium" data-testid={`text-station-${code}`}>
                      {getStationName(code)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
