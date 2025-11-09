import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Github, Moon, Sun, Info, Heart } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";

export default function MorePage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meer</h1>
          <p className="text-muted-foreground">Instellingen en projectinformatie</p>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle" className="cursor-pointer">
                {theme === "dark" ? "Donkere modus" : "Lichte modus"}
              </Label>
              <Switch
                id="theme-toggle"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-theme"
              />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-about">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Over TravNL</CardTitle>
                <CardDescription>De open-source reisplanner die net wat meer kan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              TravNL is een moderne, open-source Nederlandse treinreisplanner. 
              Deze applicatie maakt gebruik van de officiële NS API's om je de meest actuele 
              reisinformatie te bieden. Van reisadviezen tot vertrektijden en gedetailleerde 
              treininfo - alles wat je nodig hebt voor een vlotte reis.
            </p>
            
            <div className="pt-4 border-t space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive fill-destructive" />
                Open Source
              </h3>
              <p className="text-sm text-muted-foreground">
                Dit project is volledig open-source en verwelkomt bijdragen van de community. 
                Heb je ideeën, suggesties of wil je meehelpen? Bekijk onze GitHub repository!
              </p>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://github.com/travnl/travnl', '_blank')}
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
              <p className="text-sm text-muted-foreground">Versie 1.0.0</p>
              <p className="text-xs text-muted-foreground">
                Gemaakt met React, TypeScript en de NS API
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
