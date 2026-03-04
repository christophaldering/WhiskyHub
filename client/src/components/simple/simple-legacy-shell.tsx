import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, Crown, User, Compass, KeyRound, ArrowLeft, ChevronDown } from "lucide-react";
import { getSession, tryAutoResume } from "@/lib/session";
import SessionSheet from "@/components/session-sheet";
import type { SessionMode } from "@/lib/session";
import { c } from "@/lib/theme";
import { NAV_VERSION } from "@/lib/config";

const NAV_ITEMS_V1 = [
  { href: "/enter", icon: Wine, label: "Join", match: ["/enter", "/join", "/tasting-room-simple", "/naked/"] },
  { href: "/log-simple", icon: PenLine, label: "Log", match: ["/log-simple", "/log"] },
  { href: "/host", icon: Crown, label: "Host", match: ["/host", "/legacy/tasting"] },
  { href: "/my-taste", icon: User, label: "My Taste", match: ["/my-taste", "/taste", "/legacy/profile", "/legacy/my"] },
  { href: "/analyze", icon: Compass, label: "Discover", match: ["/analyze", "/legacy/discover", "/legacy/flavor", "/legacy/news", "/legacy/badges"] },
];

const NAV_ITEMS_V2 = [
  { href: "/tasting", icon: Wine, label: "Tasting", match: ["/tasting", "/enter", "/join", "/tasting-room-simple", "/naked/", "/host", "/legacy/tasting"] },
  { href: "/my-taste", icon: User, label: "My Taste", match: ["/my-taste", "/taste", "/log-simple", "/log", "/legacy/profile", "/legacy/my"] },
  { href: "/analyze", icon: Compass, label: "Explore", match: ["/analyze", "/legacy/discover", "/legacy/flavor", "/legacy/news", "/legacy/badges"] },
];

const NAV_ITEMS = NAV_VERSION === "v2_simplified" ? NAV_ITEMS_V2 : NAV_ITEMS_V1;

const LEGACY_ROUTE_PREFIXES = [
  "/tasting", "/my/", "/discover", "/profile", "/admin",
  "/flavor-wheel", "/flavor-profile", "/news", "/badges",
  "/recap", "/photo-tasting", "/method", "/invite",
  "/home", "/sessions", "/journal", "/collection", "/wishlist",
  "/comparison", "/benchmark", "/analytics", "/data-export",
  "/recommendations", "/taste-twins", "/friends", "/community-rankings",
  "/activity", "/leaderboard", "/lexicon", "/distilleries",
  "/distillery-map", "/bottlers", "/research", "/about",
  "/features", "/donate", "/help", "/export-notes",
  "/calendar", "/host-dashboard", "/my-tastings", "/my-whiskies",
  "/whisky-database", "/account", "/reminders", "/pairings",
  "/tasting-templates",
];

function getBackTarget(location: string): string {
  if (location.startsWith("/legacy/tasting")) return "/host";
  if (location.startsWith("/legacy/my") || location.startsWith("/legacy/profile")) return "/my-taste";
  if (location.startsWith("/legacy/discover") || location.startsWith("/legacy/flavor") || location.startsWith("/legacy/news") || location.startsWith("/legacy/badges")) return "/analyze";
  if (location.startsWith("/legacy/admin")) return "/";
  return "/";
}

function shouldRedirectToLegacy(href: string): boolean {
  if (href.startsWith("/legacy/") || href.startsWith("/enter") ||
      href.startsWith("/log-simple") || href === "/log" ||
      href === "/host" || href.startsWith("/my-taste") || href === "/analyze" ||
      href.startsWith("/app/") || href.startsWith("/api/") || href === "/" ||
      href.startsWith("/support") || href.startsWith("/impressum") || href.startsWith("/privacy") ||
      href.startsWith("http") || href.startsWith("#") || href.startsWith("/naked/") ||
      href.startsWith("/join/") || href.startsWith("/tasting-room-simple") || href === "/taste") {
    return false;
  }
  return LEGACY_ROUTE_PREFIXES.some((prefix) => href === prefix || href.startsWith(prefix + "/") || href.startsWith(prefix + "?"));
}

interface SimpleLegacyShellProps {
  children: ReactNode;
}

export default function SimpleLegacyShell({ children }: SimpleLegacyShellProps) {
  const [location, navigate] = useLocation();
  const [showSessionSheet, setShowSessionSheet] = useState(false);
  const [session, setSession] = useState(() => getSession());

  const refreshSession = useCallback(() => setSession(getSession()), []);

  useEffect(() => {
    tryAutoResume().then(() => refreshSession());
  }, [refreshSession]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;

      if (shouldRedirectToLegacy(href)) {
        e.preventDefault();
        e.stopPropagation();
        navigate("/legacy" + href);
      }
    }

    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);

    function patchUrl(url: string | URL | null | undefined): string | URL | null | undefined {
      if (!url || typeof url !== "string") return url;
      const path = url.startsWith("/") ? url : new URL(url, window.location.origin).pathname + (url.includes("?") ? "?" + url.split("?")[1] : "");
      if (shouldRedirectToLegacy(path)) {
        return "/legacy" + path;
      }
      return url;
    }

    history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      return origPushState(data, unused, patchUrl(url as string) as string);
    };

    history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
      return origReplaceState(data, unused, patchUrl(url as string) as string);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
    };
  }, [navigate]);

  const backTarget = getBackTarget(location);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: c.bg,
        color: c.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${c.border}`,
        }}
        data-testid="simple-legacy-header"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={backTarget}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: "pointer",
                color: c.accent,
              }}
              data-testid="button-legacy-back"
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </div>
          </Link>
          <Link href="/">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                color: c.accent,
                cursor: "pointer",
              }}
              data-testid="link-legacy-brand"
            >
              CaskSense
            </span>
          </Link>
        </div>

        <button
          onClick={() => setShowSessionSheet(true)}
          style={{
            background: session.signedIn ? `${c.accent}18` : "none",
            border: session.signedIn ? `1px solid ${c.accent}30` : "none",
            cursor: "pointer",
            padding: session.signedIn ? "4px 10px" : 6,
            borderRadius: 20,
            color: session.signedIn ? c.accent : c.mutedLight,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            maxWidth: 160,
          }}
          data-testid="button-legacy-session"
        >
          {session.signedIn ? (
            <>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(session.name || "Account").length > 14
                  ? (session.name || "Account").slice(0, 12) + "…"
                  : (session.name || "Account")}
              </span>
              <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
            </>
          ) : (
            <KeyRound style={{ width: 18, height: 18 }} strokeWidth={1.6} />
          )}
        </button>
      </header>

      <main
        style={{
          flex: 1,
          paddingBottom: 72,
        }}
        className="light"
        data-testid="simple-legacy-content"
      >
        <div
          style={{
            background: "#ffffff",
            minHeight: "calc(100dvh - 48px - 72px)",
          }}
        >
          {children}
        </div>
      </main>

      <SessionSheet
        open={showSessionSheet}
        onClose={() => setShowSessionSheet(false)}
        onSessionChange={refreshSession}
        defaultMode="log"
        variant="dark"
      />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: `1px solid ${c.border}`,
          paddingTop: 8,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
        data-testid="simple-legacy-bottom-nav"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.match.some((m) => location === m || location.startsWith(m + "/") || location.startsWith(m));
          return (
            <Link key={item.href} href={item.href}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: active ? c.accent : c.mutedLight,
                  transition: "color 0.2s",
                }}
                data-testid={`simple-legacy-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon
                  style={{ width: 20, height: 20 }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
