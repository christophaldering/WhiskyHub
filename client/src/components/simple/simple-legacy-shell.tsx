import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, Crown, User, Compass, KeyRound, ArrowLeft } from "lucide-react";
import { getSession, tryAutoResume } from "@/lib/session";
import SessionSheet from "@/components/session-sheet";
import type { SessionMode } from "@/lib/session";

const c = {
  bg: "#1a1714",
  text: "#f5f0e8",
  accent: "#d4a256",
  muted: "#4a4540",
  mutedLight: "#8a7e6d",
  border: "#2e281f",
  card: "#242018",
};

const NAV_ITEMS = [
  { href: "/enter", icon: Wine, label: "Join", match: ["/enter", "/join", "/tasting-room-simple", "/naked/"] },
  { href: "/log-simple", icon: PenLine, label: "Log", match: ["/log-simple", "/log"] },
  { href: "/host", icon: Crown, label: "Host", match: ["/host", "/legacy/tasting"] },
  { href: "/my-taste", icon: User, label: "My Taste", match: ["/my-taste", "/taste", "/legacy/profile", "/legacy/my"] },
  { href: "/analyze", icon: Compass, label: "Discover", match: ["/analyze", "/legacy/discover", "/legacy/flavor", "/legacy/news", "/legacy/badges"] },
];

function getBackTarget(location: string): string {
  if (location.startsWith("/legacy/tasting")) return "/host";
  if (location.startsWith("/legacy/my") || location.startsWith("/legacy/profile")) return "/my-taste";
  if (location.startsWith("/legacy/discover") || location.startsWith("/legacy/flavor") || location.startsWith("/legacy/news") || location.startsWith("/legacy/badges")) return "/analyze";
  if (location.startsWith("/legacy/admin")) return "/";
  return "/";
}

function getPageLabel(location: string): string {
  if (location.includes("/tasting/host")) return "Host Dashboard";
  if (location.includes("/tasting/sessions")) return "Sessions";
  if (location.includes("/tasting/calendar")) return "Calendar";
  if (location.includes("/tasting?tab=templates")) return "Templates";
  if (location.match(/\/tasting\/[a-f0-9-]+/i)) return "Tasting";
  if (location.includes("/tasting")) return "Tasting Hub";
  if (location.includes("/my/journal")) return "Journal";
  if (location.includes("/my/collection")) return "Collection";
  if (location.includes("/my/wishlist")) return "Wishlist";
  if (location.includes("/discover/distilleries")) return "Distilleries";
  if (location.includes("/discover/community")) return "Community";
  if (location.includes("/discover/database")) return "Database";
  if (location.includes("/discover")) return "Discover";
  if (location.includes("/flavor-wheel")) return "Flavor Wheel";
  if (location.includes("/flavor-profile")) return "Flavor Profile";
  if (location.includes("/profile/account")) return "Account";
  if (location.includes("/profile/help")) return "Help";
  if (location.includes("/profile")) return "Profile";
  if (location.includes("/admin")) return "Admin";
  if (location.includes("/news")) return "News";
  if (location.includes("/badges")) return "Badges";
  if (location.includes("/recap")) return "Recap";
  return "CaskSense";
}

interface SimpleLegacyShellProps {
  children: ReactNode;
}

export default function SimpleLegacyShell({ children }: SimpleLegacyShellProps) {
  const [location] = useLocation();
  const [showSessionSheet, setShowSessionSheet] = useState(false);
  const [session, setSession] = useState(() => getSession());

  const refreshSession = useCallback(() => setSession(getSession()), []);

  useEffect(() => {
    tryAutoResume().then(() => refreshSession());
  }, [refreshSession]);

  const backTarget = getBackTarget(location);
  const pageLabel = getPageLabel(location);

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
          padding: "12px 16px",
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${c.border}`,
        }}
        data-testid="simple-legacy-header"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: c.text,
              fontWeight: 500,
            }}
            data-testid="text-legacy-page-label"
          >
            {pageLabel}
          </span>
        </div>

        <button
          onClick={() => setShowSessionSheet(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 6,
            borderRadius: 8,
            color: session.signedIn ? c.accent : c.mutedLight,
            display: "flex",
            alignItems: "center",
          }}
          data-testid="button-legacy-session"
        >
          <KeyRound style={{ width: 18, height: 18 }} strokeWidth={session.signedIn ? 2.2 : 1.6} />
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
            minHeight: "calc(100dvh - 52px - 72px)",
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
