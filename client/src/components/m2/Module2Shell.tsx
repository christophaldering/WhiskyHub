import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, BarChart3, Users, User, Bell, Download } from "lucide-react";
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

function useWhatsNew() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("cs_whatsnew_dismissed") === "2.0.0"; } catch { return false; }
  });
  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem("cs_whatsnew_dismissed", "2.0.0"); } catch {}
  }, []);
  return { show: !dismissed, dismiss };
}

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("cs_pwa_dismissed") === "1"; } catch { return false; }
  });
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("cs_pwa_dismissed", "1"); } catch {}
  };

  return { canInstall: !!deferredPrompt && !dismissed && !isInstalled, install, dismiss, isInstalled };
}

function NotificationBell() {
  const [count] = useState(() => {
    try {
      const stored = localStorage.getItem("cs_notif_count");
      return stored ? parseInt(stored, 10) : 0;
    } catch { return 0; }
  });
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 18,
          background: v.elevated,
          border: `1px solid ${v.border}`,
          cursor: "pointer",
          color: v.text,
          position: "relative",
        }}
        data-testid="m2-notification-bell"
      >
        <Bell style={{ width: 18, height: 18 }} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 8,
              background: v.danger,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            data-testid="m2-notification-count"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            width: 280,
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            zIndex: 100,
          }}
          data-testid="m2-notification-dropdown"
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 8 }}>
            {t("m2.notifications.title", "Notifications")}
          </div>
          <div style={{ fontSize: 13, color: v.muted, textAlign: "center", padding: "12px 0" }}>
            {t("m2.notifications.empty", "No new notifications")}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Module2Shell({ children, hideNav }: Module2ShellProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [showSession, setShowSession] = useState(false);
  const [session, setSession] = useState(getSession());
  const whatsNew = useWhatsNew();
  const pwa = usePwaInstall();

  const refreshSession = useCallback(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    tryAutoResume().then(refreshSession);
  }, [refreshSession]);

  useEffect(() => {
    window.addEventListener("session-change", refreshSession);
    return () => window.removeEventListener("session-change", refreshSession);
  }, [refreshSession]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NotificationBell />
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
        </div>
      </header>

      {whatsNew.show && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: v.pillBg,
            borderBottom: `1px solid ${v.border}`,
          }}
          data-testid="m2-whatsnew-banner"
        >
          <span style={{ fontSize: 13, color: v.pillText, fontWeight: 500 }}>
            {t("m2.whatsNew", "What's New: Module 2 is here! Explore the new design.")}
          </span>
          <button
            onClick={whatsNew.dismiss}
            style={{
              background: "none",
              border: "none",
              color: v.pillText,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              padding: "2px 6px",
            }}
            data-testid="m2-whatsnew-dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {pwa.canInstall && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: v.elevated,
            borderBottom: `1px solid ${v.border}`,
          }}
          data-testid="m2-pwa-prompt"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download style={{ width: 16, height: 16, color: v.accent }} />
            <span style={{ fontSize: 13, color: v.text, fontWeight: 500 }}>
              {t("m2.pwa.install", "Install CaskSense for the best experience")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={pwa.install}
              style={{
                background: v.accent,
                color: v.bg,
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
              data-testid="m2-pwa-install-btn"
            >
              {t("m2.pwa.installBtn", "Install")}
            </button>
            <button
              onClick={pwa.dismiss}
              style={{
                background: "transparent",
                color: v.muted,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
              }}
              data-testid="m2-pwa-dismiss"
            >
              {t("m2.pwa.later", "Later")}
            </button>
          </div>
        </div>
      )}

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
