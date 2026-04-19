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
import SettingsPage from "@/pages/SettingsPage";
import ChangelogPage from "@/pages/ChangelogPage";
import NotFound from "@/pages/not-found";
import { PageResetProvider, usePageReset } from "@/contexts/PageResetContext";

function Router() {
  const { pageKeys } = usePageReset();

  return (
    <>
      <TopNav />
      <div className="pb-20 md:pb-0 md:pt-16">
        <Switch>
          <Route path="/">
            {() => <JourneyPlanner key={pageKeys["/"] || 0} />}
          </Route>
          <Route path="/vertrektijden">
            {() => <DepartureBoard key={pageKeys["/vertrektijden"] || 0} />}
          </Route>
          <Route path="/treininfo">
            {() => <TrainLookup key={pageKeys["/treininfo"] || 0} />}
          </Route>
          <Route path="/storingen">
            {() => <Disruptions key={pageKeys["/storingen"] || 0} />}
          </Route>
          <Route path="/meer">
            {() => <MorePage key={pageKeys["/meer"] || 0} />}
          </Route>
          <Route path="/instellingen">
            {() => <SettingsPage key={pageKeys["/instellingen"] || 0} />}
          </Route>
          <Route path="/changelog">
            {() => <ChangelogPage key={pageKeys["/changelog"] || 0} />}
          </Route>
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
          <PageResetProvider>
            <Router />
          </PageResetProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
