import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import TastingRoom from "@/pages/tasting-room";
import Profile from "@/pages/profile";
import WhiskyFriends from "@/pages/whisky-friends";
import Sessions from "@/pages/sessions";
import InviteAccept from "@/pages/invite-accept";
import AboutMethod from "@/pages/about-method";
import Journal from "@/pages/journal";
import Badges from "@/pages/badges";
import Lexicon from "@/pages/lexicon";
import FlavorProfile from "@/pages/flavor-profile";
import Recommendations from "@/pages/recommendations";
import Comparison from "@/pages/comparison";
import TastingTemplates from "@/pages/tasting-templates";
import ActivityFeed from "@/pages/activity-feed";
import TastingCalendar from "@/pages/tasting-calendar";
import ExportNotes from "@/pages/export-notes";
import HostDashboard from "@/pages/host-dashboard";
import TastingRecap from "@/pages/tasting-recap";
import FlavorWheel from "@/pages/flavor-wheel";
import PairingSuggestions from "@/pages/pairing-suggestions";
import Leaderboard from "@/pages/leaderboard";
import AdminPanel from "@/pages/admin-panel";
import DistilleryEncyclopedia from "@/pages/distillery-encyclopedia";
import DistilleryMap from "@/pages/distillery-map";
import WhiskyDatabase from "@/pages/whisky-database";
import Donate from "@/pages/donate";
import BenchmarkAnalyzer from "@/pages/benchmark-analyzer";
import Features from "@/pages/features";
import Intro from "@/pages/intro";
import { hasSeenIntro } from "@/pages/intro";
import { BuildFooter } from "@/components/build-footer";
import "@/lib/i18n";

function IntroRedirect() {
  const [location] = useLocation();
  if (!hasSeenIntro() && location !== "/intro") {
    return <Redirect to="/intro" />;
  }
  return null;
}

function Router() {
  return (
    <>
      <IntroRedirect />
      <Switch>
        <Route path="/intro" component={Intro} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/sessions" component={Sessions} />
              <Route path="/tasting/:id" component={TastingRoom} />
              <Route path="/profile" component={Profile} />
              <Route path="/friends" component={WhiskyFriends} />
              <Route path="/journal" component={Journal} />
              <Route path="/badges" component={Badges} />
              <Route path="/lexicon" component={Lexicon} />
              <Route path="/flavor-profile" component={FlavorProfile} />
              <Route path="/flavor-wheel" component={FlavorWheel} />
              <Route path="/recommendations" component={Recommendations} />
              <Route path="/comparison" component={Comparison} />
              <Route path="/tasting-templates" component={TastingTemplates} />
              <Route path="/activity" component={ActivityFeed} />
              <Route path="/calendar" component={TastingCalendar} />
              <Route path="/export-notes" component={ExportNotes} />
              <Route path="/host-dashboard" component={HostDashboard} />
              <Route path="/recap/:id" component={TastingRecap} />
              <Route path="/recap" component={TastingRecap} />
              <Route path="/pairings" component={PairingSuggestions} />
              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/admin" component={AdminPanel} />
              <Route path="/distilleries" component={DistilleryEncyclopedia} />
              <Route path="/distillery-map" component={DistilleryMap} />
              <Route path="/whisky-database" component={WhiskyDatabase} />
              <Route path="/donate" component={Donate} />
              <Route path="/benchmark" component={BenchmarkAnalyzer} />
              <Route path="/features" component={Features} />
              <Route path="/about-method" component={AboutMethod} />
              <Route path="/invite/:token" component={InviteAccept} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <BuildFooter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
