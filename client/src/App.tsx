import { Switch, Route, useLocation, useSearch } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import TastingRoom from "@/pages/tasting-room";
import Profile from "@/pages/profile";
import InviteAccept from "@/pages/invite-accept";
import Wishlist from "@/pages/wishlist";
import WhiskybaseCollection from "@/pages/whiskybase-collection";
import Badges from "@/pages/badges";
import FlavorProfile from "@/pages/flavor-profile";
import FlavorWheel from "@/pages/flavor-wheel";
import TastingCalendar from "@/pages/tasting-calendar";
import HostDashboard from "@/pages/host-dashboard";
import TastingRecap from "@/pages/tasting-recap";
import AdminPanel from "@/pages/admin-panel";
import WhiskyDatabase from "@/pages/whisky-database";
import PhotoTasting from "@/pages/photo-tasting";
import Method from "@/pages/method";
import Intro from "@/pages/intro";
import Landing from "@/pages/landing";
import FeatureTour from "@/pages/feature-tour";
import Tour from "@/pages/tour";
import Background from "@/pages/background";
import News from "@/pages/news";
import QuickTasting from "@/pages/quick-tasting";
import NakedTasting from "@/pages/naked-tasting";
import SupportConsole from "@/pages/support-console";
import MyTastePage from "@/pages/my-taste";
import EnterPage from "@/pages/enter";
import LogWhiskyPage from "@/pages/log-whisky";
import SimpleEnterPage from "@/pages/simple-enter";
import SimpleLogPage from "@/pages/simple-log";
import SimpleFeedbackPage from "@/pages/simple-feedback";
import SimpleTestPage from "@/pages/simple-test";
import SimpleHostPage from "@/pages/simple-host";
import SimpleAnalyzePage from "@/pages/simple-analyze";
import MyTasteFlavors from "@/pages/my-taste-flavors";
import MyTasteCompare from "@/pages/my-taste-compare";
import DiscoverLexicon from "@/pages/discover-lexicon";
import DiscoverCommunityNative from "@/pages/discover-community-native";
import DiscoverDistilleriesNative from "@/pages/discover-distilleries-native";
import MyTasteAnalytics from "@/pages/my-taste-analytics";
import TastingRoomSimple from "@/pages/tasting-room-simple";
import TastingResultsPage from "@/pages/tasting-results";
import Impressum from "@/pages/impressum";
import Privacy from "@/pages/privacy";
import HomeDashboard from "@/pages/home-dashboard";
import TastingHub from "@/pages/tasting-hub";
import TastingSessions from "@/pages/tasting-sessions";
import MyJournal from "@/pages/my-journal";
import DiscoverHub from "@/pages/discover-hub";
import DiscoverDistilleries from "@/pages/discover-distilleries";
import DiscoverCommunity from "@/pages/discover-community";
import ProfileHelp from "@/pages/profile-help";
import Account from "@/pages/account";
import SimpleLegacyShell from "@/components/simple/simple-legacy-shell";
import LabDarkLayout from "@/lab-dark/LabDarkLayout";
import LabHome from "@/lab-dark/pages/LabHome";
import LabSessions from "@/lab-dark/pages/LabSessions";
import LabDiscover from "@/lab-dark/pages/LabDiscover";
import LabSessionDetail from "@/lab-dark/pages/LabSessionDetail";
import { AppShellV2 } from "@/v2/components";
import V2Home from "@/v2/pages/V2Home";
import V2Sessions from "@/v2/pages/V2Sessions";
import V2SessionDetail from "@/v2/pages/V2SessionDetail";
import V2Discover from "@/v2/pages/V2Discover";
import V2Cellar from "@/v2/pages/V2Cellar";
import V2More from "@/v2/pages/V2More";
import { getUIPref } from "@/components/view-switcher";
import { StorageConsent } from "@/components/storage-consent";
import "@/lib/i18n";

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, [to, navigate]);
  return null;
}

function RedirectWithQuery({ to, query }: { to: string; query?: string }) {
  const [, navigate] = useLocation();
  const target = query ? `${to}?${query}` : to;
  useEffect(() => { navigate(target, { replace: true }); }, [target, navigate]);
  return null;
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/landing" component={Landing} />
        <Route path="/feature-tour" component={FeatureTour} />
        <Route path="/tour" component={Tour} />
        <Route path="/background" component={Background} />
        <Route path="/join/:code" component={QuickTasting} />
        <Route path="/enter" component={SimpleEnterPage} />
        <Route path="/join">{() => <Redirect to="/enter" />}</Route>
        <Route path="/log-simple" component={SimpleLogPage} />
        <Route path="/log">{() => <Redirect to="/log-simple" />}</Route>
        <Route path="/simple-test" component={SimpleTestPage} />
        <Route path="/simple-feedback" component={SimpleFeedbackPage} />
        <Route path="/tasting-room-simple/:id" component={TastingRoomSimple} />
        <Route path="/tasting-results/:id" component={TastingResultsPage} />
        <Route path="/naked/:code" component={NakedTasting} />
        <Route path="/support" component={SupportConsole} />
        <Route path="/host" component={SimpleHostPage} />
        <Route path="/analyze" component={SimpleAnalyzePage} />
        <Route path="/my-taste" component={MyTastePage} />
        <Route path="/my-taste/flavors" component={MyTasteFlavors} />
        <Route path="/my-taste/compare" component={MyTasteCompare} />
        <Route path="/my-taste/analytics" component={MyTasteAnalytics} />
        <Route path="/taste" component={MyTastePage} />
        <Route path="/discover/lexicon" component={DiscoverLexicon} />
        <Route path="/discover/community" component={DiscoverCommunityNative} />
        <Route path="/discover/distilleries" component={DiscoverDistilleriesNative} />
        <Route path="/impressum" component={Impressum} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/intro" component={Intro} />

        {/* === V2 DARK WARM UI (standalone routes, no shell) === */}
        <Route path="/app/join/:code" component={QuickTasting} />
        <Route path="/app/naked/:code" component={NakedTasting} />

        {/* === V2 DARK WARM UI === */}
        <Route path="/app/:rest*">
          <AppShellV2>
            <Switch>
              <Route path="/app/home" component={V2Home} />
              <Route path="/app/sessions" component={V2Sessions} />
              <Route path="/app/session/:id" component={V2SessionDetail} />
              <Route path="/app/discover" component={V2Discover} />
              <Route path="/app/cellar" component={V2Cellar} />
              <Route path="/app/more" component={V2More} />
              <Route path="/app/admin" component={AdminPanel} />
              <Route path="/app/recap/:id" component={TastingRecap} />
              <Route path="/app/invite/:token" component={InviteAccept} />
              <Route path="/app">{() => <Redirect to="/app/home" />}</Route>
            </Switch>
          </AppShellV2>
        </Route>

        {/* === LAB DARK (experimental) === */}
        <Route path="/lab-dark/:rest*">
          <LabDarkLayout>
            <Switch>
              <Route path="/lab-dark/home" component={LabHome} />
              <Route path="/lab-dark/sessions" component={LabSessions} />
              <Route path="/lab-dark/discover" component={LabDiscover} />
              <Route path="/lab-dark/session/:id" component={LabSessionDetail} />
              <Route path="/lab-dark">{() => <Redirect to="/lab-dark/home" />}</Route>
            </Switch>
          </LabDarkLayout>
        </Route>

        {/* === LEGACY UI (wrapped in Simple Mode shell for nav continuity) === */}
        <Route path="/legacy/:rest*">
          <SimpleLegacyShell>
            <Switch>
              <Route path="/legacy/home" component={HomeDashboard} />
              <Route path="/legacy/tasting" component={TastingHub} />
              <Route path="/legacy/tasting/sessions" component={TastingSessions} />
              <Route path="/legacy/tasting/calendar" component={TastingCalendar} />
              <Route path="/legacy/tasting/host" component={HostDashboard} />
              <Route path="/legacy/tasting/:id" component={TastingRoom} />
              <Route path="/legacy/my/journal" component={MyJournal} />
              <Route path="/legacy/my/collection" component={WhiskybaseCollection} />
              <Route path="/legacy/my/wishlist" component={Wishlist} />
              <Route path="/legacy/discover" component={DiscoverHub} />
              <Route path="/legacy/discover/distilleries" component={DiscoverDistilleries} />
              <Route path="/legacy/discover/community" component={DiscoverCommunity} />
              <Route path="/legacy/discover/database" component={WhiskyDatabase} />
              <Route path="/legacy/profile" component={Profile} />
              <Route path="/legacy/profile/account" component={Account} />
              <Route path="/legacy/profile/help" component={ProfileHelp} />
              <Route path="/legacy/admin" component={AdminPanel} />
              <Route path="/legacy/news" component={News} />
              <Route path="/legacy/badges" component={Badges} />
              <Route path="/legacy/flavor-profile" component={FlavorProfile} />
              <Route path="/legacy/flavor-wheel" component={FlavorWheel} />
              <Route path="/legacy/photo-tasting" component={PhotoTasting} />
              <Route path="/legacy/method" component={Method} />
              <Route path="/legacy/recap/:id" component={TastingRecap} />
              <Route path="/legacy/invite/:token" component={InviteAccept} />
              <Route path="/legacy/comparison">{() => <RedirectWithQuery to="/legacy/my/journal" query="tab=compare" />}</Route>
              <Route path="/legacy/tasting-templates">{() => <RedirectWithQuery to="/legacy/tasting" query="tab=templates" />}</Route>
              <Route path="/legacy/pairings">{() => <RedirectWithQuery to="/legacy/tasting" query="tab=pairings" />}</Route>
              <Route path="/legacy/benchmark">{() => <RedirectWithQuery to="/legacy/my/journal" query="tab=benchmark" />}</Route>
              <Route path="/legacy/analytics">{() => <RedirectWithQuery to="/legacy/my/journal" query="tab=analytics" />}</Route>
              <Route path="/legacy/data-export">{() => <RedirectWithQuery to="/legacy/my/journal" query="tab=export" />}</Route>
              <Route path="/legacy/recommendations">{() => <Redirect to="/legacy/discover" />}</Route>
              <Route path="/legacy/taste-twins">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=twins" />}</Route>
              <Route path="/legacy/friends">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=friends" />}</Route>
              <Route path="/legacy/community-rankings">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=rankings" />}</Route>
              <Route path="/legacy/activity">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=activity" />}</Route>
              <Route path="/legacy/leaderboard">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=leaderboard" />}</Route>
              <Route path="/legacy/lexicon">{() => <RedirectWithQuery to="/legacy/discover" query="section=lexicon" />}</Route>
              <Route path="/legacy/distilleries">{() => <Redirect to="/legacy/discover/distilleries" />}</Route>
              <Route path="/legacy/distillery-map">{() => <RedirectWithQuery to="/legacy/discover/distilleries" query="tab=map" />}</Route>
              <Route path="/legacy/bottlers">{() => <RedirectWithQuery to="/legacy/discover/distilleries" query="tab=bottlers" />}</Route>
              <Route path="/legacy/research">{() => <RedirectWithQuery to="/legacy/discover" query="section=research" />}</Route>
              <Route path="/legacy/about">{() => <RedirectWithQuery to="/legacy/profile/help" query="tab=about" />}</Route>
              <Route path="/legacy/features">{() => <RedirectWithQuery to="/legacy/profile/help" query="tab=features" />}</Route>
              <Route path="/legacy/donate">{() => <RedirectWithQuery to="/legacy/profile/help" query="tab=donate" />}</Route>
              <Route path="/legacy">{() => <Redirect to="/legacy/home" />}</Route>
              <Route component={NotFound} />
            </Switch>
          </SimpleLegacyShell>
        </Route>

        {/* === CURRENT ROUTES (keep working, redirect to legacy) === */}
        <Route>
          <Layout>
            <Switch>
              <Route path="/home" component={HomeDashboard} />
              <Route path="/tasting" component={TastingHub} />
              <Route path="/tasting/sessions" component={TastingSessions} />
              <Route path="/tasting/calendar" component={TastingCalendar} />
              <Route path="/tasting/host" component={HostDashboard} />
              <Route path="/tasting/:id" component={TastingRoom} />
              <Route path="/my/journal" component={MyJournal} />
              <Route path="/my/collection" component={WhiskybaseCollection} />
              <Route path="/my/wishlist" component={Wishlist} />
              <Route path="/discover" component={DiscoverHub} />
              <Route path="/discover/distilleries" component={DiscoverDistilleries} />
              <Route path="/discover/community" component={DiscoverCommunity} />
              <Route path="/discover/database" component={WhiskyDatabase} />
              <Route path="/profile/account" component={Account} />
              <Route path="/profile/help" component={ProfileHelp} />
              <Route path="/profile">{() => <Redirect to="/my-taste" />}</Route>
              <Route path="/admin" component={AdminPanel} />
              <Route path="/news" component={News} />
              <Route path="/badges" component={Badges} />
              <Route path="/flavor-profile" component={FlavorProfile} />
              <Route path="/flavor-wheel" component={FlavorWheel} />
              <Route path="/photo-tasting" component={PhotoTasting} />
              <Route path="/method" component={Method} />
              <Route path="/recap/:id" component={TastingRecap} />
              <Route path="/invite/:token" component={InviteAccept} />

              <Route path="/sessions">{() => <Redirect to="/tasting/sessions" />}</Route>
              <Route path="/journal">{() => <Redirect to="/my/journal" />}</Route>
              <Route path="/my-whiskies">{() => <RedirectWithQuery to="/my/journal" query="tab=tasted" />}</Route>
              <Route path="/collection">{() => <Redirect to="/my/collection" />}</Route>
              <Route path="/wishlist">{() => <Redirect to="/my/wishlist" />}</Route>
              <Route path="/recap">{() => <RedirectWithQuery to="/my/journal" query="tab=recap" />}</Route>
              <Route path="/my-tastings">{() => <RedirectWithQuery to="/tasting/sessions" query="tab=mine" />}</Route>
              <Route path="/host-dashboard">{() => <Redirect to="/tasting/host" />}</Route>
              <Route path="/export-notes">{() => <RedirectWithQuery to="/my/journal" query="tab=export" />}</Route>
              <Route path="/calendar">{() => <Redirect to="/tasting/calendar" />}</Route>
              <Route path="/comparison">{() => <RedirectWithQuery to="/my/journal" query="tab=compare" />}</Route>
              <Route path="/tasting-templates">{() => <RedirectWithQuery to="/tasting" query="tab=templates" />}</Route>
              <Route path="/pairings">{() => <RedirectWithQuery to="/tasting" query="tab=pairings" />}</Route>
              <Route path="/benchmark">{() => <RedirectWithQuery to="/my/journal" query="tab=benchmark" />}</Route>
              <Route path="/whisky-database">{() => <Redirect to="/discover/database" />}</Route>
              <Route path="/analytics">{() => <RedirectWithQuery to="/my/journal" query="tab=analytics" />}</Route>
              <Route path="/data-export">{() => <RedirectWithQuery to="/my/journal" query="tab=export" />}</Route>
              <Route path="/recommendations">{() => <Redirect to="/discover" />}</Route>
              <Route path="/taste-twins">{() => <RedirectWithQuery to="/discover/community" query="tab=twins" />}</Route>
              <Route path="/friends">{() => <RedirectWithQuery to="/discover/community" query="tab=friends" />}</Route>
              <Route path="/community-rankings">{() => <RedirectWithQuery to="/discover/community" query="tab=rankings" />}</Route>
              <Route path="/activity">{() => <RedirectWithQuery to="/discover/community" query="tab=activity" />}</Route>
              <Route path="/leaderboard">{() => <RedirectWithQuery to="/discover/community" query="tab=leaderboard" />}</Route>
              <Route path="/account">{() => <Redirect to="/profile/account" />}</Route>
              <Route path="/lexicon">{() => <RedirectWithQuery to="/discover" query="section=lexicon" />}</Route>
              <Route path="/distilleries">{() => <Redirect to="/discover/distilleries" />}</Route>
              <Route path="/distillery-map">{() => <RedirectWithQuery to="/discover/distilleries" query="tab=map" />}</Route>
              <Route path="/bottlers">{() => <RedirectWithQuery to="/discover/distilleries" query="tab=bottlers" />}</Route>
              <Route path="/research">{() => <RedirectWithQuery to="/discover" query="section=research" />}</Route>
              <Route path="/help">{() => <Redirect to="/profile/help" />}</Route>
              <Route path="/about">{() => <RedirectWithQuery to="/profile/help" query="tab=about" />}</Route>
              <Route path="/features">{() => <RedirectWithQuery to="/profile/help" query="tab=features" />}</Route>
              <Route path="/donate">{() => <RedirectWithQuery to="/profile/help" query="tab=donate" />}</Route>
              <Route path="/reminders">{() => <Redirect to="/tasting/sessions" />}</Route>

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
        <StorageConsent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
