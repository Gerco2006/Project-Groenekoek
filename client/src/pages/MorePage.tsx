import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info, Heart, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";

export default function MorePage() {
  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meer</h1>
          <p className="text-muted-foreground">
            Instellingen en projectinformatie
          </p>
        </div>

        <Link href="/instellingen">
          <Card className="hover-elevate cursor-pointer overflow-hidden transition-all active:scale-[0.98]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Instellingen</CardTitle>
                    <CardDescription>Weergave en app-opties</CardDescription>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Card data-testid="card-about">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Over TravNL</CardTitle>
                <CardDescription>
                  De reisplanner die net wat meer kan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              TravNL is een moderne reisplanner voor het Nederlandse spoor. 
              Het biedt uitgebreide informatie over ritten, treinmaterieel en stations, 
              met een focus op een snelle en duidelijke gebruikerservaring.
            </p>

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm text-muted-foreground">
                Gemaakt voor reizigers die behoefte hebben aan meer inzicht in hun reis.
                TravNL maakt gebruik van officiële NS-data om je altijd te voorzien van de meest actuele informatie.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Versie 0.6.4-Alpha.2
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

