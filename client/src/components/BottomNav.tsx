import { useLocation } from "wouter";
import { MapIcon, Clock, Train, MoreHorizontal, AlertTriangle } from "lucide-react";
import { usePageReset } from "@/contexts/PageResetContext";

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { resetPage } = usePageReset();

  const navItems = [
    { path: "/", icon: MapIcon, label: "Planner" },
    { path: "/vertrektijden", icon: Clock, label: "Station" },
    { path: "/storingen", icon: AlertTriangle, label: "Storingen" },
    { path: "/treininfo", icon: Train, label: "Treininfo" },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/40 backdrop-blur-md border-t rounded-t-xl z-[1050]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <button
              key={item.path}
              className={`flex flex-col items-center gap-1 py-3 px-3 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover-elevate"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onClick={() => handleNavClick(item.path)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
