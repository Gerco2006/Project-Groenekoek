import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info, Settings, ChevronRight, ScrollText } from "lucide-react";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";
import logoPath from "@assets/image(2)_1776714288663.png";

export default function MorePage() {
  return (
    <PageContainer>
      <div className="min-h-screen bg-background">
        {/* Over TravNL — volledig breed op mobiel, normale card op desktop */}
        <Card
          data-testid="card-about"
          className="rounded-none border-x-0 border-t-0 md:rounded-md md:border md:mx-4 md:mt-6"
        >
          <CardHeader>
              <div className="flex items-center gap-3">
                <img src={logoPath} alt="TravNL logo" className="w-5 h-5 rounded-full object-cover" data-testid="img-logo" />
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
              TravNL is een moderne reisplanner voor het Nederlandse spoor. Het
              biedt uitgebreide informatie over ritten, treinmaterieel en
              stations, met een focus op een snelle en duidelijke
              gebruikerservaring.
            </p>
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm text-muted-foreground">
                Gemaakt voor reizigers die behoefte hebben aan meer inzicht in
                hun reis. TravNL maakt gebruik van officiële NS-data om je
                altijd te voorzien van de meest actuele informatie.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rest van de pagina — met zijmarges op mobiel */}
        <div className="px-4 md:px-4 py-6 space-y-6">
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

          <Link href="/changelog">
            <Card
              className="hover-elevate cursor-pointer overflow-hidden transition-all active:scale-[0.98]"
              data-testid="card-changelog"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ScrollText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Changelog</CardTitle>
                      <CardDescription>Updates en wijzigingen</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Versie 0.7.1 (Alpha 2)
                </p>
                <p className="text-xs text-muted-foreground">
                  © 2025 - 2026 Gerco van 't Foort | Gemaakt met React, TypeScript en de NS API
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
