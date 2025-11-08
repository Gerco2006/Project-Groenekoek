import { Link, useLocation } from "wouter";
import { MapIcon, Clock, MoreHorizontal } from "lucide-react";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: MapIcon, label: "Reisplanner" },
    { path: "/vertrektijden", icon: Clock, label: "Vertrektijden" },
    { path: "/meer", icon: MoreHorizontal, label: "Meer" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center gap-1 py-3 px-6 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover-elevate"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
