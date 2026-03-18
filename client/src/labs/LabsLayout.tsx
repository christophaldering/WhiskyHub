import { ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { User, Bell, Download, X, Search, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { participantApi, pidHeaders } from "@/lib/api";
import { getSession, tryAutoResume } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import M2ProfileMenu from "@/components/ProfileMenu";
import LabsErrorBoundary from "./LabsErrorBoundary";
import LabsGlobalSearch from "./components/LabsGlobalSearch";
import { triggerHaptic } from "./hooks/useHaptic";
import "./labs-theme.css";

interface OnlineUserInfo {
  participantId: string;
  friendId?: string;
  name: string;
}


interface LabsLayoutProps {
  children: ReactNode;
}

function GlencairnIcon({ color, size = 22 }: { color: string; size?: number }) {
  const glass = "M8.8 5.5 h6.4 l.2 2.5 c.3 2 .5 3.8 .1 5.2 C15 15 13.8 16.2 12.8 17 L12 17.6 l-.8-.6 C10.2 16.2 9 15 8.5 13.2 8 11.8 8.3 10 8.6 8 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={glass} />
      <line x1="10" y1="17.6" x2="14" y2="17.6" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="17.6" x2="12" y2="20" />
    </svg>
  );
}

function GlencairnRefresh({ pullProgress, refreshing, triggered }: { pullProgress: number; refreshing: boolean; triggered: boolean }) {
  const fillHeight = pullProgress * 12;
  const fillY = 17 - fillHeight;
  const accentColor = triggered || refreshing ? "var(--labs-accent)" : "var(--labs-text-muted)";

  return (
    <div
      className={refreshing ? "labs-glencairn-refresh-active" : ""}
      style={{
        opacity: Math.max(pullProgress, refreshing ? 1 : 0),
        transition: "opacity 150ms ease",
      }}
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <clipPath id="glassClip">
            <path d="M8.8 5.5 h6.4 l.2 2.5 c.3 2 .5 3.8 .1 5.2 C15 15 13.8 16.2 12.8 17 L12 17.6 l-.8-.6 C10.2 16.2 9 15 8.5 13.2 8 11.8 8.3 10 8.6 8 Z" />
          </clipPath>
        </defs>
        <rect
          x="7"
          y={fillY}
          width="10"
          height={fillHeight}
          fill={accentColor}
          opacity={0.25}
          clipPath="url(#glassClip)"
          style={{ transition: "y 100ms ease, height 100ms ease" }}
        />
        <path
          d="M8.8 5.5 h6.4 l.2 2.5 c.3 2 .5 3.8 .1 5.2 C15 15 13.8 16.2 12.8 17 L12 17.6 l-.8-.6 C10.2 16.2 9 15 8.5 13.2 8 11.8 8.3 10 8.6 8 Z"
          stroke={accentColor}
          strokeWidth={1.8}
          fill="none"
          style={{ transition: "stroke 200ms ease" }}
        />
        <line x1="10" y1="17.6" x2="14" y2="17.6" stroke={accentColor} strokeWidth={1.8} style={{ transition: "stroke 200ms ease" }} />
        <line x1="9" y1="20" x2="15" y2="20" stroke={accentColor} strokeWidth={1.8} style={{ transition: "stroke 200ms ease" }} />
        <line x1="12" y1="17.6" x2="12" y2="20" stroke={accentColor} strokeWidth={1.8} style={{ transition: "stroke 200ms ease" }} />
      </svg>
    </div>
  );
}

function NavIconEntdecken({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

function NavIconMeineWelt({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity={active ? 0.6 : 0.3} />
    </svg>
  );
}

function NavIconCircle({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
      <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0} />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} strokeLinecap="round" fill="none" />
      <path d="M16 15c2 0 4 1.5 4 5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} strokeLinecap="round" fill="none" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/labs/tastings", icon: "glencairn" as const, label: "Tastings" },
  { href: "/labs/entdecken", icon: "entdecken" as const, label: "Entdecken" },
  { href: "/labs/taste", icon: "meinewelt" as const, label: "Meine Welt" },
  { href: "/labs/circle", icon: "circle" as const, label: "Circle" },
];


function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
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
    (deferredPrompt as unknown as { prompt: () => void }).prompt();
    const result = await (deferredPrompt as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice;
    if (result.outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("cs_pwa_dismissed", "1"); } catch {}
  };

  return { canInstall: !!deferredPrompt && !dismissed && !isInstalled, install, dismiss, isInstalled };
}

function usePullToRefresh(mainRef: React.RefObject<HTMLElement | null>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const pullDistRef = useRef(0);
  const refreshingRef = useRef(false);

  pullDistRef.current = pullDistance;
  refreshingRef.current = refreshing;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0 && !refreshingRef.current) {
        touchStartY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
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
      if (pullDistRef.current > 60) {
        triggerHaptic("success");
        setRefreshing(true);
        setPullDistance(60);
        queryClient.invalidateQueries().finally(() => {
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
  }, [mainRef]);

  return { pullDistance, refreshing };
}

function useHeartbeat() {
  const { currentParticipant } = useAppStore();
  useEffect(() => {
    const pid = currentParticipant?.id;
    if (!pid) return;
    const beat = () => { participantApi.heartbeat(pid, window.location.pathname).catch(() => {}); };
    beat();
    const interval = setInterval(beat, 120000);
    return () => clearInterval(interval);
  }, [currentParticipant?.id]);
}

function useFriendOnlineNotifications(): number {
  const { currentParticipant } = useAppStore();
  const prevOnlineRef = useRef<Map<string, string> | null>(null);
  const mountedRef = useRef(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const pid = currentParticipant?.id;
    if (!pid) {
      setOnlineCount(0);
      prevOnlineRef.current = null;
      mountedRef.current = false;
      return;
    }
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/api/participants/${pid}/friends/online`, {
          headers: pidHeaders(),
        });
        if (cancelled) return;
        if (!res.ok) {
          setOnlineCount(0);
          return;
        }
        const onlineRes = await res.json();
        if (cancelled) return;
        const currentOnline = new Map<string, string>();
        for (const u of (onlineRes.online || []) as OnlineUserInfo[]) {
          currentOnline.set(u.friendId || u.participantId, u.name);
        }
        setOnlineCount(currentOnline.size);

        if (mountedRef.current && prevOnlineRef.current) {
          const prev = prevOnlineRef.current;
          const newlyOnline: string[] = [];
          for (const [uid, name] of currentOnline) {
            if (!prev.has(uid)) newlyOnline.push(name);
          }
          if (newlyOnline.length === 1) {
            toast({
              title: `${newlyOnline[0]} ist online`,
              description: "Gerade auf CaskSense aktiv geworden",
            });
          } else if (newlyOnline.length > 1) {
            toast({
              title: `${newlyOnline.length} Freunde sind online`,
              description: newlyOnline.slice(0, 3).join(", ") + (newlyOnline.length > 3 ? ` +${newlyOnline.length - 3} weitere` : ""),
            });
          }
        }

        prevOnlineRef.current = currentOnline;
        mountedRef.current = true;
      } catch {
        if (!cancelled) setOnlineCount(0);
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentParticipant?.id]);

  return onlineCount;
}

function LabsNotificationBell() {
  const [count] = useState(() => {
    try {
      const stored = localStorage.getItem("cs_notif_count");
      return stored ? parseInt(stored, 10) : 0;
    } catch { return 0; }
  });
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center rounded-full transition-all relative"
        style={{
          width: 36,
          height: 36,
          background: "var(--labs-surface-elevated)",
          border: "1px solid var(--labs-border)",
          color: "var(--labs-text-secondary)",
          cursor: "pointer",
        }}
        data-testid="labs-notification-bell"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: "var(--labs-danger)", color: "var(--labs-bg)" }}
            data-testid="labs-notification-count"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div
            className="rounded-2xl p-4 z-50"
            style={{
              position: "fixed",
              top: 56,
              right: 12,
              width: 288,
              background: "var(--labs-surface)",
              border: "1px solid var(--labs-border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            data-testid="labs-notification-dropdown"
          >
            <div className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
              Notifications
            </div>
            <div className="text-xs text-center py-3" style={{ color: "var(--labs-text-secondary)" }}>
              No new notifications
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function useLabsTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("cs_labs_theme") as "dark" | "light") || "dark"; } catch { return "dark"; }
  });
  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    try { localStorage.setItem("cs_labs_theme", t); } catch {}
  }, []);
  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  return { theme, toggle };
}

function useVerificationBanner() {
  const { currentParticipant } = useAppStore();
  const [status, setStatus] = useState<{ emailVerified: boolean; remainingMs?: number; expired?: boolean; adminEmail?: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const pid = currentParticipant?.id;
    if (!pid) { setStatus(null); return; }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/participants/${pid}/verification-status`, { headers: { "x-participant-id": pid } });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setStatus(data);
          if (data.remainingMs) setRemainingMs(data.remainingMs);
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentParticipant?.id]);

  useEffect(() => {
    if (!remainingMs || remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs > 0]);

  const handleVerify = async () => {
    const pid = currentParticipant?.id;
    if (!pid || !verifyCode.trim()) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      await participantApi.verify(pid, verifyCode.trim());
      setStatus({ emailVerified: true });
      setShowVerifyInput(false);
      toast({ title: "E-Mail verifiziert!" });
    } catch (e: unknown) {
      setVerifyError((e as Error).message || "Ungültiger Code");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    const pid = currentParticipant?.id;
    if (!pid) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await participantApi.resendVerification(pid);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch {} finally {
      setResendLoading(false);
    }
  };

  const formatRemaining = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const needsBanner = status && !status.emailVerified && !status.expired && !dismissed;

  return {
    needsBanner,
    remainingMs,
    formatRemaining,
    showVerifyInput,
    setShowVerifyInput,
    verifyCode,
    setVerifyCode,
    verifyLoading,
    verifyError,
    handleVerify,
    resendLoading,
    resendSuccess,
    handleResend,
    dismiss: () => setDismissed(true),
  };
}

const scrollCache = new Map<string, number>();

export function useLabsBack(fallback: string) {
  const [, navigate] = useLocation();
  return useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  }, [fallback, navigate]);
}

export default function LabsLayout({ children }: LabsLayoutProps) {
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { currentParticipant, setParticipant } = useAppStore();
  const pwa = usePwaInstall();
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, refreshing } = usePullToRefresh(mainRef);
  useHeartbeat();
  const onlineFriendsCount = useFriendOnlineNotifications();
  const { theme } = useLabsTheme();
  const vb = useVerificationBanner();
  const prevLocationRef = useRef(location);

  useEffect(() => {
    if (prevLocationRef.current !== location) {
      scrollCache.set(prevLocationRef.current, window.scrollY);
      prevLocationRef.current = location;
      const cached = scrollCache.get(location);
      if (cached !== undefined) {
        requestAnimationFrame(() => window.scrollTo(0, cached));
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [location]);

  useEffect(() => {
    if (!localStorage.getItem("casksense_onboarded") && location !== "/labs/onboarding") {
      window.location.replace("/labs/onboarding");
    }
  }, [location]);

  useEffect(() => {
    const session = getSession();
    if (session.signedIn) return;
    tryAutoResume().then((resumed) => {
      if (!resumed && currentParticipant) {
        setParticipant(null);
      }
    });
  }, []);

  const isLabsHome = location === "/labs" || location === "/labs/";
  const isOnboarding = location === "/labs/onboarding";

  const handleButtonHaptic = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button:not(:disabled), a, [role='button'], [role='tab'], [role='switch']")) {
      triggerHaptic("light");
    }
  }, []);

  if (isOnboarding) {
    return (
      <div className={`labs-shell${theme === "light" ? " labs-light" : ""}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`labs-shell${theme === "light" ? " labs-light" : ""}`} onTouchStart={handleButtonHaptic}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3"
        style={{
          background: "var(--labs-header-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--labs-border-subtle)",
        }}
      >
        <Link href="/labs">
          <span
            className="labs-h3 tracking-tight cursor-pointer"
            style={{ color: "var(--labs-accent)" }}
            data-testid="labs-logo"
          >
            CaskSense <span style={{ fontWeight: 400, opacity: 0.75 }}>Labs</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LabsNotificationBell />
          <button
            onClick={() => { setSearchOpen(true); triggerHaptic("light"); }}
            className="flex items-center justify-center rounded-full transition-all"
            style={{
              width: 36,
              height: 36,
              background: "var(--labs-surface-elevated)",
              border: "1px solid var(--labs-border)",
              color: "var(--labs-text-secondary)",
              cursor: "pointer",
            }}
            data-testid="labs-search-btn"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: "var(--labs-accent-muted)",
              color: "var(--labs-accent)",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
            data-testid="labs-profile-btn"
          >
            {currentParticipant?.photoUrl ? (
              <img
                src={currentParticipant.photoUrl}
                alt=""
                style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--labs-accent)" }}
                data-testid="labs-profile-avatar"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            {currentParticipant?.name?.split(" ")[0] || "Profile"}
          </button>
        </div>
      </header>

      {(pullDistance > 0 || refreshing) && (
        <div
          className="labs-pull-indicator"
          style={{ height: pullDistance }}
          data-testid="labs-pull-refresh-indicator"
        >
          <GlencairnRefresh
            pullProgress={Math.min(pullDistance / 60, 1)}
            refreshing={refreshing}
            triggered={pullDistance > 60}
          />
        </div>
      )}

      {pwa.canInstall && (
        <div
          className="mx-4 mt-3 rounded-xl p-3 flex items-center gap-3 labs-fade-in"
          style={{
            background: "var(--labs-accent-muted)",
            border: "1px solid var(--labs-accent)",
          }}
          data-testid="labs-pwa-install-banner"
        >
          <Download className="w-5 h-5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>Install CaskSense</p>
            <p className="text-[11px]" style={{ color: "var(--labs-text-secondary)" }}>
              Add to home screen for the best experience
            </p>
          </div>
          <button
            onClick={pwa.install}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
            style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }}
            data-testid="labs-pwa-install-btn"
          >
            Install
          </button>
          <button
            onClick={pwa.dismiss}
            className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: "transparent", border: "none", color: "var(--labs-text-muted)", cursor: "pointer" }}
            data-testid="labs-pwa-dismiss-btn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {vb.needsBanner && (
        <div
          className="mx-4 mt-3 rounded-xl p-3 labs-fade-in"
          style={{
            background: "rgba(201, 167, 108, 0.12)",
            border: "1px solid var(--labs-accent)",
          }}
          data-testid="labs-verification-banner"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--labs-accent)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>
                E-Mail noch nicht verifiziert
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-secondary)" }}>
                Noch {vb.formatRemaining(vb.remainingMs)} Zeit, um deine E-Mail zu bestätigen.
              </p>
              {!vb.showVerifyInput ? (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => vb.setShowVerifyInput(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }}
                    data-testid="labs-verification-enter-code-btn"
                  >
                    Code eingeben
                  </button>
                  <button
                    onClick={vb.handleResend}
                    disabled={vb.resendLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "transparent", color: "var(--labs-accent)", border: "1px solid var(--labs-accent)", cursor: "pointer", opacity: vb.resendLoading ? 0.5 : 1 }}
                    data-testid="labs-verification-resend-btn"
                  >
                    {vb.resendLoading ? "Senden..." : vb.resendSuccess ? "Gesendet!" : "Code erneut senden"}
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={vb.verifyCode}
                      onChange={e => vb.setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-stelliger Code"
                      maxLength={6}
                      inputMode="numeric"
                      className="flex-1 px-3 py-1.5 rounded-lg text-center text-sm font-mono tracking-widest"
                      style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", color: "var(--labs-text)" }}
                      data-testid="labs-verification-code-input"
                      onKeyDown={e => e.key === "Enter" && vb.handleVerify()}
                      autoFocus
                    />
                    <button
                      onClick={vb.handleVerify}
                      disabled={vb.verifyLoading || vb.verifyCode.length < 6}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer", opacity: vb.verifyLoading || vb.verifyCode.length < 6 ? 0.5 : 1 }}
                      data-testid="labs-verification-submit-btn"
                    >
                      {vb.verifyLoading ? "..." : "Bestätigen"}
                    </button>
                  </div>
                  {vb.verifyError && <p className="text-[11px]" style={{ color: "var(--labs-danger)" }}>{vb.verifyError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => vb.setShowVerifyInput(false)}
                      className="text-[11px]"
                      style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={vb.handleResend}
                      disabled={vb.resendLoading}
                      className="text-[11px] underline"
                      style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", opacity: vb.resendLoading ? 0.5 : 1 }}
                      data-testid="labs-verification-resend-inline-btn"
                    >
                      {vb.resendLoading ? "Senden..." : vb.resendSuccess ? "Gesendet!" : "Code erneut senden"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={vb.dismiss}
              className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: "transparent", border: "none", color: "var(--labs-text-muted)", cursor: "pointer" }}
              data-testid="labs-verification-dismiss-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <main ref={mainRef} className="pb-20 min-h-[calc(100dvh-52px)]">
        <LabsErrorBoundary>
          {children}
        </LabsErrorBoundary>
      </main>

      {!isLabsHome && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-start justify-around"
          style={{
            background: "var(--labs-nav-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "0.5px solid var(--labs-border, rgba(255,255,255,0.1))",
            paddingTop: 4,
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              location === item.href ||
              (item.href === "/labs/tastings" && (
                location.startsWith("/labs/tastings") || location.startsWith("/labs/live") ||
                location.startsWith("/labs/results") || location.startsWith("/labs/host") ||
                location.startsWith("/labs/join") || location.startsWith("/labs/solo")
              )) ||
              (item.href === "/labs/entdecken" && (
                location.startsWith("/labs/entdecken") || location.startsWith("/labs/explore") ||
                location.startsWith("/labs/discover")
              )) ||
              (item.href === "/labs/taste" && location.startsWith("/labs/taste")) ||
              (item.href === "/labs/circle" && location.startsWith("/labs/circle"));

            const color = isActive ? "var(--labs-accent)" : "var(--labs-text-muted)";
            const isCircle = item.href === "/labs/circle";
            const testLabel = item.label.toLowerCase().replace(/\s+/g, "-");

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`labs-nav-item${isActive ? " labs-nav-item-active" : ""}`}
                  style={{ color }}
                  data-testid={`labs-nav-${testLabel}`}
                >
                  {isActive && <div className="labs-nav-dot" />}
                  <div className="labs-nav-icon" style={{ position: "relative" }}>
                    {item.icon === "glencairn" ? (
                      <GlencairnIcon color={color} size={22} />
                    ) : item.icon === "entdecken" ? (
                      <NavIconEntdecken active={isActive} />
                    ) : item.icon === "meinewelt" ? (
                      <NavIconMeineWelt active={isActive} />
                    ) : (
                      <NavIconCircle active={isActive} />
                    )}
                    {isCircle && onlineFriendsCount > 0 && (
                      <span
                        className="absolute flex items-center justify-center rounded-full"
                        style={{
                          top: -4,
                          right: -8,
                          minWidth: 16,
                          height: 16,
                          padding: "0 4px",
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                          background: "var(--labs-success)",
                          color: "var(--labs-bg)",
                          boxShadow: "0 0 0 2px var(--labs-nav-bg)",
                        }}
                        data-testid="circle-online-badge"
                      >
                        {onlineFriendsCount > 9 ? "9+" : onlineFriendsCount}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: isActive ? 500 : 400,
                      letterSpacing: "0.02em",
                      lineHeight: 1,
                      fontFamily: isActive
                        ? "var(--font-display, 'Playfair Display', serif)"
                        : "var(--font-ui, 'Inter', sans-serif)",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      )}

      <M2ProfileMenu open={profileOpen} onClose={() => setProfileOpen(false)} />
      <LabsGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
