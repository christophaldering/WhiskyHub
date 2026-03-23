import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, Crown, User, Compass, KeyRound, ChevronDown, ArrowLeft } from "lucide-react";
import { getSession, tryAutoResume } from "@/lib/session";
import SessionSheet from "@/components/session-sheet";
import type { SessionMode } from "@/lib/session";
import { c } from "@/lib/theme";
import { v } from "@/lib/themeVars";
import { NAV_VERSION } from "@/lib/config";
import { primaryTabs } from "@/lib/navConfig";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopTabSwitcher from "@/components/navigation/DesktopTabSwitcher";
import { popRoute, getSmartFallback, markBackNavigation } from "@/lib/navStack";

function BackButtonBottom() {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const goBack = () => {
    markBackNavigation();
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from && /^\/[a-zA-Z0-9\-_/]*$/.test(from)) { navigate(from); return; }
    const prev = popRoute();
    if (prev) { navigate(prev); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(getSmartFallback(location));
  };
  return (
    <button
      onClick={goBack}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13,
        color: v.accent, background: "none", border: "none", cursor: "pointer",
        padding: 0, marginTop: 40, fontFamily: "system-ui, sans-serif", opacity: 0.85,
      }}
      data-testid="link-back"
    >
      <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={2} />
      {t("common.back", "Back")}
    </button>
  );
}

const NAV_ITEMS_V1 = [
  { href: "/enter", icon: Wine, labelKey: "nav.join", labelFallback: "Joyn", match: ["/enter", "/join", "/tasting-room-simple", "/naked/"] },
  { href: "/log-simple", icon: PenLine, labelKey: "nav.log", labelFallback: "Log", match: ["/log-simple", "/log"] },
  { href: "/host", icon: Crown, labelKey: "nav.host", labelFallback: "Host", match: ["/host"] },
  { href: "/my-taste", icon: User, labelKey: "nav.taste", labelFallback: "Taste", match: ["/my-taste", "/taste", "/my-taste/analytics"] },
  { href: "/analyze", icon: Compass, labelKey: "nav.discover", labelFallback: "Discover", match: ["/analyze", "/discover"] },
];

const NAV_ITEMS_V2 = [
  { href: "/tasting", icon: Wine, labelKey: "nav.tasting", labelFallback: "Tasting", match: ["/tasting", "/enter", "/join", "/tasting-room-simple", "/naked/", "/host", "/log-simple", "/log"] },
  { href: "/my-taste", icon: User, labelKey: "nav.taste", labelFallback: "Taste", match: ["/my-taste", "/taste"] },
  { href: "/analyze", icon: Compass, labelKey: "nav.discover", labelFallback: "Explore", match: ["/analyze", "/discover"] },
];

const NAV_ITEMS_TWO_TAB = primaryTabs.map((tab) => ({
  href: tab.route,
  icon: tab.icon,
  labelKey: tab.labelKey,
  labelFallback: tab.key === "tasting" ? "Tasting" : "Taste",
  match: tab.match || [tab.route],
}));

const NAV_ITEMS = NAV_VERSION === "v2_two_tab" ? NAV_ITEMS_TWO_TAB : NAV_VERSION === "v2_simplified" ? NAV_ITEMS_V2 : NAV_ITEMS_V1;

interface SimpleShellProps {
  children: ReactNode;
  showBack?: boolean;
  maxWidth?: number;
  hideNav?: boolean;
}

export default function SimpleShell({ children, showBack = false, maxWidth = 600, hideNav = false }: SimpleShellProps) {
  const [location] = useLocation();
  const [showSessionSheet, setShowSessionSheet] = useState(false);
  const [session, setSession] = useState(() => getSession());
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const refreshSession = useCallback(() => setSession(getSession()), []);

  useEffect(() => {
    tryAutoResume().then(() => refreshSession());
  }, [refreshSession]);

  const inferMode = (): SessionMode => {
    if (location.startsWith("/enter") || location.includes("/naked/") || location.includes("/join/")) return "tasting";
    return "log";
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: v.bg,
        color: v.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: v.bg,
        padding: "8px 20px 12px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                color: v.accent,
                cursor: "pointer",
              }}
              data-testid="link-brand-home"
            >
              CaskSense
            </span>
          </Link>
          <button
            onClick={() => setShowSessionSheet(true)}
            style={{
              background: session.signedIn ? `${c.accent}18` : "none",
              border: session.signedIn ? `1px solid ${c.accent}30` : "none",
              cursor: "pointer",
              padding: session.signedIn ? "4px 10px" : 6,
              borderRadius: 20,
              color: session.signedIn ? v.accent : v.mutedLight,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              maxWidth: 160,
            }}
            data-testid="button-user-menu"
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
        </div>
        {!isMobile && !hideNav && (
          <div style={{ marginTop: 8 }}>
            <DesktopTabSwitcher maxWidth={maxWidth} />
          </div>
        )}
      </div>

      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "0px 20px 100px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%" }}>
          {children}
        </div>

        {showBack && (
          <BackButtonBottom />
        )}
      </div>

      <SessionSheet
        open={showSessionSheet}
        onClose={() => setShowSessionSheet(false)}
        onSessionChange={refreshSession}
        defaultMode={inferMode()}
        variant="dark"
      />

      {isMobile && !hideNav && <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "rgba(26, 23, 20, 0.92)",
          backdropFilter: "blur(18px) saturate(1.5)",
          WebkitBackdropFilter: "blur(18px) saturate(1.5)",
          borderTop: "1px solid rgba(212, 162, 86, 0.12)",
          paddingTop: 10,
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        }}
        data-testid="simple-bottom-nav"
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
                  gap: 4,
                  padding: "6px 16px",
                  cursor: "pointer",
                  color: active ? "#d4a256" : "rgba(180, 170, 155, 0.5)",
                  transition: "color 0.2s, transform 0.2s ease",
                  transform: active ? "scale(1.05)" : "scale(1)",
                  position: "relative",
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: "center",
                }}
                data-testid={`simple-nav-${(item.labelFallback || item.labelKey).toLowerCase().replace(/\s/g, "-")}`}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#d4a256",
                    }}
                    data-testid={`simple-nav-indicator-${(item.labelFallback || item.labelKey).toLowerCase().replace(/\s/g, "-")}`}
                  />
                )}
                <item.icon
                  style={{ width: 24, height: 24 }}
                  strokeWidth={active ? 2.6 : 1.6}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.15 : 0}
                />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, letterSpacing: active ? "0.01em" : "0" }}>{t(item.labelKey, item.labelFallback)}</span>
              </div>
            </Link>
          );
        })}
      </nav>}
    </div>
  );
}
