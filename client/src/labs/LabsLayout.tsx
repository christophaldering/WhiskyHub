import { ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Radar, Users, User, Compass, BookOpen, Bell, Download, X, Volume2, VolumeX, RefreshCw, Sun, Moon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { getSession, tryAutoResume } from "@/lib/session";
import { playSoundscape, stopSoundscape, setVolume, type Soundscape } from "@/lib/ambient";
import { queryClient } from "@/lib/queryClient";
import M2ProfileMenu from "@/components/m2/M2ProfileMenu";
import LabsErrorBoundary from "./LabsErrorBoundary";
import "./labs-theme.css";

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

const NAV_ITEMS = [
  { href: "/labs/tastings", icon: "glencairn" as const, label: "Tastings" },
  { href: "/labs/explore", icon: "compass" as const, label: "Explore" },
  { href: "/labs/discover", icon: "book" as const, label: "Discover" },
  { href: "/labs/taste", icon: "radar" as const, label: "Taste" },
  { href: "/labs/circle", icon: "circle" as const, label: "Circle" },
];

const SOUNDSCAPE_ICONS: Record<Soundscape, string> = {
  fireplace: "\uD83D\uDD25",
  rain: "\uD83C\uDF27",
  night: "\uD83C\uDF19",
  bagpipe: "\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F",
};

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

function useHeartbeat() {
  const { currentParticipant } = useAppStore();
  useEffect(() => {
    const pid = currentParticipant?.id;
    if (!pid) return;
    const beat = () => { participantApi.heartbeat(pid).catch(() => {}); };
    beat();
    const interval = setInterval(beat, 120000);
    return () => clearInterval(interval);
  }, [currentParticipant?.id]);
}

function useFriendOnlineNotifications() {
  const { currentParticipant } = useAppStore();
  const prevOnlineRef = useRef<Set<string> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const pid = currentParticipant?.id;
    if (!pid) return;
    let cancelled = false;

    const check = async () => {
      try {
        const onlineRes = await fetch(`/api/participants/${pid}/friends/online`).then(r => r.json());
        if (cancelled) return;
        const currentOnline = new Set<string>(
          (onlineRes.online || []).map((f: { friendId: string }) => f.friendId)
        );
        prevOnlineRef.current = currentOnline;
        mountedRef.current = true;
      } catch {}
    };

    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentParticipant?.id]);
}

function LabsNotificationBell() {
  const [count] = useState(() => {
    try {
      const stored = localStorage.getItem("cs_notif_count");
      return stored ? parseInt(stored, 10) : 0;
    } catch { return 0; }
  });
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all relative"
        style={{
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
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: "var(--labs-danger)", color: "var(--labs-bg)" }}
            data-testid="labs-notification-count"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-[99]" />
          <div
            className="fixed top-14 left-4 right-4 max-w-[340px] ml-auto rounded-2xl p-4 z-[100]"
            style={{
              background: "var(--labs-surface)",
              border: "1px solid var(--labs-border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            data-testid="labs-notification-dropdown"
          >
            <div className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>
              Notifications
            </div>
            <div className="text-xs text-center py-3" style={{ color: "var(--labs-text-muted)" }}>
              No new notifications
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LabsAmbientToggle() {
  const {
    ambientPlaying, ambientSoundscape, ambientVolume,
    setAmbientPlaying, setAmbientSoundscape, setAmbientVolume,
  } = useAppStore();
  const [open, setOpen] = useState(false);

  const start = useCallback((soundscape: Soundscape, vol: number) => {
    playSoundscape(soundscape);
    setVolume(vol);
    setAmbientPlaying(true);
    setAmbientSoundscape(soundscape);
  }, [setAmbientPlaying, setAmbientSoundscape]);

  const stop = useCallback(() => {
    stopSoundscape();
    setAmbientPlaying(false);
  }, [setAmbientPlaying]);

  const togglePlay = () => {
    if (ambientPlaying) stop();
    else start(ambientSoundscape, ambientVolume);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
        style={{
          background: ambientPlaying ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
          border: `1px solid ${ambientPlaying ? "var(--labs-accent)" : "var(--labs-border)"}`,
          color: ambientPlaying ? "var(--labs-accent)" : "var(--labs-text-secondary)",
          cursor: "pointer",
        }}
        data-testid="labs-ambient-toggle"
      >
        {ambientPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-[99]" />
          <div
            className="fixed top-14 right-4 w-56 rounded-2xl p-4 z-[100] space-y-4"
            style={{
              background: "var(--labs-surface)",
              border: "1px solid var(--labs-border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            data-testid="labs-ambient-popover"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>
              Ambient Sound
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {(["fireplace", "rain", "night", "bagpipe"] as Soundscape[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setAmbientSoundscape(s);
                    if (ambientPlaying) start(s, ambientVolume);
                  }}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] transition-all"
                  style={{
                    background: ambientSoundscape === s ? "var(--labs-accent-muted)" : "transparent",
                    border: `1px solid ${ambientSoundscape === s ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    color: ambientSoundscape === s ? "var(--labs-accent)" : "var(--labs-text-muted)",
                    cursor: "pointer",
                  }}
                  data-testid={`labs-ambient-${s}`}
                >
                  <span className="text-base">{SOUNDSCAPE_ICONS[s]}</span>
                  <span className="capitalize">{s === "bagpipe" ? "Pipes" : s}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>Volume</p>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ambientVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setAmbientVolume(v);
                  setVolume(v);
                }}
                className="w-full accent-[var(--labs-accent)]"
                style={{ height: 4 }}
                data-testid="labs-ambient-volume"
              />
            </div>
            <button
              onClick={togglePlay}
              className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: ambientPlaying ? "var(--labs-surface-elevated)" : "var(--labs-accent)",
                color: ambientPlaying ? "var(--labs-text)" : "var(--labs-bg)",
                border: ambientPlaying ? "1px solid var(--labs-border)" : "none",
                cursor: "pointer",
              }}
              data-testid="labs-ambient-play"
            >
              {ambientPlaying ? "Stop" : "Play"}
            </button>
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

export default function LabsLayout({ children }: LabsLayoutProps) {
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentParticipant, setParticipant } = useAppStore();
  const pwa = usePwaInstall();
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, refreshing } = usePullToRefresh(mainRef);
  useHeartbeat();
  useFriendOnlineNotifications();
  const { theme, toggle: toggleTheme } = useLabsTheme();

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

  return (
    <div className={`labs-shell${theme === "light" ? " labs-light" : ""}`}>
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
            className="labs-serif text-lg font-semibold tracking-tight cursor-pointer"
            style={{ color: "var(--labs-accent)" }}
            data-testid="labs-logo"
          >
            CaskSense <span style={{ fontWeight: 400, opacity: 0.7 }}>Labs</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-full transition-all"
            style={{
              width: 32,
              height: 32,
              background: "var(--labs-accent-muted)",
              color: "var(--labs-accent)",
              border: "none",
              cursor: "pointer",
            }}
            title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            data-testid="labs-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <LabsNotificationBell />
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
            <User className="w-4 h-4" />
            {currentParticipant?.name?.split(" ")[0] || "Profile"}
          </button>
        </div>
      </header>

      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all"
          style={{
            height: pullDistance,
            overflow: "hidden",
            background: "var(--labs-bg)",
          }}
          data-testid="labs-pull-refresh-indicator"
        >
          <RefreshCw
            className="w-5 h-5 transition-transform"
            style={{
              color: pullDistance > 60 ? "var(--labs-accent)" : "var(--labs-text-muted)",
              transform: `rotate(${pullDistance * 3.6}deg)`,
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
            }}
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
            <p className="text-[10px]" style={{ color: "var(--labs-text-secondary)" }}>
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

      <main ref={mainRef} className="pb-20 min-h-[calc(100dvh-52px)]">
        <LabsErrorBoundary>
          {children}
        </LabsErrorBoundary>
      </main>

      {!isLabsHome && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
          style={{
            background: "var(--labs-nav-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid var(--labs-border-subtle)",
            paddingTop: 6,
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/labs/tastings" && location.startsWith(item.href)) ||
              (item.href === "/labs/tastings" && (location.startsWith("/labs/tastings") || location.startsWith("/labs/live") || location.startsWith("/labs/results") || location.startsWith("/labs/host/")));

            const color = isActive ? "var(--labs-accent)" : "var(--labs-text-muted)";

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex flex-col items-center gap-0.5 px-4 py-1 cursor-pointer transition-colors relative"
                  style={{ color }}
                  data-testid={`labs-nav-${item.label.toLowerCase()}`}
                >
                  {isActive && (
                    <div
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                      style={{ background: "var(--labs-accent)" }}
                    />
                  )}
                  {item.icon === "glencairn" ? (
                    <GlencairnIcon color={color} size={22} />
                  ) : item.icon === "radar" ? (
                    <Radar className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  ) : item.icon === "compass" ? (
                    <Compass className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  ) : item.icon === "book" ? (
                    <BookOpen className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  ) : (
                    <Users className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.6} />
                  )}
                  <span
                    className="text-[10px]"
                    style={{ fontWeight: isActive ? 600 : 500, letterSpacing: "0.02em" }}
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
    </div>
  );
}
