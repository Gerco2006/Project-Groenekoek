import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Moon, Sun, Monitor, Settings, ChevronLeft } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";

export default function SettingsPage() {
  const { mode, theme, setMode } = useTheme();

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
      </div>
    </PageContainer>
  );
}
