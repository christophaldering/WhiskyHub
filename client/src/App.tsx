import { Switch, Route, useLocation, useSearch } from "wouter";
import { useEffect, Component, type ReactNode, type ErrorInfo, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
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

import LandingNew from "@/pages/landing-new";
import PublicLanding from "@/pages/public-landing";
import FeatureOverview from "@/pages/feature-overview";
import QuickTasting from "@/pages/quick-tasting";
import NakedTasting from "@/pages/naked-tasting";
import TastingRoomSimple from "@/pages/tasting-room-simple";
import TastingResultsPage from "@/pages/tasting-results";
import Impressum from "@/pages/impressum";
import Privacy from "@/pages/privacy";

const GuidedPresentation = lazy(() => import("@/pages/guided-presentation"));
const LandingV2 = lazy(() => import("@/pages/landing-v2"));
const FeatureShowcase = lazy(() => import("@/pages/feature-showcase"));
const FeatureTour = lazy(() => import("@/pages/feature-tour"));
const Tour = lazy(() => import("@/pages/tour"));
const Background = lazy(() => import("@/pages/background"));
const Intro = lazy(() => import("@/pages/intro"));
const AdminPanel = lazy(() => import("@/pages/admin-panel"));
const SupportConsole = lazy(() => import("@/pages/support-console"));
const Landing = lazy(() => import("@/pages/landing"));
const SimpleFeedbackPage = lazy(() => import("@/pages/simple-feedback"));
const SimpleTestPage = lazy(() => import("@/pages/simple-test"));
const InternalLandingGlasses = lazy(() => import("@/pages/internal-landing-glasses"));

import AdminLayout from "@/components/admin/AdminLayout";

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

function SmartRedirectToLabs() {
  const [location] = useLocation();

  const mapping: Record<string, string> = {
    "/tasting": "/labs/tastings",
    "/enter": "/labs/join",
    "/join": "/labs/join",
    "/sessions": "/labs/tastings",
    "/host": "/labs/host",
    "/host-dashboard": "/labs/host/dashboard",
    "/tasting-calendar": "/labs/host/calendar",
    "/taste": "/labs/taste",
    "/analyze": "/labs/tastings",
    "/log": "/labs/taste/drams",
    "/log-simple": "/labs/taste/drams",
    "/my-taste": "/labs/taste",
    "/my-taste/log": "/labs/taste/drams",
    "/my-taste/drams": "/labs/taste/drams",
    "/my-taste/journal": "/labs/taste/drams",
    "/my-taste/collection": "/labs/taste/collection",
    "/my-taste/wishlist": "/labs/taste/wishlist",
    "/my-taste/profile": "/labs/taste/profile",
    "/my-taste/flavors": "/labs/taste/profile",
    "/my-taste/analytics": "/labs/taste/analytics",
    "/my-taste/compare": "/labs/taste/compare",
    "/my-taste/benchmark": "/labs/taste/benchmark",
    "/my-taste/wheel": "/labs/taste/wheel",
    "/my-taste/recommendations": "/labs/taste/recommendations",
    "/my-taste/pairings": "/labs/taste/pairings",
    "/my-taste/settings": "/labs/taste/settings",
    "/my-taste/downloads": "/labs/taste/downloads",
    "/my-taste/export": "/labs/taste/downloads",
    "/my-taste/knowledge": "/labs/taste",
    "/my-taste/community": "/labs/community",
    "/vocabulary": "/labs/discover/flavour-map",
    "/ai-curation": "/labs/taste/ai-curation",
    "/guide": "/labs/discover/guide",
    "/research": "/labs/discover/research",
    "/discover": "/labs/discover",
    "/discover/guide": "/labs/discover/guide",
    "/discover/templates": "/labs/discover/templates",
    "/discover/about": "/labs/about",
    "/discover/rabbit-hole": "/labs/discover/rabbit-hole",
    "/discover/lexicon": "/labs/discover/lexicon",
    "/discover/community": "/labs/community",
    "/discover/distilleries": "/labs/discover/distilleries",
    "/discover/bottlers": "/labs/discover/bottlers",
    "/discover/donate": "/labs/donate",
    "/discover/activity": "/labs/activity",
    "/discover/recommendations": "/labs/taste/recommendations",
    "/discover/database": "/labs/explore",
    "/discover-hub": "/labs/discover",
    "/data-export": "/labs/taste/downloads",
    "/home": "/labs/home",
    "/tasting/sessions": "/labs/tastings",
    "/tasting/calendar": "/labs/host/calendar",
    "/tasting/host": "/labs/host/dashboard",
    "/tasting/join": "/labs/join",
    "/profile": "/labs/taste",
    "/profile/account": "/labs/taste/settings",
    "/profile/help": "/labs/about",
    "/news": "/labs/activity",
    "/badges": "/labs/taste",
    "/flavor-profile": "/labs/taste/profile",
    "/flavor-wheel": "/labs/taste/wheel",
    "/photo-tasting": "/labs/tastings",
    "/method": "/labs/discover/method",
    "/journal": "/labs/taste/drams",
    "/my-whiskies": "/labs/taste/drams",
    "/collection": "/labs/taste/collection",
    "/wishlist": "/labs/taste/wishlist",
    "/recap": "/labs/tastings",
    "/my-tastings": "/labs/tastings",
    "/export-notes": "/labs/taste/downloads",
    "/calendar": "/labs/host/calendar",
    "/comparison": "/labs/taste/compare",
    "/tasting-templates": "/labs/discover/templates",
    "/pairings": "/labs/taste/pairings",
    "/benchmark": "/labs/taste/benchmark",
    "/whisky-database": "/labs/explore",
    "/analytics": "/labs/taste/analytics",
    "/recommendations": "/labs/taste/recommendations",
    "/taste-twins": "/labs/community",
    "/friends": "/labs/community",
    "/community-rankings": "/labs/community",
    "/activity": "/labs/activity",
    "/leaderboard": "/labs/community",
    "/account": "/labs/taste/settings",
    "/lexicon": "/labs/discover/lexicon",
    "/distilleries": "/labs/discover/distilleries",
    "/distillery-map": "/labs/discover/distilleries",
    "/bottlers": "/labs/discover/bottlers",
    "/help": "/labs/about",
    "/about": "/labs/about",
    "/features": "/labs/about",
    "/donate": "/labs/donate",
    "/reminders": "/labs/tastings",
    "/simple-host": "/labs/host",
  };

  if (mapping[location]) {
    return <Redirect to={mapping[location]} />;
  }

  const tastingMatch = location.match(/^\/tasting\/([0-9a-f-]+)$/);
  if (tastingMatch) {
    return <Redirect to={`/labs/tastings/${tastingMatch[1]}`} />;
  }

  const recapMatch = location.match(/^\/recap\/([0-9a-f-]+)$/);
  if (recapMatch) {
    return <Redirect to={`/labs/tastings/${recapMatch[1]}/recap`} />;
  }

  const inviteMatch = location.match(/^\/invite\/(.+)$/);
  if (inviteMatch) {
    return <Redirect to={`/labs/invite/${inviteMatch[1]}`} />;
  }

  if (location.startsWith("/my-taste/")) {
    return <Redirect to="/labs/taste" />;
  }

  if (location.startsWith("/discover/")) {
    return <Redirect to="/labs/discover" />;
  }

  return <Redirect to="/labs/tastings" />;
}

function Router() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <RouteTracker />
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

        {/* ── Standalone tasting pages (no shell) ── */}
        <Route path="/join/:code" component={QuickTasting} />
        <Route path="/naked/:code" component={NakedTasting} />
        <Route path="/tasting-room-simple/:id" component={TastingRoomSimple} />
        <Route path="/tasting-results/:id" component={TastingResultsPage} />

        {/* ── Utility / Internal ── */}
        <Route path="/internal/landing-glasses" component={InternalLandingGlasses} />
        <Route path="/simple-test" component={SimpleTestPage} />
        <Route path="/simple-feedback" component={SimpleFeedbackPage} />
        <Route path="/support">{() => <Redirect to="/admin/support" />}</Route>
        <Route path="/admin/support" component={SupportConsole} />
        <Route path="/impressum" component={Impressum} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/intro" component={Intro} />

        {/* ── Admin Backoffice ── */}
        <Route path="/admin">
          <AdminLayout>
            <AdminPanel />
          </AdminLayout>
        </Route>

        {/* ── Archived M2/V2/lab-dark → redirect to Labs ── */}
        <Route path="/m2/tastings/session/:id/results">{(params: any) => <Redirect to={`/labs/results/${params.id}`} />}</Route>
        <Route path="/m2/tastings/session/:id/dashboard">{(params: any) => <Redirect to={`/labs/host/${params.id}`} />}</Route>
        <Route path="/m2/tastings/session/:id/host">{(params: any) => <Redirect to={`/labs/host/${params.id}`} />}</Route>
        <Route path="/m2/tastings/session/:id/recap">{(params: any) => <Redirect to={`/labs/tastings/${params.id}/recap`} />}</Route>
        <Route path="/m2/tastings/session/:id/play">{(params: any) => <Redirect to={`/labs/live/${params.id}`} />}</Route>
        <Route path="/m2/tastings/session/:id">{(params: any) => <Redirect to={`/labs/tastings/${params.id}`} />}</Route>
        <Route path="/m2/tastings/join/:code">{(params: any) => <Redirect to={`/labs/join/${params.code}`} />}</Route>
        <Route path="/m2/tastings/:id/scan">{(params: any) => <Redirect to={`/labs/tastings/${params.id}/scan`} />}</Route>
        <Route path="/m2/invite/:token">{(params: any) => <Redirect to={`/labs/invite/${params.token}`} />}</Route>
        <Route path="/m2/tastings/host/:id">{(params: any) => <Redirect to={`/labs/host/${params.id}`} />}</Route>
        <Route path="/m2/tastings/host">{() => <Redirect to="/labs/host" />}</Route>
        <Route path="/m2/tastings/dashboard">{() => <Redirect to="/labs/host/dashboard" />}</Route>
        <Route path="/m2/tastings/solo">{() => <Redirect to="/labs/solo" />}</Route>
        <Route path="/m2/tastings">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/m2/taste/profile">{() => <Redirect to="/labs/taste/profile" />}</Route>
        <Route path="/m2/taste/analytics">{() => <Redirect to="/labs/taste/analytics" />}</Route>
        <Route path="/m2/taste/drams">{() => <Redirect to="/labs/taste/drams" />}</Route>
        <Route path="/m2/taste/collection">{() => <Redirect to="/labs/taste/collection" />}</Route>
        <Route path="/m2/taste/compare">{() => <Redirect to="/labs/taste/compare" />}</Route>
        <Route path="/m2/taste/pairings">{() => <Redirect to="/labs/taste/pairings" />}</Route>
        <Route path="/m2/taste/wheel">{() => <Redirect to="/labs/taste/wheel" />}</Route>
        <Route path="/m2/taste/recommendations">{() => <Redirect to="/labs/taste/recommendations" />}</Route>
        <Route path="/m2/taste/benchmark">{() => <Redirect to="/labs/taste/benchmark" />}</Route>
        <Route path="/m2/taste/collection-analysis">{() => <Redirect to="/labs/taste/collection-analysis" />}</Route>
        <Route path="/m2/taste/connoisseur">{() => <Redirect to="/labs/taste/connoisseur" />}</Route>
        <Route path="/m2/taste/wishlist">{() => <Redirect to="/labs/taste/wishlist" />}</Route>
        <Route path="/m2/taste/settings">{() => <Redirect to="/labs/taste/settings" />}</Route>
        <Route path="/m2/taste/historical/insights">{() => <Redirect to="/labs/host/history/insights" />}</Route>
        <Route path="/m2/taste/historical/:id">{(params: any) => <Redirect to={`/labs/host/history/${params.id}`} />}</Route>
        <Route path="/m2/taste/historical">{() => <Redirect to="/labs/host/history" />}</Route>
        <Route path="/m2/taste">{() => <Redirect to="/labs/taste" />}</Route>
        <Route path="/m2/discover/lexicon">{() => <Redirect to="/labs/discover/lexicon" />}</Route>
        <Route path="/m2/discover/distilleries">{() => <Redirect to="/labs/discover/distilleries" />}</Route>
        <Route path="/m2/discover/bottlers">{() => <Redirect to="/labs/discover/bottlers" />}</Route>
        <Route path="/m2/discover/templates">{() => <Redirect to="/labs/discover/templates" />}</Route>
        <Route path="/m2/discover/guide">{() => <Redirect to="/labs/discover/guide" />}</Route>
        <Route path="/m2/discover/research">{() => <Redirect to="/labs/discover/research" />}</Route>
        <Route path="/m2/discover/rabbit-hole">{() => <Redirect to="/labs/discover/rabbit-hole" />}</Route>
        <Route path="/m2/discover/vocabulary">{() => <Redirect to="/labs/discover/flavour-map" />}</Route>
        <Route path="/m2/discover/about">{() => <Redirect to="/labs/about" />}</Route>
        <Route path="/m2/discover/donate">{() => <Redirect to="/labs/donate" />}</Route>
        <Route path="/m2/discover/activity">{() => <Redirect to="/labs/activity" />}</Route>
        <Route path="/m2/discover/community">{() => <Redirect to="/labs/community" />}</Route>
        <Route path="/m2/discover">{() => <Redirect to="/labs/discover" />}</Route>
        <Route path="/m2/circle">{() => <Redirect to="/labs/circle" />}</Route>
        <Route path="/m2/impressum">{() => <Redirect to="/labs/impressum" />}</Route>
        <Route path="/m2/privacy">{() => <Redirect to="/labs/privacy" />}</Route>
        <Route path="/m2/making-of">{() => <Redirect to="/labs/making-of" />}</Route>
        <Route path="/m2/admin">{() => <Redirect to="/labs/admin" />}</Route>
        <Route path="/m2/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/app/join/:code">{(params: any) => <Redirect to={`/labs/join/${params.code}`} />}</Route>
        <Route path="/app/naked/:code">{(params: any) => <Redirect to={`/naked/${params.code}`} />}</Route>
        <Route path="/app/session/:id">{(params: any) => <Redirect to={`/labs/tastings/${params.id}`} />}</Route>
        <Route path="/app/invite/:token">{(params: any) => <Redirect to={`/labs/invite/${params.token}`} />}</Route>
        <Route path="/app/recap/:id">{(params: any) => <Redirect to={`/labs/tastings/${params.id}/recap`} />}</Route>
        <Route path="/app/home">{() => <Redirect to="/labs/home" />}</Route>
        <Route path="/app/sessions">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/app/discover">{() => <Redirect to="/labs/discover" />}</Route>
        <Route path="/app/cellar">{() => <Redirect to="/labs/taste/collection" />}</Route>
        <Route path="/app/more">{() => <Redirect to="/labs/taste" />}</Route>
        <Route path="/app/admin">{() => <Redirect to="/admin" />}</Route>
        <Route path="/app/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/lab-dark/home">{() => <Redirect to="/labs/home" />}</Route>
        <Route path="/lab-dark/sessions">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/lab-dark/discover">{() => <Redirect to="/labs/discover" />}</Route>
        <Route path="/lab-dark/session/:id">{(params: any) => <Redirect to={`/labs/tastings/${params.id}`} />}</Route>
        <Route path="/lab-dark/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/home">{() => <Redirect to="/labs/home" />}</Route>
        <Route path="/legacy/tasting/sessions">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/tasting/calendar">{() => <Redirect to="/labs/host/calendar" />}</Route>
        <Route path="/legacy/tasting/host">{() => <Redirect to="/labs/host/dashboard" />}</Route>
        <Route path="/legacy/tasting/:id">{(params: any) => <Redirect to={`/labs/tastings/${params.id}`} />}</Route>
        <Route path="/legacy/tasting">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/discover">{() => <Redirect to="/labs/discover" />}</Route>
        <Route path="/legacy/profile">{() => <Redirect to="/labs/taste" />}</Route>
        <Route path="/legacy/admin">{() => <Redirect to="/admin" />}</Route>
        <Route path="/legacy/invite/:token">{(params: any) => <Redirect to={`/labs/invite/${params.token}`} />}</Route>
        <Route path="/legacy/recap/:id">{(params: any) => <Redirect to={`/labs/tastings/${params.id}/recap`} />}</Route>
        <Route path="/legacy/*">{() => <Redirect to="/labs/tastings" />}</Route>

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

        {/* ── Catch-all: redirect all remaining old routes to Labs ── */}
        <Route>
          <SmartRedirectToLabs />
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
