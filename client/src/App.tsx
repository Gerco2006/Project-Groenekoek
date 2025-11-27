import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import JourneyPlanner from "@/pages/JourneyPlanner";
import DepartureBoard from "@/pages/DepartureBoard";
import TrainLookup from "@/pages/TrainLookup";
import Disruptions from "@/pages/Disruptions";
import MorePage from "@/pages/MorePage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <TopNav />
      <div className="pb-20 md:pb-0 md:pt-16">
        <Switch>
          <Route path="/" component={JourneyPlanner} />
          <Route path="/vertrektijden" component={DepartureBoard} />
          <Route path="/treininfo" component={TrainLookup} />
          <Route path="/storingen" component={Disruptions} />
          <Route path="/meer" component={MorePage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
