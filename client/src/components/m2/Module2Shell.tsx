import { ReactNode, useState, useEffect, useCallback, useRef, Component, type ErrorInfo } from "react";
import { Link, useLocation } from "wouter";
import { Wine, BarChart3, Users, User, Bell, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { v } from "@/lib/themeVars";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { getSession, tryAutoResume } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import M2ProfileMenu from "@/components/m2/M2ProfileMenu";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

class M2ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[M2ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: 32,
            textAlign: "center",
          }}
          data-testid="m2-error-boundary"
        >
          <AlertTriangle style={{ width: 48, height: 48, color: v.danger, marginBottom: 16 }} />
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20,
              fontWeight: 700,
              color: v.text,
              margin: "0 0 8px",
            }}
          >
            {i18next.t("m2.error.title", "Something went wrong")}
          </h2>
          <p style={{ fontSize: 14, color: v.muted, margin: "0 0 24px", maxWidth: 320 }}>
            {i18next.t("m2.error.message", "An unexpected error occurred. Please reload the page.")}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              background: v.accent,
              color: v.bg,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="button-reload"
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            {i18next.t("m2.error.reload", "Reload page")}
          </button>
          {this.state.error && (
            <details style={{ marginTop: 16, fontSize: 12, color: v.muted, maxWidth: 400, textAlign: "left" }}>
              <summary style={{ cursor: "pointer" }}>{i18next.t("m2.error.technicalDetails", "Technical details")}</summary>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8 }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 56,
              left: 16,
              right: 16,
              maxWidth: 340,
              marginLeft: "auto",
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
        </>
      )}
    </div>
  );
}

function usePullToRefresh(mainRef: React.RefObject<HTMLElement | null>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0 && !refreshing) {
        touchStartY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0 && el.scrollTop === 0) {
        setPullDistance(Math.min(dy * 0.5, 100));
      } else {
        pulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance > 60) {
        setRefreshing(true);
        setPullDistance(60);
        queryClient.invalidateQueries().then(() => {
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
          }, 600);
        });
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [mainRef, pullDistance, refreshing]);

  return { pullDistance, refreshing };
}

function useFriendOnlineNotifications() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentParticipant } = useAppStore();
  const prevOnlineRef = useRef<Set<string> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const pid = currentParticipant?.id;
    if (!pid) return;

    let cancelled = false;

    const check = async () => {
      try {
        const [settingsRes, profileRes, onlineRes] = await Promise.all([
          fetch("/api/app-settings/public").then(r => r.json()),
          fetch(`/api/profiles/${pid}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/participants/${pid}/friends/online`).then(r => r.json()),
        ]);
        if (cancelled) return;
        if (settingsRes.friend_online_notifications === "false") return;
        if (profileRes && profileRes.friendNotificationsEnabled === false) return;

        const currentOnline = new Set<string>(
          (onlineRes.online || []).map((f: any) => f.friendId)
        );
        const nameMap = new Map<string, string>(
          (onlineRes.online || []).map((f: any) => [f.friendId, f.name])
        );

        if (mountedRef.current && prevOnlineRef.current) {
          const prev = prevOnlineRef.current;
          for (const id of currentOnline) {
            if (!prev.has(id)) {
              toast({
                title: t("m2.circle.friendOnline", "{{name}} is now online", { name: nameMap.get(id) || "Friend" }),
                duration: 4000,
              });
            }
          }
          for (const id of prev) {
            if (!currentOnline.has(id)) {
              const allFriends = onlineRes.online || [];
              let offlineName = "Friend";
              try {
                const friendsRes = await fetch(`/api/participants/${pid}/friends`).then(r => r.json());
                const found = friendsRes.find((f: any) => f.id === id);
                if (found) offlineName = `${found.firstName} ${found.lastName}`.trim();
              } catch {}
              toast({
                title: t("m2.circle.friendOffline", "{{name}} is now offline", { name: offlineName }),
                duration: 4000,
              });
            }
          }
        }

        prevOnlineRef.current = currentOnline;
        mountedRef.current = true;
      } catch {}
    };

    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentParticipant?.id, t, toast]);
}

export default function Module2Shell({ children, hideNav }: Module2ShellProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [showSession, setShowSession] = useState(false);
  const [session, setSession] = useState(getSession());
  const whatsNew = useWhatsNew();
  const pwa = usePwaInstall();
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, refreshing } = usePullToRefresh(mainRef);
  useFriendOnlineNotifications();

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

  useEffect(() => {
    const pid = session.pid;
    if (!pid) return;
    participantApi.heartbeat(pid).catch(() => {});
    const hb = setInterval(() => { participantApi.heartbeat(pid).catch(() => {}); }, 120000);
    return () => clearInterval(hb);
  }, [session.pid]);

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
            {session.name || t("m2.profile.label", "Profile")}
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

      {pullDistance > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: pullDistance,
            overflow: "hidden",
            transition: pullDistance <= 0 ? "height 0.2s" : "none",
          }}
          data-testid="m2-pull-indicator"
        >
          <RefreshCw
            style={{
              width: 20,
              height: 20,
              color: v.accent,
              opacity: Math.min(pullDistance / 60, 1),
              transform: `rotate(${pullDistance * 3}deg)`,
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
            }}
          />
        </div>
      )}

      <main ref={mainRef} style={{ flex: 1, padding: "0 0 80px", overflowY: "auto" }}>
        <M2ErrorBoundary>{children}</M2ErrorBoundary>
      </main>

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
      <Toaster />
    </div>
  );
}
