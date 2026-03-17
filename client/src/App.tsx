import { Switch, Route, useLocation, useSearch } from "wouter";
import { useEffect, Component, type ReactNode, type ErrorInfo, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import NavRedirects from "@/components/nav-redirects";
import { getUIPref } from "@/components/view-switcher";
import { StorageConsent } from "@/components/storage-consent";
import "@/lib/i18n";
import { pushRoute } from "@/lib/navStack";

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason?.message || event.reason || "");
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS")
  ) {
    const key = "cs_chunk_reload";
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (!last || now - parseInt(last, 10) > 10000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }
  }
});

// ── Core pages (eager-loaded: critical navigation paths) ──
import TastingHubSimple from "@/pages/tasting-hub-simple";
import MyTastePage from "@/pages/my-taste";
import SimpleEnterPage from "@/pages/simple-enter";
import SimpleLogPage from "@/pages/simple-log";
import SimpleHostPage from "@/pages/simple-host";
import SimpleAnalyzePage from "@/pages/simple-analyze";
import TastingRoomSimple from "@/pages/tasting-room-simple";
import TastingResultsPage from "@/pages/tasting-results";
import NakedTasting from "@/pages/naked-tasting";
import QuickTasting from "@/pages/quick-tasting";
import PublicLanding from "@/pages/public-landing";
import LandingNew from "@/pages/landing-new";
import FeatureOverview from "@/pages/feature-overview";

// ── My Taste subpages (eager: frequently accessed) ──
import MyJournal from "@/pages/my-journal";
import MyTasteAnalytics from "@/pages/my-taste-analytics";
import MyTasteCompare from "@/pages/my-taste-compare";
import MyTasteBenchmark from "@/pages/my-taste-benchmark";
import MyTasteWheel from "@/pages/my-taste-wheel";
import MyTasteRecommendations from "@/pages/my-taste-recommendations";
import MyTasteSettings from "@/pages/my-taste-settings";
import MyTastePairings from "@/pages/my-taste-pairings";
import FlavorProfile from "@/pages/flavor-profile";
import Wishlist from "@/pages/wishlist";
import WhiskybaseCollection from "@/pages/whiskybase-collection";

// ── Tasting management (eager) ──
import HostDashboard from "@/pages/host-dashboard";
import TastingCalendar from "@/pages/tasting-calendar";
import SessionsDark from "@/pages/sessions-dark";
import TastingRecap from "@/pages/tasting-recap";
import DataExportDark from "@/pages/data-export-dark";
import DownloadsExport from "@/pages/downloads-export";
import InviteAccept from "@/pages/invite-accept";

// ── Discover / Knowledge pages (eager) ──
import DiscoverLexicon from "@/pages/discover-lexicon";
import DiscoverCommunityNative from "@/pages/discover-community-native";
import DiscoverDistilleriesNative from "@/pages/discover-distilleries-native";
import DiscoverBottlersNative from "@/pages/discover-bottlers-native";
import VocabularyDark from "@/pages/vocabulary-dark";
import AICurationDark from "@/pages/ai-curation-dark";
import DonateDark from "@/pages/donate-dark";
import TastingGuide from "@/pages/tasting-guide";
import DiscoverTemplates from "@/pages/discover-templates";
import AboutDark from "@/pages/about-dark";
import ActivityFeed from "@/pages/activity-feed";
import Impressum from "@/pages/impressum";
import Privacy from "@/pages/privacy";

// ── Lazy-loaded pages (rarely accessed) ──
const GuidedPresentation = lazy(() => import("@/pages/guided-presentation"));
const LandingV2 = lazy(() => import("@/pages/landing-v2"));
const FeatureShowcase = lazy(() => import("@/pages/feature-showcase"));
const FeatureTour = lazy(() => import("@/pages/feature-tour"));
const Tour = lazy(() => import("@/pages/tour"));
const Background = lazy(() => import("@/pages/background"));
const ResearchStandalone = lazy(() => import("@/pages/research-standalone"));
const News = lazy(() => import("@/pages/news"));
const Intro = lazy(() => import("@/pages/intro"));
const AdminPanel = lazy(() => import("@/pages/admin-panel"));
const SupportConsole = lazy(() => import("@/pages/support-console"));
const Landing = lazy(() => import("@/pages/landing"));
const SimpleFeedbackPage = lazy(() => import("@/pages/simple-feedback"));
const SimpleTestPage = lazy(() => import("@/pages/simple-test"));
const InternalLandingGlasses = lazy(() => import("@/pages/internal-landing-glasses"));

// ── Legacy layout shells ──
import AdminLayout from "@/components/admin/AdminLayout";
import SimpleLegacyShell from "@/components/simple/simple-legacy-shell";

// ── Legacy / Layout-wrapped pages (eager for legacy routes) ──
import TastingRoom from "@/pages/tasting-room";
import Profile from "@/pages/profile";
import Badges from "@/pages/badges";
import FlavorWheel from "@/pages/flavor-wheel";
import WhiskyDatabase from "@/pages/whisky-database";
import PhotoTasting from "@/pages/photo-tasting";
import Method from "@/pages/method";
import RabbitHole from "@/pages/rabbit-hole";
import HomeDashboard from "@/pages/home-dashboard";
import TastingHub from "@/pages/tasting-hub";
import TastingSessions from "@/pages/tasting-sessions";
import DiscoverHub from "@/pages/discover-hub";
import DiscoverDistilleries from "@/pages/discover-distilleries";
import DiscoverCommunity from "@/pages/discover-community";
import ProfileHelp from "@/pages/profile-help";
import Account from "@/pages/account";
import LogWhiskyPage from "@/pages/log-whisky";
import Recommendations from "@/pages/recommendations";
import EnterPage from "@/pages/enter";

// ── Module 2 pages (lazy-loaded — separate chunk) ──
import Module2Shell from "@/components/m2/Module2Shell";
const M2TastingsHome = lazy(() => import("@/pages/m2/M2TastingsHome"));
const M2TastingsJoin = lazy(() => import("@/pages/m2/M2TastingsJoin"));
const M2TastingsHost = lazy(() => import("@/pages/m2/M2TastingsHost"));
const M2TastingsSolo = lazy(() => import("@/pages/m2/M2TastingsSolo"));
const M2TastingSession = lazy(() => import("@/pages/m2/M2TastingSession"));
const M2HostControl = lazy(() => import("@/pages/m2/M2HostControl"));
const M2HostingDashboard = lazy(() => import("@/pages/m2/M2HostingDashboard"));
const M2TastingPlay = lazy(() => import("@/pages/m2/M2TastingPlay"));
const M2TastingRecap = lazy(() => import("@/pages/m2/M2TastingRecap"));
const M2TastingResults = lazy(() => import("@/pages/m2/M2TastingResults"));
const M2TasteHome = lazy(() => import("@/pages/m2/M2TasteHome"));
const M2TasteProfile = lazy(() => import("@/pages/m2/M2TasteProfile"));
const M2TasteAnalytics = lazy(() => import("@/pages/m2/M2TasteAnalytics"));
const M2TasteDrams = lazy(() => import("@/pages/m2/M2TasteDrams"));
const M2TasteCollection = lazy(() => import("@/pages/m2/M2TasteCollection"));
const M2TasteCompare = lazy(() => import("@/pages/m2/M2TasteCompare"));
const M2TastePairings = lazy(() => import("@/pages/m2/M2TastePairings"));
const M2TasteWheel = lazy(() => import("@/pages/m2/M2TasteWheel"));
const M2TasteBenchmark = lazy(() => import("@/pages/m2/M2TasteBenchmark"));
const M2CollectionAnalysis = lazy(() => import("@/pages/m2/M2CollectionAnalysis"));
const M2HistoricalTastings = lazy(() => import("@/pages/m2/M2HistoricalTastings"));
const M2HistoricalInsights = lazy(() => import("@/pages/m2/M2HistoricalInsights"));
const M2HistoricalTastingDetail = lazy(() => import("@/pages/m2/M2HistoricalTastingDetail"));
const M2TasteSettings = lazy(() => import("@/pages/m2/M2TasteSettings"));
const M2TasteWishlist = lazy(() => import("@/pages/m2/M2TasteWishlist"));
const M2CircleHome = lazy(() => import("@/pages/m2/M2CircleHome"));
const M2Admin = lazy(() => import("@/pages/m2/M2Admin"));
const M2HostDashboard = lazy(() => import("@/pages/m2/M2HostDashboard"));
const M2TasteRecommendations = lazy(() => import("@/pages/m2/M2TasteRecommendations"));
const M2TasteConnoisseur = lazy(() => import("@/pages/m2/M2TasteConnoisseur"));
const M2Impressum = lazy(() => import("@/pages/m2/M2Impressum"));
const M2Privacy = lazy(() => import("@/pages/m2/M2Privacy"));
const M2DiscoverHub = lazy(() => import("@/pages/m2/M2DiscoverHub"));
const M2DiscoverLexicon = lazy(() => import("@/pages/m2/M2DiscoverLexicon"));
const M2DiscoverDistilleries = lazy(() => import("@/pages/m2/M2DiscoverDistilleries"));
const M2DiscoverBottlers = lazy(() => import("@/pages/m2/M2DiscoverBottlers"));
const M2DiscoverTemplates = lazy(() => import("@/pages/m2/M2DiscoverTemplates"));
const M2DiscoverGuide = lazy(() => import("@/pages/m2/M2DiscoverGuide"));
const M2DiscoverAICuration = lazy(() => import("@/pages/m2/M2DiscoverAICuration"));
const M2DiscoverResearch = lazy(() => import("@/pages/m2/M2DiscoverResearch"));
const M2DiscoverRabbitHole = lazy(() => import("@/pages/m2/M2DiscoverRabbitHole"));
const M2DiscoverVocabulary = lazy(() => import("@/pages/m2/M2DiscoverVocabulary"));
const M2DiscoverAbout = lazy(() => import("@/pages/m2/M2DiscoverAbout"));
const M2DiscoverDonate = lazy(() => import("@/pages/m2/M2DiscoverDonate"));
const M2DiscoverActivity = lazy(() => import("@/pages/m2/M2DiscoverActivity"));
const M2DiscoverCommunity = lazy(() => import("@/pages/m2/M2DiscoverCommunity"));
const M2PublicHistoricalInsights = lazy(() => import("@/pages/m2/M2PublicHistoricalInsights"));
const M2MakingOf = lazy(() => import("@/pages/m2/M2MakingOf"));
const M2PaperScan = lazy(() => import("@/pages/m2/M2PaperScan"));

// ── V2 Dark Warm UI ──
import LabDarkLayout from "@/lab-dark/LabDarkLayout";
import LabHome from "@/lab-dark/pages/LabHome";
import LabSessions from "@/lab-dark/pages/LabSessions";
import LabDiscover from "@/lab-dark/pages/LabDiscover";
import LabSessionDetail from "@/lab-dark/pages/LabSessionDetail";

// ── CaskSense Labs (lazy-loaded — separate chunk) ──
import LabsLayout from "@/labs/LabsLayout";
const LabsHome = lazy(() => import("@/labs/pages/LabsHome"));
const LabsJoin = lazy(() => import("@/labs/pages/LabsJoin"));
const LabsTastings = lazy(() => import("@/labs/pages/LabsTastings"));
const LabsTastingDetail = lazy(() => import("@/labs/pages/LabsTastingDetail"));
const LabsLive = lazy(() => import("@/labs/pages/LabsLive"));
const LabsHost = lazy(() => import("@/labs/pages/LabsHost"));
const LabsResults = lazy(() => import("@/labs/pages/LabsResults"));
const LabsTaste = lazy(() => import("@/labs/pages/LabsTaste"));
const LabsTasteProfile = lazy(() => import("@/labs/pages/LabsTasteProfile"));
const LabsTasteAnalytics = lazy(() => import("@/labs/pages/LabsTasteAnalytics"));
const LabsTasteWheel = lazy(() => import("@/labs/pages/LabsTasteWheel"));
const LabsTasteCompare = lazy(() => import("@/labs/pages/LabsTasteCompare"));
const LabsCircle = lazy(() => import("@/labs/pages/LabsCircle"));
const LabsExplore = lazy(() => import("@/labs/pages/LabsExplore"));
const LabsSolo = lazy(() => import("@/labs/pages/LabsSolo"));
const LabsBottleDetail = lazy(() => import("@/labs/pages/LabsBottleDetail"));
const LabsPaperScan = lazy(() => import("@/labs/pages/LabsPaperScan"));
const LabsTastingRecap = lazy(() => import("@/labs/pages/LabsTastingRecap"));
const LabsHostDashboard = lazy(() => import("@/labs/pages/LabsHostDashboard"));
const LabsCalendar = lazy(() => import("@/labs/pages/LabsCalendar"));
const LabsHistory = lazy(() => import("@/labs/pages/LabsHistory"));
const LabsHistoricalDetail = lazy(() => import("@/labs/pages/LabsHistoricalDetail"));
const LabsTasteDrams = lazy(() => import("@/labs/pages/LabsTasteDrams"));
const LabsTasteCollection = lazy(() => import("@/labs/pages/LabsTasteCollection"));
const LabsTasteWishlist = lazy(() => import("@/labs/pages/LabsTasteWishlist"));
const LabsTasteDownloads = lazy(() => import("@/labs/pages/LabsTasteDownloads"));
const LabsTasteSettings = lazy(() => import("@/labs/pages/LabsTasteSettings"));
const LabsRecommendations = lazy(() => import("@/labs/pages/LabsRecommendations"));
const LabsPairings = lazy(() => import("@/labs/pages/LabsPairings"));
const LabsBenchmark = lazy(() => import("@/labs/pages/LabsBenchmark"));
const LabsCollectionAnalysis = lazy(() => import("@/labs/pages/LabsCollectionAnalysis"));
const LabsConnoisseur = lazy(() => import("@/labs/pages/LabsConnoisseur"));
const LabsAICuration = lazy(() => import("@/labs/pages/LabsAICuration"));
const LabsInvite = lazy(() => import("@/labs/pages/LabsInvite"));
const LabsDiscover = lazy(() => import("@/labs/pages/LabsDiscover"));
const LabsLexicon = lazy(() => import("@/labs/pages/LabsLexicon"));
const LabsDistilleries = lazy(() => import("@/labs/pages/LabsDistilleries"));
const LabsBottlers = lazy(() => import("@/labs/pages/LabsBottlers"));
const LabsTemplates = lazy(() => import("@/labs/pages/LabsTemplates"));
const LabsGuide = lazy(() => import("@/labs/pages/LabsGuide"));
const LabsResearch = lazy(() => import("@/labs/pages/LabsResearch"));
const LabsRabbitHole = lazy(() => import("@/labs/pages/LabsRabbitHole"));
const LabsMethod = lazy(() => import("@/labs/pages/LabsMethod"));
const LabsBackground = lazy(() => import("@/labs/pages/LabsBackground"));
const LabsVocabulary = lazy(() => import("@/labs/pages/LabsVocabulary"));
const LabsAbout = lazy(() => import("@/labs/pages/LabsAbout"));
const LabsDonate = lazy(() => import("@/labs/pages/LabsDonate"));
const LabsImpressum = lazy(() => import("@/labs/pages/LabsImpressum"));
const LabsPrivacy = lazy(() => import("@/labs/pages/LabsPrivacy"));
const LabsActivityPage = lazy(() => import("@/labs/pages/LabsActivity"));
const LabsCommunity = lazy(() => import("@/labs/pages/LabsCommunity"));
const LabsMakingOf = lazy(() => import("@/labs/pages/LabsMakingOf"));
const LabsAdmin = lazy(() => import("@/labs/pages/LabsAdmin"));
const LabsOnboarding = lazy(() => import("@/labs/pages/LabsOnboarding"));
const LabsResultsPresent = lazy(() => import("@/labs/pages/LabsResultsPresent"));
import { AppShellV2 } from "@/v2/components";
import V2Home from "@/v2/pages/V2Home";
import V2Sessions from "@/v2/pages/V2Sessions";
import V2SessionDetail from "@/v2/pages/V2SessionDetail";
import V2Discover from "@/v2/pages/V2Discover";
import V2Cellar from "@/v2/pages/V2Cellar";
import V2More from "@/v2/pages/V2More";

function LazyFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
      <div style={{ width: 24, height: 24, border: "2px solid #d4a57440", borderTop: "2px solid #d4a574", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: info.componentStack?.slice(0, 1000),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        boundary: "global",
      }),
    }).catch(() => {});
    const msg = error.message || "";
    if (
      msg.includes("Loading chunk") ||
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("Unable to preload CSS")
    ) {
      const key = "cs_chunk_reload";
      const last = sessionStorage.getItem(key);
      const now = Date.now();
      if (!last || now - parseInt(last, 10) > 10000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "system-ui", color: "#e8dcc8", background: "#1a1714", minHeight: "100dvh" }}>
          <h2 style={{ color: "#d4a574", marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", color: "#ff6b6b", marginBottom: 16 }}>{this.state.error.message}</pre>
          <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "#8a8070", marginBottom: 24, maxHeight: 200, overflow: "auto" }}>{this.state.error.stack}</pre>
          <button onClick={() => { this.setState({ error: null }); window.history.back(); }} style={{ padding: "10px 20px", background: "#d4a574", color: "#1a1714", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginRight: 10 }}>Go Back</button>
          <button onClick={() => { this.setState({ error: null }); window.location.href = "/"; }} style={{ padding: "10px 20px", background: "transparent", color: "#d4a574", border: "1px solid #3a3228", borderRadius: 8, cursor: "pointer" }}>Home</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function RouteTracker() {
  const [location] = useLocation();
  useEffect(() => {
    pushRoute(location);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <RouteTracker />
      <NavRedirects />
      <Switch>
        {/* ── Public / Marketing ── */}
        <Route path="/" component={LandingNew} />
        <Route path="/landing-old" component={PublicLanding} />
        <Route path="/presentation" component={GuidedPresentation} />
        <Route path="/landing-v2" component={LandingV2} />
        <Route path="/app-entry" component={Landing} />
        <Route path="/landing">{() => <Redirect to="/" />}</Route>
        <Route path="/start">{() => <Redirect to="/" />}</Route>
        <Route path="/menu">{() => <Redirect to="/app-entry" />}</Route>
        <Route path="/feature-overview" component={FeatureOverview} />
        <Route path="/feature-tour" component={FeatureTour} />
        <Route path="/tour" component={Tour} />
        <Route path="/background" component={Background} />

        {/* ── Tasting (Tab 1): join, host, live room, results ── */}
        <Route path="/join/:code" component={QuickTasting} />
        <Route path="/tasting" component={TastingHubSimple} />
        <Route path="/tasting/join">{() => <Redirect to="/enter" />}</Route>
        <Route path="/enter" component={SimpleEnterPage} />
        <Route path="/join">{() => <Redirect to="/enter" />}</Route>
        <Route path="/tasting-room-simple/:id" component={TastingRoomSimple} />
        <Route path="/tasting-results/:id" component={TastingResultsPage} />
        <Route path="/naked/:code" component={NakedTasting} />
        <Route path="/sessions" component={SessionsDark} />
        <Route path="/host-dashboard" component={HostDashboard} />
        <Route path="/tasting-calendar">{() => <Redirect to="/sessions?view=calendar" />}</Route>
        <Route path="/host" component={SimpleHostPage} />

        {/* ── My Taste (Tab 2): personal hub + subpages ── */}
        <Route path="/my-taste/log" component={SimpleLogPage} />
        <Route path="/log-simple" component={SimpleLogPage} />
        <Route path="/log">{() => <Redirect to="/log-simple" />}</Route>
        <Route path="/my-taste/downloads" component={DownloadsExport} />
        <Route path="/my-taste/export">{() => <Redirect to="/my-taste/downloads" />}</Route>
        <Route path="/data-export">{() => <Redirect to="/my-taste/downloads" />}</Route>
        <Route path="/discover-hub">{() => <Redirect to="/my-taste" />}</Route>
        <Route path="/my-taste/knowledge">{() => <Redirect to="/my-taste" />}</Route>
        <Route path="/my-taste/community">{() => <Redirect to="/my-taste" />}</Route>
        <Route path="/my-taste/flavors">{() => <Redirect to="/my-taste/profile" />}</Route>
        <Route path="/my-taste/compare" component={MyTasteCompare} />
        <Route path="/my-taste/analytics" component={MyTasteAnalytics} />
        <Route path="/my-taste/recommendations" component={MyTasteRecommendations} />
        <Route path="/my-taste/pairings" component={MyTastePairings} />
        <Route path="/my-taste/settings" component={MyTasteSettings} />
        <Route path="/my-taste/benchmark" component={MyTasteBenchmark} />
        <Route path="/my-taste/wheel" component={MyTasteWheel} />
        <Route path="/my-taste/profile" component={FlavorProfile} />
        <Route path="/my-taste/drams" component={MyJournal} />
        <Route path="/my-taste/journal">{() => <Redirect to="/my-taste/drams" />}</Route>
        <Route path="/my-taste/collection" component={WhiskybaseCollection} />
        <Route path="/my-taste/wishlist" component={Wishlist} />
        <Route path="/my-taste" component={MyTastePage} />
        <Route path="/taste" component={MyTastePage} />
        <Route path="/analyze" component={SimpleAnalyzePage} />

        {/* ── Discover / Knowledge ── */}
        <Route path="/vocabulary" component={VocabularyDark} />
        <Route path="/ai-curation" component={AICurationDark} />
        <Route path="/guide" component={TastingGuide} />
        <Route path="/discover/guide" component={TastingGuide} />
        <Route path="/discover/templates" component={DiscoverTemplates} />
        <Route path="/discover/about" component={AboutDark} />
        <Route path="/discover/rabbit-hole" component={RabbitHole} />
        <Route path="/discover/rabbit-hole/rating-models">{() => <Redirect to="/method" />}</Route>
        <Route path="/discover/rabbit-hole/statistics">{() => <Redirect to="/background" />}</Route>
        <Route path="/discover/rabbit-hole/research">{() => <Redirect to="/research" />}</Route>
        <Route path="/research" component={ResearchStandalone} />
        <Route path="/discover/lexicon" component={DiscoverLexicon} />
        <Route path="/discover/community" component={DiscoverCommunityNative} />
        <Route path="/discover/distilleries" component={DiscoverDistilleriesNative} />
        <Route path="/discover/bottlers" component={DiscoverBottlersNative} />
        <Route path="/discover/recommendations">{() => <Redirect to="/my-taste/recommendations" />}</Route>
        <Route path="/discover/donate" component={DonateDark} />
        <Route path="/discover/activity" component={ActivityFeed} />

        {/* ── Utility / Internal ── */}
        <Route path="/internal/landing-glasses" component={InternalLandingGlasses} />
        <Route path="/simple-test" component={SimpleTestPage} />
        <Route path="/simple-feedback" component={SimpleFeedbackPage} />
        <Route path="/support">{() => <Redirect to="/admin/support" />}</Route>
        <Route path="/admin/support" component={SupportConsole} />
        <Route path="/impressum" component={Impressum} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/intro" component={Intro} />

        {/* === MODULE 2 (parallel UI, same data) === */}
        <Route path="/m2/tastings/:id/scan">
          <M2PaperScan />
        </Route>
        <Route path="/m2/tastings/session/:id/results">
          <Module2Shell><M2TastingResults /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/session/:id/dashboard">
          <Module2Shell><M2HostingDashboard /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/session/:id/host">
          <Module2Shell><M2HostControl /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/session/:id/recap">
          <Module2Shell><M2TastingRecap /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/session/:id/play">
          <Module2Shell><M2TastingPlay /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/session/:id">
          <Module2Shell><M2TastingSession /></Module2Shell>
        </Route>
        <Route path="/m2/invite/:token">
          <Module2Shell><InviteAccept m2 /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/join/:code">
          <Module2Shell><M2TastingsJoin /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/join">
          <Module2Shell><M2TastingsJoin /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/host">
          <Module2Shell><M2TastingsHost /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/host/:id">
          {(params: any) => <Module2Shell><M2TastingsHost resumeId={params.id} /></Module2Shell>}
        </Route>
        <Route path="/m2/tastings/dashboard">
          <Module2Shell><M2HostDashboard /></Module2Shell>
        </Route>
        <Route path="/m2/tastings/solo">
          <Module2Shell><M2TastingsSolo /></Module2Shell>
        </Route>
        <Route path="/m2/tastings">
          <Module2Shell><M2TastingsHome /></Module2Shell>
        </Route>
        <Route path="/m2/taste/profile">
          <Module2Shell><M2TasteProfile /></Module2Shell>
        </Route>
        <Route path="/m2/taste/analytics">
          <Module2Shell><M2TasteAnalytics /></Module2Shell>
        </Route>
        <Route path="/m2/taste/drams">
          <Module2Shell><M2TasteDrams /></Module2Shell>
        </Route>
        <Route path="/m2/taste/collection">
          <Module2Shell><M2TasteCollection /></Module2Shell>
        </Route>
        <Route path="/m2/taste/compare">
          <Module2Shell><M2TasteCompare /></Module2Shell>
        </Route>
        <Route path="/m2/taste/pairings">
          <Module2Shell><M2TastePairings /></Module2Shell>
        </Route>
        <Route path="/m2/taste/wheel">
          <Module2Shell><M2TasteWheel /></Module2Shell>
        </Route>
        <Route path="/m2/taste/downloads">
          <Redirect to="/m2/taste/settings" />
        </Route>
        <Route path="/m2/taste/recommendations">
          <Module2Shell><M2TasteRecommendations /></Module2Shell>
        </Route>
        <Route path="/m2/taste/benchmark">
          <Module2Shell><M2TasteBenchmark /></Module2Shell>
        </Route>
        <Route path="/m2/taste/collection-analysis">
          <Module2Shell><M2CollectionAnalysis /></Module2Shell>
        </Route>
        <Route path="/m2/taste/historical/insights">
          <Module2Shell><M2HistoricalInsights /></Module2Shell>
        </Route>
        <Route path="/m2/taste/historical/:id">
          <Module2Shell><M2HistoricalTastingDetail /></Module2Shell>
        </Route>
        <Route path="/m2/taste/historical">
          <Module2Shell><M2HistoricalTastings /></Module2Shell>
        </Route>
        <Route path="/m2/taste/settings">
          <Module2Shell><M2TasteSettings /></Module2Shell>
        </Route>
        <Route path="/m2/taste/connoisseur">
          <Module2Shell><M2TasteConnoisseur /></Module2Shell>
        </Route>
        <Route path="/m2/taste/wishlist">
          <Module2Shell><M2TasteWishlist /></Module2Shell>
        </Route>
        <Route path="/m2/taste">
          <Module2Shell><M2TasteHome /></Module2Shell>
        </Route>
        <Route path="/m2/discover/lexicon">
          <Module2Shell><M2DiscoverLexicon /></Module2Shell>
        </Route>
        <Route path="/m2/discover/distilleries">
          <Module2Shell><M2DiscoverDistilleries /></Module2Shell>
        </Route>
        <Route path="/m2/discover/bottlers">
          <Module2Shell><M2DiscoverBottlers /></Module2Shell>
        </Route>
        <Route path="/m2/discover/templates">
          <Module2Shell><M2DiscoverTemplates /></Module2Shell>
        </Route>
        <Route path="/m2/discover/guide">
          <Module2Shell><M2DiscoverGuide /></Module2Shell>
        </Route>
        <Route path="/m2/discover/ai-curation">
          <Module2Shell><M2DiscoverAICuration /></Module2Shell>
        </Route>
        <Route path="/m2/discover/research">
          <Module2Shell><M2DiscoverResearch /></Module2Shell>
        </Route>
        <Route path="/m2/discover/rabbit-hole">
          <Module2Shell><M2DiscoverRabbitHole /></Module2Shell>
        </Route>
        <Route path="/m2/discover/vocabulary">
          <Module2Shell><M2DiscoverVocabulary /></Module2Shell>
        </Route>
        <Route path="/m2/discover/about">
          <Module2Shell><M2DiscoverAbout /></Module2Shell>
        </Route>
        <Route path="/m2/discover/donate">
          <Module2Shell><M2DiscoverDonate /></Module2Shell>
        </Route>
        <Route path="/m2/discover/activity">
          <Module2Shell><M2DiscoverActivity /></Module2Shell>
        </Route>
        <Route path="/m2/discover/historical-insights">
          <Module2Shell><M2PublicHistoricalInsights /></Module2Shell>
        </Route>
        <Route path="/m2/discover/community">
          <Module2Shell><M2DiscoverCommunity /></Module2Shell>
        </Route>
        <Route path="/m2/discover">
          <Module2Shell><M2DiscoverHub /></Module2Shell>
        </Route>
        <Route path="/m2/circle">
          <Module2Shell><M2CircleHome /></Module2Shell>
        </Route>
        <Route path="/m2/impressum">
          <Module2Shell><M2Impressum /></Module2Shell>
        </Route>
        <Route path="/m2/privacy">
          <Module2Shell><M2Privacy /></Module2Shell>
        </Route>
        <Route path="/m2/making-of">
          <Module2Shell><M2MakingOf /></Module2Shell>
        </Route>
        <Route path="/m2/admin">
          <Module2Shell><M2Admin /></Module2Shell>
        </Route>
        <Route path="/m2">{() => <Redirect to="/m2/tastings" />}</Route>

        {/* ── Admin Backoffice (separate layout, no consumer nav) ── */}
        <Route path="/admin">
          <AdminLayout>
            <AdminPanel />
          </AdminLayout>
        </Route>

        {/* ── Hidden: V2 Dark Warm UI (standalone routes, no shell) ── */}
        <Route path="/app/join/:code" component={QuickTasting} />
        <Route path="/app/naked/:code" component={NakedTasting} />

        {/* === V2 DARK WARM UI === */}
        <Route path="/app/*">
          <AppShellV2>
            <Switch>
              <Route path="/app/home" component={V2Home} />
              <Route path="/app/sessions" component={V2Sessions} />
              <Route path="/app/session/:id" component={V2SessionDetail} />
              <Route path="/app/discover" component={V2Discover} />
              <Route path="/app/cellar" component={V2Cellar} />
              <Route path="/app/more" component={V2More} />
              <Route path="/app/admin">{() => <Redirect to="/admin" />}</Route>
              <Route path="/app/recap/:id" component={TastingRecap} />
              <Route path="/app/invite/:token" component={InviteAccept} />
              <Route path="/app">{() => <Redirect to="/app/home" />}</Route>
            </Switch>
          </AppShellV2>
        </Route>

        {/* === CASKSENSE LABS === */}
        <Route path="/labs/results/:id/present" component={LabsResultsPresent} />
        <Route path="/labs">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/labs/*">
          <LabsLayout>
            <Switch>
              <Route path="/labs/onboarding" component={LabsOnboarding} />
              <Route path="/labs/join/:code" component={LabsJoin} />
              <Route path="/labs/join" component={LabsJoin} />
              <Route path="/labs/host/dashboard" component={LabsHostDashboard} />
              <Route path="/labs/host/calendar" component={LabsCalendar} />
              <Route path="/labs/host/history/insights" component={LabsHistory} />
              <Route path="/labs/host/history/:id" component={LabsHistoricalDetail} />
              <Route path="/labs/host/history" component={LabsHistory} />
              <Route path="/labs/host/:id" component={LabsHost} />
              <Route path="/labs/host" component={LabsHost} />
              <Route path="/labs/tastings/:id/scan" component={LabsPaperScan} />
              <Route path="/labs/tastings/:id/recap" component={LabsTastingRecap} />
              <Route path="/labs/tastings/:id" component={LabsTastingDetail} />
              <Route path="/labs/tastings" component={LabsTastings} />
              <Route path="/labs/live/:id" component={LabsLive} />
              <Route path="/labs/results/:id" component={LabsResults} />
              <Route path="/labs/explore/bottles/:id" component={LabsBottleDetail} />
              <Route path="/labs/explore" component={LabsExplore} />
              <Route path="/labs/discover/lexicon" component={LabsLexicon} />
              <Route path="/labs/discover/distilleries" component={LabsDistilleries} />
              <Route path="/labs/discover/bottlers" component={LabsBottlers} />
              <Route path="/labs/discover/templates" component={LabsTemplates} />
              <Route path="/labs/discover/guide" component={LabsGuide} />
              <Route path="/labs/discover/research" component={LabsResearch} />
              <Route path="/labs/discover/rabbit-hole" component={LabsRabbitHole} />
              <Route path="/labs/discover/method" component={LabsMethod} />
              <Route path="/labs/discover/background" component={LabsBackground} />
              <Route path="/labs/discover/flavour-map" component={LabsVocabulary} />
              <Route path="/labs/discover/vocabulary">{() => { window.location.replace("/labs/discover/flavour-map"); return null; }}</Route>
              <Route path="/labs/discover" component={LabsDiscover} />
              <Route path="/labs/taste/profile" component={LabsTasteProfile} />
              <Route path="/labs/taste/analytics" component={LabsTasteAnalytics} />
              <Route path="/labs/taste/wheel" component={LabsTasteWheel} />
              <Route path="/labs/taste/compare" component={LabsTasteCompare} />
              <Route path="/labs/taste/drams" component={LabsTasteDrams} />
              <Route path="/labs/taste/collection" component={LabsTasteCollection} />
              <Route path="/labs/taste/wishlist" component={LabsTasteWishlist} />
              <Route path="/labs/taste/downloads" component={LabsTasteDownloads} />
              <Route path="/labs/taste/settings" component={LabsTasteSettings} />
              <Route path="/labs/taste/recommendations" component={LabsRecommendations} />
              <Route path="/labs/taste/pairings" component={LabsPairings} />
              <Route path="/labs/taste/benchmark" component={LabsBenchmark} />
              <Route path="/labs/taste/collection-analysis" component={LabsCollectionAnalysis} />
              <Route path="/labs/taste/connoisseur" component={LabsConnoisseur} />
              <Route path="/labs/taste/ai-curation" component={LabsAICuration} />
              <Route path="/labs/invite/:token" component={LabsInvite} />
              <Route path="/labs/taste" component={LabsTaste} />
              <Route path="/labs/circle" component={LabsCircle} />
              <Route path="/labs/solo" component={LabsSolo} />
              <Route path="/labs/about" component={LabsAbout} />
              <Route path="/labs/donate" component={LabsDonate} />
              <Route path="/labs/impressum" component={LabsImpressum} />
              <Route path="/labs/privacy" component={LabsPrivacy} />
              <Route path="/labs/activity" component={LabsActivityPage} />
              <Route path="/labs/community" component={LabsCommunity} />
              <Route path="/labs/making-of" component={LabsMakingOf} />
              <Route path="/labs/admin" component={LabsAdmin} />
              <Route path="/labs/home" component={LabsHome} />
              <Route>{() => (
                <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--labs-accent-muted)" }}>
                      <span style={{ fontSize: 24 }}>🥃</span>
                    </div>
                    <h2 className="labs-serif text-lg font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Page not found</h2>
                    <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This page doesn't exist in Labs yet.</p>
                    <a href="/labs/home" className="labs-btn-primary" data-testid="labs-404-home">Back to Labs</a>
                  </div>
                </div>
              )}</Route>
            </Switch>
          </LabsLayout>
        </Route>

        {/* === LAB DARK (experimental) === */}
        <Route path="/lab-dark/*">
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
        <Route path="/legacy/*">
          <SimpleLegacyShell>
            <Switch>
              <Route path="/legacy/home" component={HomeDashboard} />
              <Route path="/legacy/tasting" component={TastingHub} />
              <Route path="/legacy/tasting/sessions" component={TastingSessions} />
              <Route path="/legacy/tasting/calendar" component={TastingCalendar} />
              <Route path="/legacy/tasting/host" component={HostDashboard} />
              <Route path="/legacy/tasting/:id" component={TastingRoom} />
              <Route path="/legacy/my/journal">{() => <Redirect to="/my-taste/drams" />}</Route>
              <Route path="/legacy/my/collection">{() => <Redirect to="/my-taste/collection" />}</Route>
              <Route path="/legacy/my/wishlist">{() => <Redirect to="/my-taste/wishlist" />}</Route>
              <Route path="/legacy/discover" component={DiscoverHub} />
              <Route path="/legacy/discover/distilleries" component={DiscoverDistilleries} />
              <Route path="/legacy/discover/community" component={DiscoverCommunity} />
              <Route path="/legacy/discover/database">{() => <Redirect to="/discover/database" />}</Route>
              <Route path="/legacy/profile" component={Profile} />
              <Route path="/legacy/profile/account" component={Account} />
              <Route path="/legacy/profile/help" component={ProfileHelp} />
              <Route path="/legacy/admin">{() => <Redirect to="/admin" />}</Route>
              <Route path="/legacy/news" component={News} />
              <Route path="/legacy/badges" component={Badges} />
              <Route path="/legacy/flavor-profile">{() => <Redirect to="/my-taste/profile" />}</Route>
              <Route path="/legacy/flavor-wheel" component={FlavorWheel} />
              <Route path="/legacy/photo-tasting" component={PhotoTasting} />
              <Route path="/legacy/method" component={Method} />
              <Route path="/legacy/recap/:id">{(params: any) => <Redirect to={`/recap/${params.id}`} />}</Route>
              <Route path="/legacy/invite/:token" component={InviteAccept} />
              <Route path="/legacy/comparison">{() => <Redirect to="/my-taste/compare" />}</Route>
              <Route path="/legacy/tasting-templates">{() => <Redirect to="/discover/templates" />}</Route>
              <Route path="/legacy/pairings">{() => <Redirect to="/my-taste/pairings" />}</Route>
              <Route path="/legacy/benchmark">{() => <Redirect to="/my-taste/benchmark" />}</Route>
              <Route path="/legacy/analytics">{() => <Redirect to="/my-taste/analytics" />}</Route>
              <Route path="/legacy/data-export">{() => <Redirect to="/my-taste/export" />}</Route>
              <Route path="/legacy/recommendations">{() => <Redirect to="/my-taste/recommendations" />}</Route>
              <Route path="/legacy/taste-twins">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=twins" />}</Route>
              <Route path="/legacy/friends">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=friends" />}</Route>
              <Route path="/legacy/community-rankings">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=rankings" />}</Route>
              <Route path="/legacy/activity">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=activity" />}</Route>
              <Route path="/legacy/leaderboard">{() => <RedirectWithQuery to="/legacy/discover/community" query="tab=leaderboard" />}</Route>
              <Route path="/legacy/lexicon">{() => <RedirectWithQuery to="/legacy/discover" query="section=lexicon" />}</Route>
              <Route path="/legacy/distilleries">{() => <Redirect to="/legacy/discover/distilleries" />}</Route>
              <Route path="/legacy/distillery-map">{() => <RedirectWithQuery to="/legacy/discover/distilleries" query="tab=map" />}</Route>
              <Route path="/legacy/bottlers">{() => <Redirect to="/discover/bottlers" />}</Route>
              <Route path="/legacy/research">{() => <RedirectWithQuery to="/legacy/discover" query="section=research" />}</Route>
              <Route path="/legacy/about">{() => <Redirect to="/discover/about" />}</Route>
              <Route path="/legacy/features">{() => <RedirectWithQuery to="/legacy/profile/help" query="tab=features" />}</Route>
              <Route path="/legacy/donate">{() => <Redirect to="/discover/donate" />}</Route>
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
              <Route path="/my/journal">{() => <Redirect to="/my-taste/drams" />}</Route>
              <Route path="/my/collection" component={WhiskybaseCollection} />
              <Route path="/my/wishlist" component={Wishlist} />
              <Route path="/discover" component={DiscoverHub} />
              <Route path="/discover/distilleries" component={DiscoverDistilleries} />
              <Route path="/discover/community" component={DiscoverCommunity} />
              <Route path="/discover/database" component={WhiskyDatabase} />
              <Route path="/profile/account" component={Account} />
              <Route path="/profile/help" component={ProfileHelp} />
              <Route path="/profile">{() => <Redirect to="/my-taste" />}</Route>
              <Route path="/news" component={News} />
              <Route path="/badges" component={Badges} />
              <Route path="/flavor-profile" component={FlavorProfile} />
              <Route path="/flavor-wheel" component={FlavorWheel} />
              <Route path="/photo-tasting" component={PhotoTasting} />
              <Route path="/method" component={Method} />
              <Route path="/recap/:id" component={TastingRecap} />
              <Route path="/invite/:token" component={InviteAccept} />

              <Route path="/journal">{() => <Redirect to="/my-taste/drams" />}</Route>
              <Route path="/my-whiskies">{() => <RedirectWithQuery to="/my-taste/drams" query="tab=tastings" />}</Route>
              <Route path="/collection">{() => <Redirect to="/my/collection" />}</Route>
              <Route path="/wishlist">{() => <Redirect to="/my/wishlist" />}</Route>
              <Route path="/recap">{() => <RedirectWithQuery to="/my-taste/drams" query="tab=tastings" />}</Route>
              <Route path="/my-tastings">{() => <RedirectWithQuery to="/tasting/sessions" query="tab=mine" />}</Route>
              <Route path="/export-notes">{() => <Redirect to="/my-taste/export" />}</Route>
              <Route path="/calendar">{() => <Redirect to="/tasting/calendar" />}</Route>
              <Route path="/comparison">{() => <Redirect to="/my-taste/compare" />}</Route>
              <Route path="/tasting-templates">{() => <RedirectWithQuery to="/tasting" query="tab=templates" />}</Route>
              <Route path="/pairings">{() => <RedirectWithQuery to="/tasting" query="tab=pairings" />}</Route>
              <Route path="/benchmark">{() => <Redirect to="/my-taste/benchmark" />}</Route>
              <Route path="/whisky-database">{() => <Redirect to="/discover/database" />}</Route>
              <Route path="/analytics">{() => <Redirect to="/my-taste/analytics" />}</Route>
              <Route path="/recommendations">{() => <Redirect to="/my-taste/recommendations" />}</Route>
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
              <Route path="/research" component={ResearchStandalone} />
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
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Router />
          <StorageConsent />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
