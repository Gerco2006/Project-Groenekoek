import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Github, Moon, Sun, Monitor, Info, Heart, AlertTriangle, ChevronRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";

export default function MorePage() {
  const { mode, theme, setMode } = useTheme();

  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meer</h1>
          <p className="text-muted-foreground">
            Instellingen en projectinformatie
          </p>
        </div>

        <Link href="/storingen">
          <Card className="hover-elevate cursor-pointer" data-testid="card-disruptions-link">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Storingen & Werkzaamheden</CardTitle>
                    <CardDescription>Bekijk actuele storingen en geplande werkzaamheden</CardDescription>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        </Link>

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

        <Card data-testid="card-about">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Over TravNL</CardTitle>
                <CardDescription>
                  De open-source reisplanner die net wat meer kan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              TravNL is een open-source webapp die werkt als een moderne
              reisplanner, vergelijkbaar met de NS- en 9292-app maar dan met
              extra functies. Het gebruikt de NS-API om treinreizen te plannen,
              vertrektijden te tonen en actuele ritinformatie weer te geven.
            </p>

            <div className="pt-4 border-t space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive fill-destructive" />
                Open Source
              </h3>
              <p className="text-sm text-muted-foreground">
                Dit project is volledig open-source en verwelkomt bijdragen van
                de community. Heb je ideeën, suggesties of wil je meehelpen?
                Bekijk onze GitHub repository!
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.open(
                    "https://github.com/Gerco2006/Project-Groenekoek",
                    "_blank",
                  )
                }
                data-testid="button-github"
              >
                <Github className="w-4 h-4 mr-2" />
                Bekijk op GitHub
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Versie 0.5.0-Alpha.1
              </p>
              <p className="text-xs text-muted-foreground">
                Gemaakt met React, TypeScript en de NS API
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
