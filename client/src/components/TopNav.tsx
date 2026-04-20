import { useLocation } from "wouter";
import { MapIcon, Clock, Search, MoreHorizontal, AlertTriangle } from "lucide-react";
import logoPath from "@assets/image(2)_1776714288663.png";
import { Button } from "@/components/ui/button";
import { usePageReset } from "@/contexts/PageResetContext";

export default function TopNav() {
  const [location, navigate] = useLocation();
  const { resetPage } = usePageReset();

  const navItems = [
    { path: "/", icon: MapIcon, label: "Reisplanner" },
    { path: "/vertrektijden", icon: Clock, label: "Vertrektijden" },
    { path: "/treininfo", icon: Search, label: "Treininfo" },
    { path: "/storingen", icon: AlertTriangle, label: "Storingen" },
    { path: "/meer", icon: MoreHorizontal, label: "Meer" },
  ];

  const handleNavClick = (path: string) => {
    if (location === path) {
      resetPage(path);
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 bg-card/40 backdrop-blur-lg border-b z-50">
      <div className="px-4">
        <div className="flex items-center justify-between h-16">
          <button
            className="flex items-center gap-2 text-xl font-bold"
            data-testid="link-logo"
            onClick={() => handleNavClick("/")}
          >
            <img src={logoPath} alt="TravNL logo" className="w-8 h-8 rounded-full object-cover" data-testid="img-logo" />
            <span>TravNL</span>
          </button>

          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;

              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  className="gap-2"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  onClick={() => handleNavClick(item.path)}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
