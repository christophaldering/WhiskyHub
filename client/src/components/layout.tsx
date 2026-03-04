import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, LogOut, LogIn, Menu, User, Wine, ChevronDown, ArrowLeft, ArrowRight, X, Settings, Sparkles, KeyRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientToggle } from "@/components/ambient-toggle";
import { ViewSwitcherLegacy } from "@/components/view-switcher";
import { useState, useRef, useEffect, useCallback, useMemo, memo, createContext, useContext } from "react";
import { getSession, tryAutoResume } from "@/lib/session";
import SessionSheet from "@/components/session-sheet";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { WelcomeOverlay } from "@/components/welcome-overlay";
import { FeedbackButton } from "@/components/feedback-button";
import { SpotlightProvider, TourProvider, type SpotlightHint, type TourDefinition } from "@/components/spotlight-hint";
import { useTranslation } from "react-i18next";
import { useAppStore, LANDING_VERSION } from "@/lib/store";
import { LoginDialog } from "@/components/login-dialog";
import { useQuery } from "@tanstack/react-query";
import { profileApi, tastingApi, notificationApi, participantApi } from "@/lib/api";

type NavItem = { href: string; icon: any; label: string; match?: (loc: string) => boolean };
type NavSubgroup = { key: string; label: string; items: NavItem[] };
type NavGroup = { label: string; items: NavItem[]; defaultOpen?: boolean; subgroups?: NavSubgroup[] };

const FullBleedContext = createContext<{ setFullBleed: (v: boolean) => void }>({ setFullBleed: () => {} });

export function useLayoutFullBleed(active: boolean) {
  const { setFullBleed } = useContext(FullBleedContext);
  useEffect(() => {
    if (active) {
      setFullBleed(true);
      return () => setFullBleed(false);
    }
  }, [active, setFullBleed]);
}

function NotifBadge() {
  const { currentParticipant } = useAppStore();
  const { data: notifCount } = useQuery({
    queryKey: ["notification-count", currentParticipant?.id],
    queryFn: () => notificationApi.getUnreadCount(currentParticipant!.id),
    enabled: !!currentParticipant,
    refetchInterval: 30000,
  });
  const count = notifCount?.count ?? 0;
  if (count <= 0) return null;
  return (
    <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="badge-news-count">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ProfileAvatar({ size = 36, showName = false, showSignOut = false }: { size?: number; showName?: boolean; showSignOut?: boolean }) {
  const { currentParticipant, setParticipant } = useAppStore();
  const { t } = useTranslation();
  const { data: profile } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) return null;
  const photoUrl = profile?.photoUrl;
  const initials = currentParticipant.name
    ? currentParticipant.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";
  return (
    <div className="flex items-center gap-2">
      <Link href="/my-taste">
        <div
          title={t("profile.title")}
          className="cursor-pointer flex flex-col items-center gap-1"
          data-testid="avatar-profile"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={currentParticipant.name}
              className="rounded-full object-cover border-2 border-border/60"
              style={{ width: size, height: size }}
            />
          ) : (
            <div
              className="rounded-full bg-secondary border-2 border-border/60 flex items-center justify-center text-primary font-serif font-bold"
              style={{ width: size, height: size, fontSize: size * 0.38 }}
            >
              {initials || <User className="w-4 h-4 text-muted-foreground" />}
            </div>
          )}
          {showName && (
            <span className="text-xs text-muted-foreground font-serif truncate max-w-[80px] text-center leading-tight">{currentParticipant.name}</span>
          )}
        </div>
      </Link>
      {showSignOut && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setParticipant(null)}
          title={t('nav.leave')}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          data-testid="button-signout-mobile"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

const PUBLIC_NAV_ROUTES = ["/", "/profile/help", "/discover"];

function NavItemRow({ item, location, onNavigate, isPreviewMode, onLoginRequest }: { item: NavItem; location: string; onNavigate: () => void; isPreviewMode?: boolean; onLoginRequest?: () => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const isActive = item.match ? item.match(location) : location === item.href;
  const isPublicRoute = PUBLIC_NAV_ROUTES.includes(item.href);

  const handleClick = (e: React.MouseEvent) => {
    if (isPreviewMode && !isPublicRoute) {
      e.preventDefault();
      e.stopPropagation();
      onLoginRequest?.();
      return;
    }
    if (item.href === "/") {
      e.preventDefault();
      e.stopPropagation();
      if (!isPreviewMode && !window.confirm(t("nav.landingPageConfirm"))) {
        return;
      }
      onNavigate();
      navigate("/");
      return;
    }
    onNavigate();
  };

  if (item.href === "/") {
    return (
      <div
        data-nav-active={isActive ? "true" : undefined}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1 rounded-sm transition-all duration-300 cursor-pointer group",
          isPreviewMode && !isPublicRoute && "opacity-60",
          isActive
            ? "bg-secondary text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
        onClick={handleClick}
      >
        <item.icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive && "text-primary")} />
        <span className={cn("text-xs font-medium truncate", isActive && "font-semibold")}>{item.label}</span>
      </div>
    );
  }

  return (
    <Link key={item.href} href={item.href}>
      <div
        data-nav-active={isActive ? "true" : undefined}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1 rounded-sm transition-all duration-300 cursor-pointer group",
          isPreviewMode && !isPublicRoute && "opacity-60",
          isActive
            ? "bg-secondary text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
        onClick={(e) => {
          if (isPreviewMode && !isPublicRoute) {
            e.preventDefault();
            e.stopPropagation();
            onLoginRequest?.();
            return;
          }
          onNavigate();
        }}
      >
        <item.icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive && "text-primary")} />
        <span className={cn("text-xs font-medium truncate", isActive && "font-semibold")}>{item.label}</span>
        {item.href === "/app" && <NotifBadge />}
      </div>
    </Link>
  );
}

function NavContent({ navInnerRef, location, navGroups, onNavigate }: {
  navInnerRef?: React.RefObject<HTMLElement | null>;
  location: string;
  navGroups: NavGroup[];
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const allGroupItems = useMemo(() => {
    return navGroups.map(g => {
      const all = [...g.items];
      if (g.subgroups) g.subgroups.forEach(sg => all.push(...sg.items));
      return all;
    });
  }, [navGroups]);

  const activeGroupIndex = useMemo(() => {
    for (let gi = 0; gi < allGroupItems.length; gi++) {
      for (const item of allGroupItems[gi]) {
        const isActive = item.match ? item.match(location) : location === item.href;
        if (isActive) return gi;
      }
    }
    return 0;
  }, [location, allGroupItems]);

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExpandedGroups(prev => {
      const next = { ...prev };
      if (next[activeGroupIndex] === undefined) {
        next[activeGroupIndex] = true;
      }
      return next;
    });
  }, [activeGroupIndex]);

  const toggleGroup = (gi: number) => {
    setExpandedGroups(prev => {
      const isCurrentlyExpanded = prev[gi] !== undefined ? prev[gi] : (gi === activeGroupIndex || navGroups[gi].defaultOpen);
      if (isCurrentlyExpanded) {
        return { ...prev, [gi]: false };
      }
      const collapsed: Record<number, boolean> = {};
      for (let i = 0; i < navGroups.length; i++) {
        collapsed[i] = i === gi;
      }
      return collapsed;
    });
  };

  const [expandedSubgroups, setExpandedSubgroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("casksense:navSubgroups");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const toggleSubgroup = (key: string) => {
    setExpandedSubgroups(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("casksense:navSubgroups", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const activeSubgroupKey = useMemo(() => {
    for (const group of navGroups) {
      if (!group.subgroups) continue;
      for (const sg of group.subgroups) {
        for (const item of sg.items) {
          const isActive = item.match ? item.match(location) : location === item.href;
          if (isActive) return sg.key;
        }
      }
    }
    return null;
  }, [location, navGroups]);

  useEffect(() => {
    if (activeSubgroupKey && !expandedSubgroups[activeSubgroupKey]) {
      setExpandedSubgroups(prev => {
        const next = { ...prev, [activeSubgroupKey]: true };
        try { localStorage.setItem("casksense:navSubgroups", JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [activeSubgroupKey]);

  const isSubgroupExpanded = (key: string) => {
    if (expandedSubgroups[key] !== undefined) return expandedSubgroups[key];
    return false;
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const selector = (e as CustomEvent).detail as string;
      if (!selector) return;
      for (let gi = 0; gi < navGroups.length; gi++) {
        const hasTarget = allGroupItems[gi].some(item => {
          return selector === `[href="${item.href}"]`;
        });
        if (hasTarget) {
          setExpandedGroups(prev => ({ ...prev, [gi]: true }));
          if (navGroups[gi].subgroups) {
            for (const sg of navGroups[gi].subgroups!) {
              if (sg.items.some(item => selector === `[href="${item.href}"]`)) {
                setExpandedSubgroups(prev => {
                  const next = { ...prev, [sg.key]: true };
                  try { localStorage.setItem("casksense:navSubgroups", JSON.stringify(next)); } catch {}
                  return next;
                });
              }
            }
          }
          break;
        }
      }
    };
    window.addEventListener("tour-expand-for-selector", handler);
    return () => window.removeEventListener("tour-expand-for-selector", handler);
  }, [navGroups, allGroupItems]);

  const isGroupExpanded = (gi: number) => {
    if (expandedGroups[gi] !== undefined) return expandedGroups[gi];
    if (gi === activeGroupIndex) return true;
    if (navGroups[gi].defaultOpen) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border/40">
      <div className="p-5 border-b border-border/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif font-black tracking-tight text-primary">
              {t('app.name')}
            </h1>
            <ProfileAvatar size={54} />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-sans">
            {t('app.tagline')}
          </p>
        </div>
      </div>
      
      <nav ref={navInnerRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navGroups.map((group, gi) => {
          const expanded = isGroupExpanded(gi);
          const totalItems = group.items.length + (group.subgroups?.reduce((sum, sg) => sum + sg.items.length, 0) || 0);
          const groupHasActive = allGroupItems[gi].some(item =>
            item.match ? item.match(location) : location === item.href
          );
          return (
            <div key={gi}>
              {gi > 0 && <div className="border-t border-border/20 my-1.5" />}
              <button
                onClick={() => toggleGroup(gi)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1 rounded-sm transition-all duration-200 cursor-pointer group/header",
                  groupHasActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-group-toggle-${gi}`}
              >
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  groupHasActive ? "text-primary/80" : "text-muted-foreground/70"
                )}>
                  {group.label}
                  <span className="ml-1.5 text-[9px] font-normal normal-case tracking-normal opacity-60">
                    ({totalItems})
                  </span>
                </span>
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  expanded ? "rotate-0" : "-rotate-90",
                  groupHasActive ? "text-primary/60" : "text-muted-foreground/50"
                )} />
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-200",
                expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {group.items.map((item) => (
                  <NavItemRow key={item.href} item={item} location={location} onNavigate={onNavigate} isPreviewMode={!currentParticipant} onLoginRequest={() => setShowLoginDialog(true)} />
                ))}
                {group.subgroups?.map((sg) => {
                  const sgExpanded = isSubgroupExpanded(sg.key);
                  const sgHasActive = sg.items.some(item =>
                    item.match ? item.match(location) : location === item.href
                  );
                  return (
                    <div key={sg.key} className="mt-0.5">
                      <button
                        onClick={() => toggleSubgroup(sg.key)}
                        className={cn(
                          "w-full flex items-center justify-between pl-5 pr-3 py-1 rounded-sm transition-all duration-150 cursor-pointer",
                          sgHasActive
                            ? "text-primary/90"
                            : "text-muted-foreground/80 hover:text-foreground"
                        )}
                        data-testid={`nav-subgroup-toggle-${sg.key}`}
                      >
                        <span className={cn(
                          "text-[9px] font-medium uppercase tracking-wider",
                          sgHasActive ? "text-primary/70" : "text-muted-foreground/60"
                        )}>
                          {sg.label}
                        </span>
                        <ChevronDown className={cn(
                          "w-2.5 h-2.5 transition-transform duration-150",
                          sgExpanded ? "rotate-0" : "-rotate-90",
                          sgHasActive ? "text-primary/50" : "text-muted-foreground/40"
                        )} />
                      </button>
                      <div className={cn(
                        "overflow-hidden transition-all duration-150",
                        sgExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                      )}>
                        {sg.items.map((item) => (
                          <NavItemRow key={item.href} item={item} location={location} onNavigate={onNavigate} isPreviewMode={!currentParticipant} onLoginRequest={() => setShowLoginDialog(true)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/40 space-y-3">
        {currentParticipant && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="text-xs text-muted-foreground">
                Signed in as <span className="font-semibold text-foreground">{currentParticipant.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setParticipant(null); onNavigate(); }}
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                title={t('nav.leave')}
                data-testid="button-signout-sidebar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
        {!currentParticipant && (
          <>
            <LoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
            <Button
              onClick={() => setShowLoginDialog(true)}
              className="w-full gap-2"
              data-testid="button-sidebar-login"
            >
              <LogIn className="w-4 h-4" />
              {t('nav.login')}
            </Button>
          </>
        )}
        <ViewSwitcherLegacy />
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageToggle />
          <ThemeToggle />
          <AmbientToggle />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <a href="/impressum" className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors" data-testid="link-sidebar-impressum">{t("legal.impressum.title")}</a>
          <a href="/privacy" className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors" data-testid="link-sidebar-privacy">{t("legal.privacy.title")}</a>
          <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1" data-testid="text-age-notice">
            <span className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-full border border-muted-foreground/30 text-[8px] font-bold leading-none">18+</span>
          </span>
        </div>
      </div>
    </div>
  );
}

const MemoizedChildren = memo(function MemoizedChildren({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [fullBleed, setFullBleed] = useState(false);
  const { t } = useTranslation();
  const { currentParticipant, setParticipant, lastSeenLandingVersion, setLastSeenLandingVersion } = useAppStore();

  const [showSessionSheet, setShowSessionSheet] = useState(false);
  const [session, setSessionState] = useState(() => getSession());
  const refreshSession = useCallback(() => setSessionState(getSession()), []);

  useEffect(() => {
    tryAutoResume().then(() => refreshSession());
  }, [refreshSession]);

  const { data: publicSettings } = useQuery({
    queryKey: ["public-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/app-settings/public");
      if (!res.ok) return null;
      return res.json() as Promise<Record<string, string>>;
    },
    staleTime: 60000,
  });

  const serverBannerEnabled = publicSettings?.whats_new_enabled === "true";
  const serverBannerVersion = parseInt(publicSettings?.whats_new_version || "0") || 0;
  const serverBannerText = publicSettings?.whats_new_text || t('whatsNew.banner');
  const showWhatsNewBanner = !!currentParticipant && serverBannerEnabled && lastSeenLandingVersion < (serverBannerVersion || LANDING_VERSION);

  const onboardingDone = true;

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollLeft = 0;
        mainRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
    });
  }, [location]);

  useEffect(() => {
    if (!currentParticipant?.id) return;
    participantApi.heartbeat(currentParticipant.id).catch(() => {});
    const interval = setInterval(() => {
      participantApi.heartbeat(currentParticipant.id).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentParticipant?.id]);

  const navGroups: NavGroup[] = useMemo(() => [
    {
      label: t('navGroup.genuss'),
      defaultOpen: true,
      items: [
        { href: "/tasting", icon: Home, label: t('nav.lobby'), match: (loc: string) => loc === "/tasting" },
        { href: "/tasting/sessions", icon: Wine, label: t('nav.sessions'), match: (loc: string) => loc === "/tasting/sessions" },
      ],
    },
    {
      label: t('navGroup.profil'),
      items: [
        { href: "/profile", icon: User, label: t('profile.title'), match: (loc: string) => loc === "/profile" },
        { href: "/profile/account", icon: Settings, label: t('nav.account') },
      ],
    },
  ], [t]);

  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  const scrollNavToActive = useCallback((navEl: HTMLElement | null) => {
    if (!navEl) return;
    requestAnimationFrame(() => {
      const active = navEl.querySelector('[data-nav-active="true"]');
      if (active) {
        active.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });
  }, []);

  useEffect(() => {
    if (open) scrollNavToActive(mobileNavRef.current);
  }, [open, scrollNavToActive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollNavToActive(desktopNavRef.current);
    }, 50);
    return () => clearTimeout(timer);
  }, [location, scrollNavToActive]);

  const handleNavigate = useCallback(() => setOpen(false), []);

  const spotlightHints: SpotlightHint[] = useMemo(() => {
    return [];
  }, []);

  const tourDefinitions: TourDefinition[] = useMemo(() => {
    if (!currentParticipant) return [];
    const p = "right" as const;
    return [
      {
        id: "tour-guest",
        level: "guest" as const,
        steps: [
          { id: "guest-1", targetSelector: '[href="/tasting"]', message: t("tour.guest.step1"), position: p },
          { id: "guest-2", targetSelector: '[href="/tasting/sessions"]', message: t("tour.guest.step2"), position: p },
          { id: "guest-3", targetSelector: '[href="/tasting/sessions"]', message: t("tour.guest.step3"), position: p },
        ],
      },
      {
        id: "tour-explorer",
        level: "explorer" as const,
        steps: [
          { id: "explorer-1", targetSelector: '[href="/my/journal"]', message: t("tour.explorer.step1"), position: p },
          { id: "explorer-2", targetSelector: '[href="/profile"]', message: t("tour.explorer.step2"), position: p },
          { id: "explorer-3", targetSelector: '[href="/my/wishlist"]', message: t("tour.explorer.step3"), position: p },
        ],
      },
      {
        id: "tour-connoisseur",
        level: "connoisseur" as const,
        steps: [
          { id: "connoisseur-1", targetSelector: '[href="/discover"]', message: t("tour.connoisseur.step1"), position: p },
          { id: "connoisseur-2", targetSelector: '[href="/my/journal"]', message: t("tour.connoisseur.step2"), position: p },
          { id: "connoisseur-3", targetSelector: '[href="/discover"]', message: t("tour.connoisseur.step3"), position: p },
        ],
      },
      {
        id: "tour-analyst",
        level: "analyst" as const,
        steps: [
          { id: "analyst-1", targetSelector: '[href="/my/journal"]', message: t("tour.analyst.step1"), position: p },
          { id: "analyst-2", targetSelector: '[href="/my/journal"]', message: t("tour.analyst.step2"), position: p },
          { id: "analyst-3", targetSelector: '[href="/my/journal"]', message: t("tour.analyst.step3"), position: p },
        ],
      },
    ];
  }, [currentParticipant, t]);

  return (
    <FullBleedContext.Provider value={{ setFullBleed }}>
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 z-0 bg-background" />

      <WelcomeOverlay />
      <SpotlightProvider hints={spotlightHints} paused={!onboardingDone} />
      <TourProvider tours={tourDefinitions} paused={!onboardingDone} />

      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/95 backdrop-blur-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          {location !== "/app" && location !== "/" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary h-8 w-8 flex-shrink-0"
              onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = "/tasting"; }}
              data-testid="button-mobile-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <span className="font-serif font-bold text-lg text-primary truncate">{t('app.name')}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ViewSwitcherLegacy />
          <ProfileAvatar size={36} showName={false} showSignOut={false} />
          <button
            onClick={() => setShowSessionSheet(true)}
            className={cn(
              "rounded-full transition-colors",
              session.signedIn
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-secondary"
            )}
            style={{
              padding: session.signedIn ? "4px 10px" : "6px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              maxWidth: 160,
              border: session.signedIn ? "1px solid hsl(var(--primary) / 0.2)" : "none",
            }}
            data-testid="button-classic-session"
          >
            {session.signedIn ? (
              <>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(session.name || "Account").length > 14
                    ? (session.name || "Account").slice(0, 12) + "…"
                    : (session.name || "Account")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </>
            ) : (
              <KeyRound className="w-4 h-4" strokeWidth={1.6} />
            )}
          </button>
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-secondary h-8 w-8">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-border/40 w-72 bg-card">
              <NavContent navInnerRef={mobileNavRef} location={location} navGroups={navGroups} onNavigate={handleNavigate} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex relative z-10 overflow-hidden" style={{ height: '100dvh' }}>
        <aside className="hidden md:block w-72 h-full">
          <NavContent navInnerRef={desktopNavRef} location={location} navGroups={navGroups} onNavigate={handleNavigate} />
        </aside>
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-background" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {showWhatsNewBanner && (
            <div className="bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10 border-b border-amber-500/20">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-2.5 flex items-center justify-between gap-3">
                <a href="/" className="flex items-center gap-2 text-sm text-foreground/80 hover:text-primary transition-colors group" data-testid="banner-whats-new">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-medium">{serverBannerText}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <button
                  onClick={() => setLastSeenLandingVersion(serverBannerVersion || LANDING_VERSION)}
                  className="text-muted-foreground/50 hover:text-foreground transition-colors p-0.5 rounded"
                  data-testid="button-dismiss-whats-new"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className={cn(
            "animate-in fade-in duration-700 min-w-0",
            fullBleed
              ? "w-full px-0 py-0"
              : "w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-6 md:py-12 mobile-bottom-spacing"
          )}>
            <MemoizedChildren>{children}</MemoizedChildren>
          </div>
        </main>
        <FeedbackButton />
      </div>

      <SessionSheet
        open={showSessionSheet}
        onClose={() => setShowSessionSheet(false)}
        onSessionChange={refreshSession}
        defaultMode="log"
        variant="light"
      />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/40 safe-area-bottom" style={{ paddingLeft: 'env(safe-area-inset-left, 0)', paddingRight: 'env(safe-area-inset-right, 0)' }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {(() => {
            const tastingMatch = location.match(/^\/tasting\/([a-f0-9-]{8,})/i);
            const inTasting = !!tastingMatch;
            return [
              inTasting
                ? { href: `/tasting/${tastingMatch![1]}`, icon: ArrowLeft, label: t('nav.backToTasting'), isCockpit: true }
                : { href: "/home", icon: Home, label: t('nav.lobbyShort') },
              { href: "/tasting", icon: Wine, label: "Tasting" },
              { href: "/profile", icon: User, label: t('navGroup.profil', 'Profil'), isMore: false },
            ];
          })().map((item) => {
            const isActive = location === item.href;
            if ((item as any).isCockpit) {
              return (
                <button
                  key="cockpit"
                  onClick={() => window.dispatchEvent(new CustomEvent("casksense:exitFocusMode"))}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] text-primary transition-colors"
                  data-testid="bottom-nav-cockpit"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-[10px] leading-tight font-semibold truncate max-w-[64px]">{item.label}</span>
                </button>
              );
            }
            if ((item as any).isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="bottom-nav-more"
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-[10px] leading-tight truncate max-w-[64px]">{item.label}</span>
                </button>
              );
            }
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`bottom-nav-${item.href.replace("/", "") || "home"}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className={cn("text-[10px] leading-tight truncate max-w-[64px]", isActive && "font-semibold")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </FullBleedContext.Provider>
  );
}
