import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, ChevronRight, ScrollText, ShieldCheck, Heart, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { SiBluesky, SiPatreon } from "react-icons/si";
import PageContainer from "@/components/PageContainer";
import logoPath from "@assets/image(2)_1776714288663.png";

export default function MorePage() {
  return (
    <PageContainer>
      <div className="min-h-screen bg-background">
        <Card
          data-testid="card-about"
          className="rounded-none border-x-0 border-t-0 md:rounded-md md:border md:mx-4 md:mt-6"
        >
          <CardHeader>
              <div className="flex items-center gap-3">
                <img src={logoPath} alt="TravNL logo" className="w-10 h-10 rounded-full object-cover" data-testid="img-logo" />
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

        <div className="px-4 md:px-4 py-6 space-y-6">
          <Card className="overflow-hidden">
            <Link href="/instellingen" data-testid="link-instellingen">
              <div className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base leading-tight">Instellingen</p>
                    <p className="text-sm text-muted-foreground">Weergave en app-opties</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Link>

            <div className="border-t mx-4" />

            <Link href="/changelog" data-testid="card-changelog">
              <div className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ScrollText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base leading-tight">Changelog</p>
                    <p className="text-sm text-muted-foreground">Updates en wijzigingen</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Link>

            <div className="border-t mx-4" />

            <Link href="/juridisch" data-testid="card-juridisch">
              <div className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base leading-tight">Juridisch & Support</p>
                    <p className="text-sm text-muted-foreground">Privacy, voorwaarden en contact</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </Card>

          <Card data-testid="card-steun-travnl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Steun TravNL
              </CardTitle>
              <CardDescription>
                Fan van TravNL? Steun of volg ons hier:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href="https://www.patreon.com/cw/TravNL"
                target="_blank"
                rel="noreferrer"
                data-testid="link-patreon"
                className="flex items-center justify-between px-4 py-3 rounded-md border bg-muted/40 hover-elevate cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <SiPatreon className="w-5 h-5 text-[#ff424d]" />
                  <div>
                    <p className="font-semibold text-sm leading-tight">Doneer via Patreon</p>
                    <p className="text-xs text-muted-foreground">Help TravNL verder groeien</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href="https://bsky.app/profile/aedoesthings.bsky.social"
                target="_blank"
                rel="noreferrer"
                data-testid="link-bluesky"
                className="flex items-center justify-between px-4 py-3 rounded-md border bg-muted/40 hover-elevate cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <SiBluesky className="w-5 h-5 text-[#0085ff]" />
                  <div>
                    <p className="font-semibold text-sm leading-tight">Volg op Bluesky</p>
                    <p className="text-xs text-muted-foreground">Blijf op de hoogte van updates</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Versie 0.7.2 (Alpha 2)
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
