import { Switch, Route } from "wouter";
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
import Wishlist from "@/pages/wishlist";
import WhiskybaseCollection from "@/pages/whiskybase-collection";
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
import Bottlers from "@/pages/bottlers";
import WhiskyDatabase from "@/pages/whisky-database";
import Donate from "@/pages/donate";
import BenchmarkAnalyzer from "@/pages/benchmark-analyzer";
import Features from "@/pages/features";
import PhotoTasting from "@/pages/photo-tasting";
import Reminders from "@/pages/reminders";
import CommunityRankings from "@/pages/community-rankings";
import TasteTwins from "@/pages/taste-twins";
import TastingHistory from "@/pages/tasting-history";
import MyWhiskies from "@/pages/my-whiskies";
import About from "@/pages/about";
import DataExport from "@/pages/data-export";
import Analytics from "@/pages/analytics";
import Intro from "@/pages/intro";
import Landing from "@/pages/landing";
import FeatureTour from "@/pages/feature-tour";
import Tour from "@/pages/tour";
import News from "@/pages/news";
import QuickTasting from "@/pages/quick-tasting";
import { BuildFooter } from "@/components/build-footer";
import "@/lib/i18n";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/feature-tour" component={FeatureTour} />
        <Route path="/tour" component={Tour} />
        <Route path="/join/:code" component={QuickTasting} />
        <Route path="/intro" component={Intro} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/app" component={Home} />
              <Route path="/news" component={News} />
              <Route path="/sessions" component={Sessions} />
              <Route path="/tasting/:id" component={TastingRoom} />
              <Route path="/profile" component={Profile} />
              <Route path="/friends" component={WhiskyFriends} />
              <Route path="/journal" component={Journal} />
              <Route path="/wishlist" component={Wishlist} />
              <Route path="/collection" component={WhiskybaseCollection} />
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
              <Route path="/community-rankings" component={CommunityRankings} />
              <Route path="/taste-twins" component={TasteTwins} />
              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/admin" component={AdminPanel} />
              <Route path="/distilleries" component={DistilleryEncyclopedia} />
              <Route path="/distillery-map" component={DistilleryMap} />
              <Route path="/bottlers" component={Bottlers} />
              <Route path="/whisky-database" component={WhiskyDatabase} />
              <Route path="/donate" component={Donate} />
              <Route path="/benchmark" component={BenchmarkAnalyzer} />
              <Route path="/features" component={Features} />
              <Route path="/photo-tasting" component={PhotoTasting} />
              <Route path="/reminders" component={Reminders} />
              <Route path="/my-tastings" component={TastingHistory} />
              <Route path="/my-whiskies" component={MyWhiskies} />
              <Route path="/about-method" component={AboutMethod} />
              <Route path="/about" component={About} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/data-export" component={DataExport} />
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
