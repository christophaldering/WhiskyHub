import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, Crown, User, Compass, KeyRound } from "lucide-react";
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
  { href: "/host", icon: Crown, label: "Host", match: ["/host"] },
  { href: "/my-taste", icon: User, label: "My Taste", match: ["/my-taste", "/taste"] },
  { href: "/analyze", icon: Compass, label: "Discover", match: ["/analyze"] },
];

interface SimpleShellProps {
  children: ReactNode;
  showBack?: boolean;
  maxWidth?: number;
}

export default function SimpleShell({ children, showBack = true, maxWidth = 420 }: SimpleShellProps) {
  const [location] = useLocation();
  const [showSessionSheet, setShowSessionSheet] = useState(false);
  const [session, setSession] = useState(() => getSession());

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
        background: c.bg,
        color: c.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "40px 20px 100px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Link href="/">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                color: c.accent,
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
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: session.signedIn ? c.accent : c.mutedLight,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            data-testid="button-user-menu"
          >
            <KeyRound style={{ width: 18, height: 18 }} strokeWidth={session.signedIn ? 2.2 : 1.6} />
          </button>
        </div>

        <div style={{ width: "100%" }}>
          {children}
        </div>

        {showBack && (
          <Link
            href="/"
            style={{ fontSize: 12, color: c.muted, textDecoration: "none", marginTop: 40 }}
            data-testid="link-back"
          >
            ← Back
          </Link>
        )}
      </div>

      <SessionSheet
        open={showSessionSheet}
        onClose={() => setShowSessionSheet(false)}
        onSessionChange={refreshSession}
        defaultMode={inferMode()}
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
          borderTop: "1px solid #2e281f",
          paddingTop: 8,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
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
                  color: active ? c.accent : c.mutedLight,
                  transition: "color 0.2s",
                }}
                data-testid={`simple-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
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
