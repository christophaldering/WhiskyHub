import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, LogOut, Menu, BookOpen, User, Wine, Users, Info, NotebookPen, Trophy, Library, Activity, Sparkles, GitCompareArrows, FileText, Rss, Calendar, Download, LayoutDashboard, ClipboardList, CircleDot, Puzzle, Medal, ShieldAlert, Landmark, Database, Map, Heart, Brain, LayoutGrid, Star, Package, Archive, Bell, History, ChevronDown, HardDriveDownload, HeartHandshake, BarChart3, Newspaper, Globe, ArrowLeft, GlassWater, Microscope } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientToggle } from "@/components/ambient-toggle";
import { useState, useRef, useEffect, useCallback, useMemo, memo, createContext, useContext } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { WelcomeOverlay } from "@/components/welcome-overlay";
import { FeedbackButton } from "@/components/feedback-button";
import { LevelOnboarding } from "@/components/level-onboarding";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { profileApi, tastingApi, notificationApi, participantApi } from "@/lib/api";

type NavItem = { href: string; icon: any; label: string; match?: (loc: string) => boolean };
type NavGroup = { label: string; items: NavItem[]; defaultOpen?: boolean };

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
      <Link href="/profile">
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

function NavItemRow({ item, location, onNavigate }: { item: NavItem; location: string; onNavigate: () => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const isActive = item.match ? item.match(location) : location === item.href;

  const handleClick = (e: React.MouseEvent) => {
    if (item.href === "/") {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm(t("nav.landingPageConfirm"))) {
        onNavigate();
        navigate("/");
      }
      return;
    }
    onNavigate();
  };

  if (item.href === "/") {
    return (
      <div
        data-nav-active={isActive ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-1.5 rounded-sm transition-all duration-300 cursor-pointer group",
          isActive
            ? "bg-secondary text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
        onClick={handleClick}
      >
        <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
        <span className={cn("text-sm font-medium truncate", isActive && "font-semibold")}>{item.label}</span>
      </div>
    );
  }

  return (
    <Link key={item.href} href={item.href}>
      <div
        data-nav-active={isActive ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-1.5 rounded-sm transition-all duration-300 cursor-pointer group",
          isActive
            ? "bg-secondary text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
        onClick={onNavigate}
      >
        <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
        <span className={cn("text-sm font-medium truncate", isActive && "font-semibold")}>{item.label}</span>
        {item.href === "/news" && <NotifBadge />}
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

  const activeGroupIndex = useMemo(() => {
    for (let gi = 0; gi < navGroups.length; gi++) {
      for (const item of navGroups[gi].items) {
        const isActive = item.match ? item.match(location) : location === item.href;
        if (isActive) return gi;
      }
    }
    return 0;
  }, [location, navGroups]);

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
    setExpandedGroups(prev => ({ ...prev, [gi]: !prev[gi] }));
  };

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
          const groupHasActive = group.items.some(item =>
            item.match ? item.match(location) : location === item.href
          );
          return (
            <div key={gi}>
              {gi > 0 && <div className="border-t border-border/20 my-1.5" />}
              <button
                onClick={() => toggleGroup(gi)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-sm transition-all duration-200 cursor-pointer group/header",
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
                    ({group.items.length})
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
                expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {group.items.map((item) => (
                  <NavItemRow key={item.href} item={item} location={location} onNavigate={onNavigate} />
                ))}
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
            <div className="space-y-1 px-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t('nav.levelSelector.label')}</span>
              <div className="grid grid-cols-4 gap-1" data-testid="select-experience-level">
                {([
                  { id: "guest", icon: User, color: "text-slate-500", activeBg: "bg-slate-100 border-slate-300" },
                  { id: "explorer", icon: Star, color: "text-amber-500", activeBg: "bg-amber-50 border-amber-300" },
                  { id: "connoisseur", icon: Sparkles, color: "text-primary", activeBg: "bg-primary/10 border-primary/50" },
                  { id: "analyst", icon: Brain, color: "text-violet-500", activeBg: "bg-violet-50 border-violet-300" },
                ] as const).map((lvl) => {
                  const Icon = lvl.icon;
                  const isActive = (currentParticipant.experienceLevel || "connoisseur") === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={async () => {
                        try {
                          await participantApi.updateExperienceLevel(currentParticipant.id, lvl.id);
                          setParticipant({ ...currentParticipant, experienceLevel: lvl.id });
                        } catch {}
                      }}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border text-center transition-all ${
                        isActive
                          ? `${lvl.activeBg} ring-1 ring-primary/10`
                          : "border-transparent hover:border-border/40 hover:bg-secondary/30"
                      }`}
                      title={t(`nav.levelSelector.${lvl.id}`)}
                      data-testid={`button-sidebar-level-${lvl.id}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? lvl.color : "text-muted-foreground/50"}`} />
                      <span className={`text-[9px] leading-tight ${isActive ? "font-semibold text-foreground" : "text-muted-foreground/60"}`}>
                        {t(`nav.levelSelector.${lvl.id}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageToggle />
          <ThemeToggle />
          <AmbientToggle />
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
  const { currentParticipant, setParticipant } = useAppStore();

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

  const { previewExperienceLevel } = useAppStore();
  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);
  const isAdmin = currentParticipant?.role === "admin";
  const expLevel = currentParticipant ? (currentParticipant.experienceLevel || "connoisseur") : previewExperienceLevel;
  const LEVELS = ["guest", "explorer", "connoisseur", "analyst"] as const;
  const levelIndex = LEVELS.indexOf(expLevel as any);
  const atLeast = (min: typeof LEVELS[number]) => levelIndex >= LEVELS.indexOf(min);

  const navGroups: NavGroup[] = useMemo(() => [
    {
      label: t('navGroup.main'),
      defaultOpen: true,
      items: [
        { href: "/app", icon: Home, label: t('nav.lobby') },
        { href: "/news", icon: Newspaper, label: t('nav.news') },
        { href: "/sessions", icon: Wine, label: t('nav.sessions') },
        ...(atLeast("explorer") ? [{ href: "/calendar", icon: Calendar, label: t('nav.calendar') }] : []),
      ],
    },
    ...(atLeast("explorer") ? [{
      label: t('navGroup.myProfile'),
      items: [
        { href: "/profile", icon: User, label: t('profile.title') },
        { href: "/flavor-profile", icon: Activity, label: t('nav.flavorProfile') },
        ...(atLeast("connoisseur") ? [
          { href: "/badges", icon: Trophy, label: t('nav.badges') },
          { href: "/reminders", icon: Bell, label: t('nav.reminders') },
        ] : []),
        ...(atLeast("analyst") ? [
          { href: "/flavor-wheel", icon: CircleDot, label: t('nav.flavorWheel') },
        ] : []),
      ],
    }] : []),
    ...(atLeast("explorer") ? [{
      label: t('navGroup.myTastings'),
      items: [
        { href: "/my-tastings", icon: History, label: t('nav.myTastings') },
        { href: "/journal", icon: NotebookPen, label: t('nav.journal') },
      ],
    }] : []),
    ...(atLeast("explorer") ? [{
      label: t('navGroup.myWhiskys'),
      items: [
        { href: "/my-whiskies", icon: GlassWater, label: t('nav.myWhiskies') },
        { href: "/wishlist", icon: Star, label: t('nav.wishlist') },
        ...(atLeast("connoisseur") ? [
          { href: "/collection", icon: Archive, label: t('nav.collection') },
        ] : []),
      ],
    }] : []),
    ...(atLeast("connoisseur") ? [{
      label: t('navGroup.tools'),
      items: [
        { href: "/recommendations", icon: Sparkles, label: t('nav.recommendations') },
        { href: "/comparison", icon: GitCompareArrows, label: t('nav.comparison') },
        { href: "/tasting-templates", icon: FileText, label: t('nav.templates') },
        { href: "/export-notes", icon: Download, label: t('nav.exportNotes') },
        { href: "/pairings", icon: Puzzle, label: t('nav.pairings') },
        ...(atLeast("analyst") ? [
          { href: "/analytics", icon: BarChart3, label: t('nav.analytics') },
          { href: "/data-export", icon: HardDriveDownload, label: t('nav.dataExport') },
        ] : []),
      ],
    }] : []),
    ...(atLeast("connoisseur") ? [{
      label: t('navGroup.community'),
      items: [
        { href: "/community-rankings", icon: BarChart3, label: t('nav.communityRankings') },
        { href: "/taste-twins", icon: HeartHandshake, label: t('nav.tasteTwins') },
        { href: "/friends", icon: Users, label: t('nav.friends') },
        { href: "/activity", icon: Rss, label: t('nav.activity') },
        { href: "/leaderboard", icon: Medal, label: t('nav.leaderboard') },
      ],
    }] : []),
    ...(atLeast("connoisseur") ? [{
      label: t('navGroup.whiskyKnowledge'),
      items: [
        { href: "/lexicon", icon: Library, label: t('nav.lexicon') },
        { href: "/distilleries", icon: Landmark, label: t('nav.distilleries') },
        { href: "/distillery-map", icon: Map, label: t('nav.distilleryMap') },
        { href: "/bottlers", icon: Package, label: t('nav.bottlers') },
        { href: "/research", icon: Microscope, label: t('nav.research') },
      ],
    }] : []),
    {
      label: t('navGroup.aboutPlatform'),
      items: [
        { href: "/about", icon: Info, label: t('nav.about') },
        ...(atLeast("connoisseur") ? [
          { href: "/about-method", icon: BookOpen, label: t('nav.aboutMethod') },
          { href: "/features", icon: LayoutGrid, label: t('nav.features') },
          { href: "/donate", icon: Heart, label: t('nav.donate') },
        ] : []),
        { href: "/", icon: Globe, label: t('nav.landingPage') },
      ],
    },
    ...((isHost || isAdmin) ? [
      {
        label: t('navGroup.host'),
        items: [
          { href: "/host-dashboard", icon: LayoutDashboard, label: t('nav.hostDashboard') },
          { href: "/recap", icon: ClipboardList, label: t('nav.recap'), match: (loc: string) => loc === "/recap" || loc.startsWith("/recap/") },
          ...((isAdmin || currentParticipant?.canAccessWhiskyDb) ? [
            { href: "/whisky-database", icon: Database, label: t('nav.whiskyDatabase') },
          ] : []),
          ...(atLeast("analyst") ? [
            { href: "/benchmark", icon: Brain, label: t('nav.benchmark') },
          ] : []),
        ],
      },
    ] : []),
    ...(currentParticipant?.role === "admin" ? [
      {
        label: t('navGroup.admin'),
        items: [
          { href: "/admin", icon: ShieldAlert, label: t('nav.admin') },
        ],
      },
    ] : []),
  ], [t, isHost, isAdmin, expLevel, currentParticipant?.canAccessWhiskyDb, currentParticipant?.role, previewExperienceLevel]);

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

  return (
    <FullBleedContext.Provider value={{ setFullBleed }}>
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 z-0 bg-background" />

      <WelcomeOverlay />
      <LevelOnboarding />

      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border/40 bg-card/95 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-lg text-primary">{t('app.name')}</span>
        </div>
        <div className="flex items-center gap-2">
          <ProfileAvatar size={48} showName showSignOut />
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-secondary">
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/40 safe-area-bottom" style={{ paddingLeft: 'env(safe-area-inset-left, 0)', paddingRight: 'env(safe-area-inset-right, 0)' }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {(() => {
            const tastingMatch = location.match(/^\/tasting\/([^/]+)/);
            const inTasting = !!tastingMatch;
            return [
              inTasting
                ? { href: `/tasting/${tastingMatch![1]}`, icon: ArrowLeft, label: t('nav.backToTasting'), isCockpit: true }
                : { href: "/app", icon: Home, label: t('nav.lobby') },
              { href: "/sessions", icon: Wine, label: t('nav.sessions') },
              { href: "/journal", icon: NotebookPen, label: t('nav.journal') },
              { href: "/calendar", icon: Calendar, label: t('nav.calendar') },
              { href: "/more", icon: Menu, label: t('nav.more'), isMore: true },
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
                  <span className="text-[10px] leading-tight font-semibold">{item.label}</span>
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
                  <span className="text-[10px] leading-tight">{item.label}</span>
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
                  <span className={cn("text-[10px] leading-tight", isActive && "font-semibold")}>{item.label}</span>
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
