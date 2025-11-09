import TopNav from "../TopNav";
import { Router } from "wouter";

export default function TopNavExample() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          Navigate using the top bar
        </div>
      </div>
    </Router>
  );
}
