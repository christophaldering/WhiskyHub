import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, Crown, User, Compass, KeyRound, ChevronDown } from "lucide-react";
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

const NAV_ITEMS_V1 = [
  { href: "/enter", icon: Wine, labelKey: "nav.join", labelFallback: "Join", match: ["/enter", "/join", "/tasting-room-simple", "/naked/"] },
  { href: "/log-simple", icon: PenLine, labelKey: "nav.log", labelFallback: "Log", match: ["/log-simple", "/log"] },
  { href: "/host", icon: Crown, labelKey: "nav.host", labelFallback: "Host", match: ["/host"] },
  { href: "/my-taste", icon: User, labelKey: "nav.myTaste", labelFallback: "My Taste", match: ["/my-taste", "/taste", "/my-taste/analytics"] },
  { href: "/analyze", icon: Compass, labelKey: "nav.discover", labelFallback: "Discover", match: ["/analyze", "/discover"] },
];

const NAV_ITEMS_V2 = [
  { href: "/tasting", icon: Wine, labelKey: "nav.tasting", labelFallback: "Tasting", match: ["/tasting", "/enter", "/join", "/tasting-room-simple", "/naked/", "/host"] },
  { href: "/my-taste", icon: User, labelKey: "nav.myTaste", labelFallback: "My Taste", match: ["/my-taste", "/taste", "/log-simple", "/log"] },
  { href: "/analyze", icon: Compass, labelKey: "nav.discover", labelFallback: "Explore", match: ["/analyze", "/discover"] },
];

const NAV_ITEMS_TWO_TAB = primaryTabs.map((tab) => ({
  href: tab.route,
  icon: tab.icon,
  labelKey: tab.labelKey,
  labelFallback: tab.key === "tasting" ? "Tasting" : "My Taste",
  match: tab.match || [tab.route],
}));

const NAV_ITEMS = NAV_VERSION === "v2_two_tab" ? NAV_ITEMS_TWO_TAB : NAV_VERSION === "v2_simplified" ? NAV_ITEMS_V2 : NAV_ITEMS_V1;

interface SimpleShellProps {
  children: ReactNode;
  showBack?: boolean;
  maxWidth?: number;
}

export default function SimpleShell({ children, showBack = false, maxWidth = 600 }: SimpleShellProps) {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
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
          {!isMobile && (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              <DesktopTabSwitcher />
            </div>
          )}
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
          <button
            onClick={() => window.history.back()}
            style={{
              fontSize: 12,
              color: v.muted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginTop: 40,
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="link-back"
          >
            ← Back
          </button>
        )}
      </div>

      <SessionSheet
        open={showSessionSheet}
        onClose={() => setShowSessionSheet(false)}
        onSessionChange={refreshSession}
        defaultMode={inferMode()}
        variant="dark"
      />

      {isMobile && <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: v.bg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: `1px solid ${v.subtleBorder}`,
          paddingTop: 8,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          opacity: 0.97,
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
                  gap: 2,
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: active ? v.accent : v.mutedLight,
                  transition: "color 0.2s",
                }}
                data-testid={`simple-nav-${(item.labelFallback || item.labelKey).toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon
                  style={{ width: 20, height: 20 }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{t(item.labelKey, item.labelFallback)}</span>
              </div>
            </Link>
          );
        })}
      </nav>}
    </div>
  );
}
