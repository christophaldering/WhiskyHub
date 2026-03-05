import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Wine, BarChart3, Users, User } from "lucide-react";
import { v } from "@/lib/themeVars";
import { useTranslation } from "react-i18next";
import { getSession, tryAutoResume } from "@/lib/session";
import M2ProfileMenu from "@/components/m2/M2ProfileMenu";

const TABS = [
  { href: "/m2/tastings", icon: Wine, labelKey: "m2.tabs.tastings", fallback: "Tastings", match: ["/m2/tastings"] },
  { href: "/m2/taste", icon: BarChart3, labelKey: "m2.tabs.taste", fallback: "Taste", match: ["/m2/taste"] },
  { href: "/m2/circle", icon: Users, labelKey: "m2.tabs.circle", fallback: "Circle", match: ["/m2/circle"] },
];

interface Module2ShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function Module2Shell({ children, hideNav }: Module2ShellProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [showSession, setShowSession] = useState(false);
  const [session, setSession] = useState(getSession());

  useEffect(() => {
    tryAutoResume().then(() => setSession(getSession()));
  }, []);

  const isActive = (tab: typeof TABS[number]) =>
    tab.match.some((m) => location === m || location.startsWith(m + "/"));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: v.bg,
        color: v.text,
        display: "flex",
        flexDirection: "column",
      }}
      data-testid="m2-shell"
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${v.border}`,
          background: v.card,
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(12px)",
        }}
      >
        <Link href="/m2/tastings" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20,
              fontWeight: 700,
              color: v.accent,
              letterSpacing: "-0.02em",
            }}
            data-testid="m2-logo"
          >
            CaskSense
          </span>
        </Link>
        <button
          onClick={() => setShowSession(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: v.elevated,
            border: `1px solid ${v.border}`,
            borderRadius: 20,
            padding: "6px 12px",
            cursor: "pointer",
            color: v.text,
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-button"
        >
          <User style={{ width: 16, height: 16 }} />
          {session.name || t("m2.profile", "Profile")}
        </button>
      </header>

      <main style={{ flex: 1, padding: "0 0 80px" }}>{children}</main>

      {!hideNav && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
            background: v.card,
            borderTop: `1px solid ${v.border}`,
            backdropFilter: "blur(16px)",
            zIndex: 50,
          }}
          data-testid="m2-bottom-nav"
        >
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    padding: "4px 16px",
                    minWidth: 64,
                  }}
                  data-testid={`m2-tab-${tab.fallback.toLowerCase()}`}
                >
                  <Icon
                    style={{
                      width: 22,
                      height: 22,
                      color: active ? v.accent : v.textSecondary,
                      transition: "color 0.15s",
                    }}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: active ? 600 : 400,
                      color: active ? v.accent : v.textSecondary,
                      transition: "color 0.15s",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {t(tab.labelKey, tab.fallback)}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      )}

      <M2ProfileMenu open={showSession} onClose={() => setShowSession(false)} />
    </div>
  );
}
