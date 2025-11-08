import BottomNav from "../BottomNav";
import { Router } from "wouter";

export default function BottomNavExample() {
  return (
    <Router>
      <div className="h-screen bg-background">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Navigate using the bottom bar
        </div>
        <BottomNav />
      </div>
    </Router>
  );
}
