import { Link, useLocation } from "wouter";
import { MapIcon, Clock, Search, MoreHorizontal, Train, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: MapIcon, label: "Reisplanner" },
    { path: "/vertrektijden", icon: Clock, label: "Vertrektijden" },
    { path: "/treininfo", icon: Search, label: "Treininfo" },
    { path: "/storingen", icon: AlertTriangle, label: "Storingen" },
    { path: "/meer", icon: MoreHorizontal, label: "Meer" },
  ];

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 bg-card/75 backdrop-blur-lg border-b z-50">
      <div className="px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <button
              className="flex items-center gap-2 text-xl font-bold"
              data-testid="link-logo"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Train className="w-5 h-5 text-primary-foreground" />
              </div>
              <span>TravNL</span>
            </button>
          </Link>

          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;

              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="gap-2"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
