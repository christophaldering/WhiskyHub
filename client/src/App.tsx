import { Switch, Route, useLocation } from "wouter";
import { useEffect, useRef, Component, type ReactNode, type ErrorInfo, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StorageConsent } from "@/components/storage-consent";
import UpdateBanner from "@/components/UpdateBanner";
import "@/lib/i18n";
import { pushRoute, incrementNavIdx, saveScrollPosition, getScrollPosition, consumeBackNavigation } from "@/lib/navStack";
import { trackingApi } from "@/lib/api";

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason?.message || event.reason || "");
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS") ||
    msg.includes("is not a valid JavaScript MIME type")
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
import FunnelLivePage from "@/pages/admin/funnel-live";
import PublicLanding from "@/pages/public-landing";
import FeatureOverview from "@/pages/feature-overview";
import QuickTasting from "@/pages/quick-tasting";
import NakedTasting from "@/pages/naked-tasting";
import TastingRoomSimple from "@/pages/tasting-room-simple";
import TastingResultsPage from "@/pages/tasting-results";
import Impressum from "@/pages/impressum";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

const GuidedPresentation = lazy(() => import("@/pages/guided-presentation"));
const LandingV2 = lazy(() => import("@/pages/landing-v2"));
const FeatureTour = lazy(() => import("@/pages/feature-tour"));
const Tour = lazy(() => import("@/pages/tour"));
const Background = lazy(() => import("@/pages/background"));
const Intro = lazy(() => import("@/pages/intro"));
const AdminPanel = lazy(() => import("@/pages/admin-panel"));
const AdminDistilleryAliases = lazy(() => import("@/pages/admin-distillery-aliases"));
const SupportConsole = lazy(() => import("@/pages/support-console"));
const Landing = lazy(() => import("@/pages/landing"));
const SimpleFeedbackPage = lazy(() => import("@/pages/simple-feedback"));
const SimpleTestPage = lazy(() => import("@/pages/simple-test"));
const InternalLandingGlasses = lazy(() => import("@/pages/internal-landing-glasses"));
const AuthPage = lazy(() => import("@/pages/login-page"));
const AuthMagicPage = lazy(() => import("@/pages/auth-magic-page"));

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
const LabsCircle = lazy(() => import("@/labs/pages/LabsCircle"));
const LabsFairMode = lazy(() => import("@/labs/pages/LabsFairMode"));
const LabsBottleDetail = lazy(() => import("@/labs/pages/LabsBottleDetail"));
const LabsPaperScan = lazy(() => import("@/labs/pages/LabsPaperScan"));
const LabsTastingRecap = lazy(() => import("@/labs/pages/LabsTastingRecap"));
const LabsHostDashboard = lazy(() => import("@/labs/pages/LabsHostDashboard"));
const LabsCalendar = lazy(() => import("@/labs/pages/LabsCalendar"));
const LabsHistory = lazy(() => import("@/labs/pages/LabsHistory"));
const LabsHistoricalDetail = lazy(() => import("@/labs/pages/LabsHistoricalDetail"));
const LabsTasteSettings = lazy(() => import("@/labs/pages/LabsTasteSettings"));
const LabsPairings = lazy(() => import("@/labs/pages/LabsPairings"));
const LabsBottleSharingDetail = lazy(() => import("@/labs/pages/LabsBottleSharingDetail"));
const LabsBottleSplit = lazy(() => import("@/labs/pages/LabsBottleSplit"));
const LabsBottleSplitDetail = lazy(() => import("@/labs/pages/LabsBottleSplitDetail"));
const LabsInvite = lazy(() => import("@/labs/pages/LabsInvite"));
const LabsEntdecken = lazy(() => import("@/labs/pages/LabsEntdecken"));
const LabsBatchImport = lazy(() => import("@/labs/pages/LabsBatchImport"));
const LabsIdeaBehindNumbers = lazy(() => import("@/labs/pages/LabsIdeaBehindNumbers"));
const LabsTestTheory = lazy(() => import("@/labs/pages/LabsTestTheory"));
const LabsStatisticalMethods = lazy(() => import("@/labs/pages/LabsStatisticalMethods"));
const LabsLiterature = lazy(() => import("@/labs/pages/LabsLiterature"));
const LabsImpressum = lazy(() => import("@/labs/pages/LabsImpressum"));
const LabsPrivacy = lazy(() => import("@/labs/pages/LabsPrivacy"));
const LabsTerms = lazy(() => import("@/labs/pages/LabsTerms"));
const LabsActivityPage = lazy(() => import("@/labs/pages/LabsActivity"));
const LabsCommunity = lazy(() => import("@/labs/pages/LabsCommunity"));
const LabsCommunityDetail = lazy(() => import("@/labs/pages/LabsCommunityDetail"));
const LabsMakingOf = lazy(() => import("@/labs/pages/LabsMakingOf"));
const LabsAdmin = lazy(() => import("@/labs/pages/LabsAdmin"));
const LabsOnboarding = lazy(() => import("@/labs/pages/LabsOnboarding"));
const LabsResultsPresent = lazy(() => import("@/labs/pages/LabsResultsPresent"));
const LabsAiImages = lazy(() => import("@/labs/pages/LabsAiImages"));


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
      msg.includes("Unable to preload CSS") ||
      msg.includes("is not a valid JavaScript MIME type")
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

const pageViewBuffer: Array<{ pagePath: string; referrerPath?: string; timestamp: number; durationSeconds?: number }> = [];
let lastPagePath: string | null = null;
let lastPageTimestamp: number = Date.now();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastBufferIndex: number = -1;

function flushPageViews() {
  if (pageViewBuffer.length === 0) return;
  const batch = pageViewBuffer.splice(0, pageViewBuffer.length);
  lastBufferIndex = -1;
  trackingApi.sendPageViews(batch);
}

function setDurationOnLastEntry() {
  if (lastBufferIndex >= 0 && lastBufferIndex < pageViewBuffer.length) {
    const entry = pageViewBuffer[lastBufferIndex];
    if (entry && !entry.durationSeconds) {
      entry.durationSeconds = Math.round((Date.now() - lastPageTimestamp) / 1000);
    }
  }
}

function trackPageView(path: string) {
  const now = Date.now();
  if (lastPagePath && lastPagePath !== path) {
    setDurationOnLastEntry();
  }
  pageViewBuffer.push({ pagePath: path, referrerPath: lastPagePath || undefined, timestamp: now });
  lastBufferIndex = pageViewBuffer.length - 1;
  lastPagePath = path;
  lastPageTimestamp = now;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushPageViews, 7000);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      setDurationOnLastEntry();
      flushPageViews();
    } else if (document.visibilityState === "visible") {
      lastPageTimestamp = Date.now();
    }
  });
  window.addEventListener("beforeunload", () => {
    setDurationOnLastEntry();
    flushPageViews();
  });
}

function RouteTracker() {
  const [location] = useLocation();
  const utmSentRef = useRef(false);
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);
  useEffect(() => {
    pushRoute(location);
    incrementNavIdx();
    trackPageView(location);
    import("@/lib/funnelTracker").then(m => {
      m.startGlobalTracker();
      m.trackPageView(location);
      if (location === "/" || location.startsWith("/labs") || location.startsWith("/landing")) {
        m.trackEvent("landing_view", { live: { type: "page_view", detail: location } });
      }
    }).catch(() => {});
  }, [location]);
  useEffect(() => {
    if (utmSentRef.current) return;
    utmSentRef.current = true;
    const FIRST_VISIT_KEY = "cs_first_visit_tracked";
    if (localStorage.getItem(FIRST_VISIT_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const referrer = document.referrer || "";
    const isExternal = referrer && !referrer.includes(window.location.hostname);
    const body: Record<string, string> = {
      landingPage: location,
      referrer,
    };
    if (utmSource) body.utmSource = utmSource;
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    if (utmMedium) body.utmMedium = utmMedium;
    if (utmCampaign) body.utmCampaign = utmCampaign;
    if (!utmSource && !isExternal) body.utmSource = "direct";
    const pid = sessionStorage.getItem("session_pid") || localStorage.getItem("casksense_participant_id");
    if (pid) body.participantId = pid;
    localStorage.setItem(FIRST_VISIT_KEY, "1");
    fetch("/api/analytics/utm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, []);
  return null;
}

function ScrollRestoration() {
  const [location] = useLocation();
  const prevLocationRef = useRef(location);

  useEffect(() => {
    if (prevLocationRef.current !== location) {
      const mainEl = document.querySelector("main");
      const mainScroll = mainEl ? mainEl.scrollTop : 0;
      const winScroll = window.scrollY;
      saveScrollPosition(prevLocationRef.current, mainScroll > 0 ? mainScroll : winScroll);
      prevLocationRef.current = location;

      const isBack = consumeBackNavigation();
      const savedY = isBack ? getScrollPosition(location) : null;

      if (savedY != null && savedY > 0) {
        let attempts = 0;
        const maxAttempts = 80;
        const tryScroll = () => {
          const mainEl = document.querySelector("main");
          const docHeight = mainEl
            ? mainEl.scrollHeight
            : document.documentElement.scrollHeight;
          const viewportHeight = mainEl
            ? mainEl.clientHeight
            : window.innerHeight;
          const canScroll = docHeight >= savedY + viewportHeight * 0.3;
          if (canScroll || attempts >= maxAttempts) {
            if (mainEl) mainEl.scrollTop = savedY;
            window.scrollTo(0, savedY);
            requestAnimationFrame(() => {
              const currentScroll = mainEl ? mainEl.scrollTop : window.scrollY;
              if (Math.abs(currentScroll - savedY) > 2) {
                if (mainEl) mainEl.scrollTop = savedY;
                window.scrollTo(0, savedY);
              }
            });
            return;
          }
          attempts++;
          const delay = attempts < 20 ? 16 : attempts < 50 ? 50 : 100;
          requestAnimationFrame(() => setTimeout(tryScroll, delay));
        };
        requestAnimationFrame(tryScroll);
      } else {
        const mainEl = document.querySelector("main");
        if (mainEl) mainEl.scrollTop = 0;
        window.scrollTo(0, 0);
      }
    }
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
    "/my-taste/benchmark": "/labs/taste?tab=analytics&sub=benchmark",
    "/my-taste/wheel": "/labs/taste/wheel",
    "/my-taste/recommendations": "/labs/taste/recommendations",
    "/my-taste/pairings": "/labs/taste/pairings",
    "/my-taste/settings": "/labs/taste/settings",
    "/my-taste/downloads": "/labs/taste/downloads",
    "/my-taste/export": "/labs/taste/downloads",
    "/my-taste/knowledge": "/labs/taste",
    "/my-taste/community": "/labs/community",
    "/vocabulary": "/labs/explore?tab=whiskies&view=flavour-map",
    "/ai-curation": "/labs/taste/ai-curation",
    "/guide": "/labs/explore?tab=bibliothek&section=tasting-wissen&sub=guide",
    "/research": "/labs/explore?tab=bibliothek&section=tasting-wissen&sub=research",
    "/discover": "/labs/explore",
    "/discover/guide": "/labs/explore?tab=bibliothek&section=tasting-wissen&sub=guide",
    "/discover/templates": "/labs/discover/lexicon?tab=templates",
    "/discover/about": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
    "/discover/rabbit-hole": "/labs/explore?tab=bibliothek&section=rabbit-hole&sub=themenspeicher",
    "/discover/lexicon": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=lexikon",
    "/discover/community": "/labs/community",
    "/discover/distilleries": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=destillerien",
    "/discover/bottlers": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=bottlers",
    "/discover/donate": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
    "/discover/activity": "/labs/activity",
    "/discover/recommendations": "/labs/taste/recommendations",
    "/discover/database": "/labs/explore",
    "/discover-hub": "/labs/explore",
    "/data-export": "/labs/taste/downloads",
    "/home": "/labs/tastings",
    "/tasting/sessions": "/labs/tastings",
    "/tasting/calendar": "/labs/host/calendar",
    "/tasting/host": "/labs/host/dashboard",
    "/tasting/join": "/labs/join",
    "/profile": "/labs/taste",
    "/profile/account": "/labs/taste/settings",
    "/profile/help": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
    "/news": "/labs/activity",
    "/badges": "/labs/taste",
    "/flavor-profile": "/labs/taste/profile",
    "/flavor-wheel": "/labs/taste/wheel",
    "/photo-tasting": "/labs/tastings",
    "/method": "/labs/explore?tab=bibliothek&section=tasting-wissen&sub=profilberechnung",
    "/journal": "/labs/taste/drams",
    "/my-whiskies": "/labs/taste/drams",
    "/collection": "/labs/taste/collection",
    "/wishlist": "/labs/taste/wishlist",
    "/recap": "/labs/tastings",
    "/my-tastings": "/labs/tastings",
    "/export-notes": "/labs/taste/downloads",
    "/calendar": "/labs/host/calendar",
    "/comparison": "/labs/taste/compare",
    "/tasting-templates": "/labs/discover/lexicon?tab=templates",
    "/pairings": "/labs/taste/pairings",
    "/benchmark": "/labs/taste?tab=analytics&sub=benchmark",
    "/whisky-database": "/labs/explore",
    "/analytics": "/labs/taste/analytics",
    "/recommendations": "/labs/taste/recommendations",
    "/taste-twins": "/labs/community",
    "/friends": "/labs/community",
    "/community-rankings": "/labs/community",
    "/activity": "/labs/activity",
    "/leaderboard": "/labs/community",
    "/account": "/labs/taste/settings",
    "/lexicon": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=lexikon",
    "/distilleries": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=destillerien",
    "/distillery-map": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=destillerien",
    "/bottlers": "/labs/explore?tab=bibliothek&section=nachschlagewerk&sub=bottlers",
    "/help": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
    "/about": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
    "/features": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
    "/donate": "/labs/explore?tab=bibliothek&section=ueber-casksense&sub=about",
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
    return <Redirect to="/labs/explore" />;
  }

  return <Redirect to="/labs/tastings" />;
}

function Router() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <RouteTracker />
      <ScrollRestoration />
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
        <Route path="/terms" component={Terms} />
        <Route path="/intro" component={Intro} />
        <Route path="/login">{() => <AuthPage initialTab="signin" />}</Route>
        <Route path="/register">{() => <AuthPage initialTab="register" />}</Route>
        <Route path="/auth/magic">{() => <AuthMagicPage />}</Route>
        <Route path="/signin">{() => <Redirect to="/login" />}</Route>
        <Route path="/signup">{() => <Redirect to="/register" />}</Route>

        {/* ── Admin Backoffice ── */}
        <Route path="/admin/funnel-live">
          <AdminLayout>
            <FunnelLivePage />
          </AdminLayout>
        </Route>
        <Route path="/admin/distillery-aliases">
          <AdminLayout>
            <AdminDistilleryAliases />
          </AdminLayout>
        </Route>
        <Route path="/admin">
          <AdminLayout>
            <AdminPanel />
          </AdminLayout>
        </Route>

        {/* ── Archived M2/V2/lab-dark → redirect to Labs ── */}
        <Route path="/m2/tastings/session/:id/results">{({ id }: { id: string }) => <Redirect to={`/labs/results/${id}`} />}</Route>
        <Route path="/m2/tastings/session/:id/dashboard">{({ id }: { id: string }) => <Redirect to={`/labs/host/${id}`} />}</Route>
        <Route path="/m2/tastings/session/:id/host">{({ id }: { id: string }) => <Redirect to={`/labs/host/${id}`} />}</Route>
        <Route path="/m2/tastings/session/:id/recap">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}/recap`} />}</Route>
        <Route path="/m2/tastings/session/:id/play">{({ id }: { id: string }) => <Redirect to={`/labs/live/${id}`} />}</Route>
        <Route path="/m2/tastings/session/:id">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}`} />}</Route>
        <Route path="/m2/tastings/join/:code">{({ code }: { code: string }) => <Redirect to={`/labs/join/${code}`} />}</Route>
        <Route path="/m2/tastings/:id/scan">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}/scan`} />}</Route>
        <Route path="/m2/invite/:token">{({ token }: { token: string }) => <Redirect to={`/labs/invite/${token}`} />}</Route>
        <Route path="/m2/tastings/host/:id">{({ id }: { id: string }) => <Redirect to={`/labs/host/${id}`} />}</Route>
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
        <Route path="/m2/taste/historical/:id">{({ id }: { id: string }) => <Redirect to={`/labs/host/history/${id}`} />}</Route>
        <Route path="/m2/taste/historical">{() => <Redirect to="/labs/host/history" />}</Route>
        <Route path="/m2/taste">{() => <Redirect to="/labs/taste" />}</Route>
        <Route path="/m2/discover/lexicon">{() => <Redirect to="/labs/discover/lexicon" />}</Route>
        <Route path="/m2/discover/distilleries">{() => <Redirect to="/labs/discover/distilleries" />}</Route>
        <Route path="/m2/discover/bottlers">{() => <Redirect to="/labs/discover/bottlers" />}</Route>
        <Route path="/m2/discover/templates">{() => <Redirect to="/labs/discover/lexicon?tab=templates" />}</Route>
        <Route path="/m2/discover/guide">{() => <Redirect to="/labs/discover/guide" />}</Route>
        <Route path="/m2/discover/research">{() => <Redirect to="/labs/discover/research" />}</Route>
        <Route path="/m2/discover/rabbit-hole">{() => <Redirect to="/labs/discover/rabbit-hole/themenspeicher" />}</Route>
        <Route path="/m2/discover/vocabulary">{() => <Redirect to="/labs/discover/lexicon?tab=flavour-map" />}</Route>
        <Route path="/m2/discover/about">{() => <Redirect to="/labs/about" />}</Route>
        <Route path="/m2/discover/donate">{() => <Redirect to="/labs/about#support" />}</Route>
        <Route path="/m2/discover/activity">{() => <Redirect to="/labs/activity" />}</Route>
        <Route path="/m2/discover/community">{() => <Redirect to="/labs/community" />}</Route>
        <Route path="/m2/discover">{() => <Redirect to="/labs/explore" />}</Route>
        <Route path="/m2/circle">{() => <Redirect to="/labs/circle" />}</Route>
        <Route path="/m2/impressum">{() => <Redirect to="/labs/impressum" />}</Route>
        <Route path="/m2/privacy">{() => <Redirect to="/labs/privacy" />}</Route>
        <Route path="/m2/making-of">{() => <Redirect to="/labs/making-of" />}</Route>
        <Route path="/m2/admin">{() => <Redirect to="/labs/admin" />}</Route>
        <Route path="/m2/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/app/join/:code">{({ code }: { code: string }) => <Redirect to={`/labs/join/${code}`} />}</Route>
        <Route path="/app/naked/:code">{({ code }: { code: string }) => <Redirect to={`/naked/${code}`} />}</Route>
        <Route path="/app/session/:id">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}`} />}</Route>
        <Route path="/app/invite/:token">{({ token }: { token: string }) => <Redirect to={`/labs/invite/${token}`} />}</Route>
        <Route path="/app/recap/:id">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}/recap`} />}</Route>
        <Route path="/app/home">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/app/sessions">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/app/discover">{() => <Redirect to="/labs/explore" />}</Route>
        <Route path="/app/cellar">{() => <Redirect to="/labs/taste/collection" />}</Route>
        <Route path="/app/more">{() => <Redirect to="/labs/taste" />}</Route>
        <Route path="/app/admin">{() => <Redirect to="/admin" />}</Route>
        <Route path="/app">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/app/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/lab-dark/home">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/lab-dark/sessions">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/lab-dark/discover">{() => <Redirect to="/labs/explore" />}</Route>
        <Route path="/lab-dark/session/:id">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}`} />}</Route>
        <Route path="/lab-dark/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/home">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/tasting/sessions">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/tasting/calendar">{() => <Redirect to="/labs/host/calendar" />}</Route>
        <Route path="/legacy/tasting/host">{() => <Redirect to="/labs/host/dashboard" />}</Route>
        <Route path="/legacy/tasting/:id">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}`} />}</Route>
        <Route path="/legacy/tasting">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/discover">{() => <Redirect to="/labs/explore" />}</Route>
        <Route path="/legacy/profile">{() => <Redirect to="/labs/taste" />}</Route>
        <Route path="/legacy/admin">{() => <Redirect to="/admin" />}</Route>
        <Route path="/legacy/invite/:token">{({ token }: { token: string }) => <Redirect to={`/labs/invite/${token}`} />}</Route>
        <Route path="/legacy/recap/:id">{({ id }: { id: string }) => <Redirect to={`/labs/tastings/${id}/recap`} />}</Route>
        <Route path="/legacy">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/legacy/*">{() => <Redirect to="/labs/tastings" />}</Route>
        <Route path="/onboarding">{() => <Redirect to="/labs/onboarding" />}</Route>

        {/* === CASKSENSE LABS === */}
        <Route path="/labs/results/:id/present" component={LabsResultsPresent} />
        <Route path="/labs">{() => <Redirect to="/labs/onboarding" />}</Route>
        <Route path="/labs/*">
          <LabsLayout>
            <Switch>
              <Route path="/labs/onboarding" component={LabsOnboarding} />
              <Route path="/labs/join/:code" component={LabsJoin} />
              <Route path="/labs/join">{() => <RedirectWithQuery to="/labs/tastings" query="tab=join" />}</Route>
              <Route path="/labs/host/dashboard" component={LabsHostDashboard} />
              <Route path="/labs/host/batch-import" component={LabsBatchImport} />
              <Route path="/labs/host/handout-library">
                {() => {
                  let toCommunity = false;
                  try {
                    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                    toCommunity = params.get("tab") === "community";
                  } catch {}
                  return toCommunity
                    ? <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=nachschlagewerk&sub=community-handouts" />
                    : <RedirectWithQuery to="/labs/taste" query="tab=collection&sub=labs-link-collection-hub-handouts" />;
                }}
              </Route>
              <Route path="/labs/host/handout-library/community">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=nachschlagewerk&sub=community-handouts" />}</Route>
              <Route path="/labs/taste/my-handouts">{() => <RedirectWithQuery to="/labs/taste" query="tab=collection&sub=labs-link-collection-hub-handouts" />}</Route>
              <Route path="/labs/host/calendar" component={LabsCalendar} />
              <Route path="/labs/history/insights" component={LabsHistory} />
              <Route path="/labs/history/:id" component={LabsHistoricalDetail} />
              <Route path="/labs/history">{() => <RedirectWithQuery to="/labs/circle" query="tab=sessions" />}</Route>
              <Route path="/labs/host/history/insights" component={LabsHistory} />
              <Route path="/labs/host/history/:id" component={LabsHistoricalDetail} />
              <Route path="/labs/host/history" component={LabsHistory} />
              <Route path="/labs/host/:id" component={LabsHost} />
              <Route path="/labs/host">{() => <RedirectWithQuery to="/labs/tastings" query="tab=host" />}</Route>
              <Route path="/labs/tastings/:id/scan" component={LabsPaperScan} />
              <Route path="/labs/tastings/:id/recap" component={LabsTastingRecap} />
              <Route path="/labs/tastings/:id" component={LabsTastingDetail} />
              <Route path="/labs/tastings" component={LabsTastings} />
              <Route path="/labs/live/:id" component={LabsLive} />
              <Route path="/labs/results/:id" component={LabsResults} />
              <Route path="/labs/explore/bottles/:id" component={LabsBottleDetail} />
              <Route path="/labs/explore" component={LabsEntdecken} />
              <Route path="/labs/bibliothek/insights">{() => <RedirectWithQuery to="/labs/circle" query="tab=stats" />}</Route>
              <Route path="/labs/bibliothek">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek" />}</Route>
              <Route path="/labs/discover/lexicon">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=nachschlagewerk&sub=lexikon" />}</Route>
              <Route path="/labs/discover/distilleries">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=nachschlagewerk&sub=destillerien" />}</Route>
              <Route path="/labs/discover/bottlers">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=nachschlagewerk&sub=bottlers" />}</Route>
              <Route path="/labs/discover/templates">{() => <RedirectWithQuery to="/labs/discover/lexicon" query="tab=templates" />}</Route>
              <Route path="/labs/discover/guide">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=tasting-wissen&sub=guide" />}</Route>
              <Route path="/labs/discover/research">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=tasting-wissen&sub=research" />}</Route>
              <Route path="/labs/discover/research/grundlagen" component={LabsIdeaBehindNumbers} />
              <Route path="/labs/discover/research/testtheorie" component={LabsTestTheory} />
              <Route path="/labs/discover/research/statistische-methoden" component={LabsStatisticalMethods} />
              <Route path="/labs/discover/research/literatur" component={LabsLiterature} />
              <Route path="/labs/discover/literature">
                <Redirect to="/labs/discover/research/literatur" />
              </Route>
              <Route path="/labs/discover/rabbit-hole">
                <Redirect to="/labs/discover/rabbit-hole/themenspeicher" />
              </Route>
              <Route path="/labs/discover/rabbit-hole/themenspeicher">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=rabbit-hole&sub=themenspeicher" />}</Route>
              <Route path="/labs/discover/method">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=tasting-wissen&sub=profilberechnung" />}</Route>
              <Route path="/labs/discover/idea-behind-numbers">
                <Redirect to="/labs/discover/research/grundlagen" />
              </Route>
              <Route path="/labs/discover/test-theory">
                <Redirect to="/labs/discover/research/testtheorie" />
              </Route>
              <Route path="/labs/discover/statistical-methods">
                <Redirect to="/labs/discover/research/statistische-methoden" />
              </Route>
              <Route path="/labs/discover/background">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=tasting-wissen&sub=hintergrund" />}</Route>
              <Route path="/labs/discover/flavour-map">{() => <RedirectWithQuery to="/labs/explore" query="tab=whiskies&view=flavour-map" />}</Route>
              <Route path="/labs/discover/vocabulary">{() => <RedirectWithQuery to="/labs/explore" query="tab=whiskies&view=flavour-map" />}</Route>
              <Route path="/labs/discover">{() => <Redirect to="/labs/explore" />}</Route>
              <Route path="/labs/entdecken">{() => <Redirect to="/labs/explore" />}</Route>
              <Route path="/labs/taste/profile">{() => <RedirectWithQuery to="/labs/taste" query="tab=analytics&sub=labs-link-analytics-hub-palate" />}</Route>
              <Route path="/labs/taste/analytics">{() => <RedirectWithQuery to="/labs/taste" query="tab=analytics&sub=labs-link-analytics-hub-analytics" />}</Route>
              <Route path="/labs/taste/wheel">{() => <RedirectWithQuery to="/labs/taste" query="tab=analytics&sub=labs-link-analytics-hub-wheel" />}</Route>
              <Route path="/labs/taste/dna">{() => <RedirectWithQuery to="/labs/taste" query="tab=ai&sub=labs-link-ai-insights-dna" />}</Route>
              <Route path="/labs/taste/compare">{() => <RedirectWithQuery to="/labs/taste" query="tab=analytics&sub=labs-link-analytics-hub-compare" />}</Route>
              <Route path="/labs/taste/drams">{() => <RedirectWithQuery to="/labs/taste" query="tab=collection&sub=labs-link-collection-hub-drams" />}</Route>
              <Route path="/labs/taste/collection">{() => <RedirectWithQuery to="/labs/taste" query="tab=collection&sub=labs-link-collection-hub-bottles" />}</Route>
              <Route path="/labs/taste/wishlist">{() => <RedirectWithQuery to="/labs/taste" query="tab=collection&sub=labs-link-collection-hub-wishlist" />}</Route>
              <Route path="/labs/taste/downloads">{() => <RedirectWithQuery to="/labs/taste" query="tab=analytics&sub=labs-link-analytics-hub-downloads" />}</Route>
              <Route path="/labs/taste/settings" component={LabsTasteSettings} />
              <Route path="/labs/taste/recommendations">{() => <RedirectWithQuery to="/labs/taste" query="tab=ai&sub=labs-link-ai-insights-recommendations" />}</Route>
              <Route path="/labs/taste/pairings" component={LabsPairings} />
              <Route path="/labs/taste/benchmark">{() => <RedirectWithQuery to="/labs/taste" query="tab=analytics&sub=benchmark" />}</Route>
              <Route path="/labs/taste/collection-analysis">{() => <RedirectWithQuery to="/labs/taste" query="tab=ai&sub=labs-link-ai-insights-collection-analysis" />}</Route>
              <Route path="/labs/taste/connoisseur">{() => <RedirectWithQuery to="/labs/taste" query="tab=ai&sub=labs-link-ai-insights-connoisseur" />}</Route>
              <Route path="/labs/taste/ai-curation">{() => <RedirectWithQuery to="/labs/taste" query="tab=ai&sub=labs-link-ai-insights-ai-curation" />}</Route>
              <Route path="/labs/taste/collection-hub">{() => <Redirect to="/labs/taste?tab=collection" />}</Route>
              <Route path="/labs/taste/ai-insights">{() => <Redirect to="/labs/taste?tab=ai" />}</Route>
              <Route path="/labs/taste/analytics-hub">{() => <Redirect to="/labs/taste?tab=analytics" />}</Route>
              <Route path="/labs/invite/:token" component={LabsInvite} />
              <Route path="/labs/taste/ai-images" component={LabsAiImages} />
              <Route path="/labs/taste" component={LabsTaste} />
              <Route path="/labs/bottle-sharing/:id">{(params: any) => <LabsBottleSharingDetail id={params.id} />}</Route>
              <Route path="/labs/bottle-sharing">{() => <RedirectWithQuery to="/labs/tastings" query="tab=share" />}</Route>
              <Route path="/labs/splits/:id">{(params: any) => <LabsBottleSplitDetail id={params.id} />}</Route>
              <Route path="/labs/splits" component={LabsBottleSplit} />
              <Route path="/labs/circle" component={LabsCircle} />
              <Route path="/labs/solo">{() => <RedirectWithQuery to="/labs/tastings" query="tab=solo" />}</Route>
              <Route path="/labs/fair-mode" component={LabsFairMode} />
              <Route path="/labs/about">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=ueber-casksense&sub=about" />}</Route>
              <Route path="/labs/donate">{() => <RedirectWithQuery to="/labs/explore" query="tab=bibliothek&section=ueber-casksense&sub=about" />}</Route>
              <Route path="/labs/impressum" component={LabsImpressum} />
              <Route path="/labs/privacy" component={LabsPrivacy} />
              <Route path="/labs/terms" component={LabsTerms} />
              <Route path="/labs/activity" component={LabsActivityPage} />
              <Route path="/labs/community/:id" component={LabsCommunityDetail} />
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
                    <a href="/labs/tastings" className="labs-btn-primary" data-testid="labs-404-home">Back to Labs</a>
                  </div>
                </div>
              )}</Route>
            </Switch>
          </LabsLayout>
        </Route>

        {/* ── Legacy V2 routes redirect to Labs ── */}
        <Route path="/labs-v2/:rest*"><SmartRedirectToLabs /></Route>
        <Route path="/labs-v2"><SmartRedirectToLabs /></Route>

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
          <UpdateBanner />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
