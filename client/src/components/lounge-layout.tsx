import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home, LogOut, Menu, User, Wine, Users, NotebookPen,
  Activity, Sparkles, GitCompareArrows, Calendar, Library,
  Landmark, Map, Package, Star, Archive, Bell, History,
  ChevronDown, HeartHandshake, BarChart3, Newspaper,
  Globe, ArrowLeft, GlassWater, Trophy, CircleDot,
  Download, HardDriveDownload, FileText, Puzzle, Brain,
  Info, BookOpen, Heart, LayoutGrid, LayoutDashboard,
  ClipboardList, Database, ShieldAlert, Medal, Camera,
  Armchair, BookMarked, UserCircle, Rss
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientToggle } from "@/components/ambient-toggle";
import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { FeedbackButton } from "@/components/feedback-button";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { profileApi, tastingApi, notificationApi } from "@/lib/api";
import { useVariantSwitch } from "@/lib/route-mapping";

type NavItem = { href: string; icon: any; label: string; match?: (loc: string) => boolean };
type NavRoom = { id: string; icon: any; label: string; description: string; items: NavItem[]; defaultOpen?: boolean };

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
    <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LoungeProfileAvatar({ size = 36 }: { size?: number }) {
  const { currentParticipant } = useAppStore();
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
    <Link href="/lounge/my-salon/profile">
      <div className="cursor-pointer" data-testid="lounge-avatar-profile">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={currentParticipant.name}
            className="rounded-full object-cover border-2 border-amber-700/30"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="rounded-full bg-amber-900/20 border-2 border-amber-700/30 flex items-center justify-center text-amber-200 font-serif font-bold"
            style={{ width: size, height: size, fontSize: size * 0.38 }}
          >
            {initials || <User className="w-4 h-4 text-muted-foreground" />}
          </div>
        )}
      </div>
    </Link>
  );
}

function LoungeNavItemRow({ item, location, onNavigate }: { item: NavItem; location: string; onNavigate: () => void }) {
  const isActive = item.match ? item.match(location) : location === item.href;

  return (
    <Link href={item.href}>
      <div
        data-nav-active={isActive ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer group",
          isActive
            ? "bg-amber-900/20 text-amber-200 border-l-2 border-amber-500/60"
            : "text-muted-foreground hover:text-foreground hover:bg-amber-900/10"
        )}
        onClick={onNavigate}
        data-testid={`lounge-nav-${item.href.replace(/\//g, '-').slice(1)}`}
      >
        <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-amber-400")} />
        <span className={cn("text-sm font-medium truncate", isActive && "font-semibold")}>{item.label}</span>
        {item.href === "/lounge/news" && <NotifBadge />}
      </div>
    </Link>
  );
}

function LoungeNavContent({ navInnerRef, location, rooms, onNavigate }: {
  navInnerRef?: React.RefObject<HTMLElement | null>;
  location: string;
  rooms: NavRoom[];
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const { switchVariant } = useVariantSwitch();

  const activeRoomIndex = useMemo(() => {
    for (let ri = 0; ri < rooms.length; ri++) {
      for (const item of rooms[ri].items) {
        const isActive = item.match ? item.match(location) : location === item.href;
        if (isActive) return ri;
      }
    }
    return 0;
  }, [location, rooms]);

  const [expandedRooms, setExpandedRooms] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExpandedRooms(prev => {
      const next = { ...prev };
      if (next[activeRoomIndex] === undefined) {
        next[activeRoomIndex] = true;
      }
      return next;
    });
  }, [activeRoomIndex]);

  const toggleRoom = (ri: number) => {
    setExpandedRooms(prev => ({ ...prev, [ri]: !prev[ri] }));
  };

  const isRoomExpanded = (ri: number) => {
    if (expandedRooms[ri] !== undefined) return expandedRooms[ri];
    if (ri === activeRoomIndex) return true;
    if (rooms[ri].defaultOpen) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border/40">
      <div className="p-5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Armchair className="w-5 h-5 text-amber-500" />
            <div>
              <h1 className="text-xl font-serif font-black tracking-tight text-primary">
                {t('app.name')}
              </h1>
              <p className="text-[10px] text-amber-500/70 uppercase tracking-widest font-sans">
                Lounge
              </p>
            </div>
          </div>
          <LoungeProfileAvatar size={48} />
        </div>
      </div>

      <nav ref={navInnerRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {rooms.map((room, ri) => {
          const expanded = isRoomExpanded(ri);
          const roomHasActive = room.items.some(item =>
            item.match ? item.match(location) : location === item.href
          );
          return (
            <div key={room.id}>
              {ri > 0 && <div className="border-t border-border/10 my-2" />}
              <button
                onClick={() => toggleRoom(ri)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group/header",
                  roomHasActive
                    ? "text-amber-300 bg-amber-900/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-amber-900/5"
                )}
                data-testid={`lounge-room-toggle-${room.id}`}
              >
                <room.icon className={cn("w-4 h-4 flex-shrink-0", roomHasActive && "text-amber-400")} />
                <div className="flex-1 text-left">
                  <span className={cn(
                    "text-sm font-serif font-semibold block",
                    roomHasActive ? "text-amber-200" : ""
                  )}>
                    {room.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 block leading-tight">
                    {room.description}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  expanded ? "rotate-0" : "-rotate-90",
                  roomHasActive ? "text-amber-400/60" : "text-muted-foreground/40"
                )} />
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-200 ml-2",
                expanded ? "max-h-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
              )}>
                {room.items.map((item) => (
                  <LoungeNavItemRow key={item.href} item={item} location={location} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/40 space-y-3">
        {currentParticipant && (
          <div className="text-xs text-muted-foreground px-3 mb-1">
            <span className="font-semibold text-foreground">{currentParticipant.name}</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={switchVariant}
          className="w-full text-xs gap-2 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40"
          data-testid="lounge-switch-to-classic"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {t('loungeNav.switchToClassic')}
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageToggle />
          <ThemeToggle />
          <AmbientToggle />
        </div>
        {currentParticipant && (
          <Button
            variant="outline"
            onClick={() => { setParticipant(null); onNavigate(); }}
            className="w-full flex items-center gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors"
            data-testid="lounge-button-signout"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.leave')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

const MemoizedChildren = memo(function MemoizedChildren({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
});

export default function LoungeLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { switchVariant } = useVariantSwitch();

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
    });
  }, [location]);

  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);
  const isAdmin = currentParticipant?.role === "admin";

  const rooms: NavRoom[] = useMemo(() => [
    {
      id: "lounge",
      icon: Armchair,
      label: t('loungeNav.home'),
      description: t('loungeNav.homeDesc'),
      defaultOpen: true,
      items: [
        { href: "/lounge", icon: Home, label: t('loungeNav.home'), match: (loc: string) => loc === "/lounge" },
        { href: "/lounge/news", icon: Newspaper, label: t('nav.news') },
      ],
    },
    {
      id: "tastings",
      icon: Wine,
      label: t('loungeNav.tastings'),
      description: t('loungeNav.tastingsDesc'),
      items: [
        { href: "/lounge/tastings", icon: Wine, label: t('loungeNav.sessions'), match: (loc: string) => loc === "/lounge/tastings" },
        { href: "/lounge/tastings/history", icon: History, label: t('loungeNav.history') },
        { href: "/lounge/tastings/calendar", icon: Calendar, label: t('loungeNav.calendar') },
        ...(isHost || isAdmin ? [
          { href: "/lounge/tastings/host-dashboard", icon: LayoutDashboard, label: t('loungeNav.hostDashboard') },
          { href: "/lounge/tastings/recap", icon: ClipboardList, label: t('nav.recap'), match: (loc: string) => loc === "/lounge/tastings/recap" || loc.startsWith("/lounge/tastings/recap/") },
        ] : []),
        { href: "/lounge/tastings/templates", icon: FileText, label: t('loungeNav.templates') },
        { href: "/lounge/tastings/reminders", icon: Bell, label: t('loungeNav.reminders') },
      ],
    },
    {
      id: "guests",
      icon: Users,
      label: t('loungeNav.guests'),
      description: t('loungeNav.guestsDesc'),
      items: [
        { href: "/lounge/guests/friends", icon: Users, label: t('loungeNav.friends') },
        { href: "/lounge/guests/activity", icon: Rss, label: t('loungeNav.activity') },
        { href: "/lounge/guests/related-palates", icon: HeartHandshake, label: t('loungeNav.relatedPalates') },
        { href: "/lounge/guests/insights", icon: BarChart3, label: t('loungeNav.insights') },
        { href: "/lounge/guests/leaderboard", icon: Medal, label: t('loungeNav.leaderboard') },
      ],
    },
    {
      id: "my-salon",
      icon: UserCircle,
      label: t('loungeNav.mySalon'),
      description: t('loungeNav.mySalonDesc'),
      items: [
        { href: "/lounge/my-salon/profile", icon: User, label: t('loungeNav.profile') },
        { href: "/lounge/my-salon/my-taste", icon: Activity, label: t('loungeNav.myTaste'), match: (loc: string) => loc.startsWith("/lounge/my-salon/my-taste") },
        { href: "/lounge/my-salon/journal", icon: NotebookPen, label: t('loungeNav.journal') },
        { href: "/lounge/my-salon/my-whiskies", icon: GlassWater, label: t('loungeNav.myWhiskies') },
        { href: "/lounge/my-salon/wishlist", icon: Star, label: t('loungeNav.wishlist') },
        { href: "/lounge/my-salon/collection", icon: Archive, label: t('loungeNav.collection') },
        { href: "/lounge/my-salon/badges", icon: Trophy, label: t('loungeNav.badges') },
        { href: "/lounge/my-salon/export-notes", icon: Download, label: t('loungeNav.exportNotes') },
        { href: "/lounge/my-salon/data-export", icon: HardDriveDownload, label: t('loungeNav.dataExport') },
      ],
    },
    {
      id: "library",
      icon: BookMarked,
      label: t('loungeNav.library'),
      description: t('loungeNav.libraryDesc'),
      items: [
        { href: "/lounge/library/recommendations", icon: Sparkles, label: t('loungeNav.recommendations') },
        { href: "/lounge/library/comparison", icon: GitCompareArrows, label: t('loungeNav.comparison') },
        { href: "/lounge/library/pairings", icon: Puzzle, label: t('loungeNav.pairings') },
        { href: "/lounge/library/benchmark", icon: Brain, label: t('loungeNav.benchmark') },
        { href: "/lounge/library/lexicon", icon: Library, label: t('loungeNav.lexicon') },
        { href: "/lounge/library/distilleries", icon: Landmark, label: t('loungeNav.distilleries') },
        { href: "/lounge/library/map", icon: Map, label: t('loungeNav.map') },
        { href: "/lounge/library/bottlers", icon: Package, label: t('loungeNav.bottlers') },
        ...((isAdmin || currentParticipant?.canAccessWhiskyDb) ? [
          { href: "/lounge/library/whisky-database", icon: Database, label: t('loungeNav.whiskyDatabase') },
        ] : []),
      ],
    },
    {
      id: "about",
      icon: Info,
      label: t('navGroup.aboutPlatform'),
      description: "",
      items: [
        { href: "/lounge/about", icon: Info, label: t('nav.about') },
        { href: "/lounge/about-method", icon: BookOpen, label: t('nav.aboutMethod') },
        { href: "/lounge/features", icon: LayoutGrid, label: t('nav.features') },
        { href: "/lounge/donate", icon: Heart, label: t('nav.donate') },
      ],
    },
    ...(currentParticipant?.role === "admin" ? [{
      id: "admin",
      icon: ShieldAlert,
      label: t('navGroup.admin'),
      description: "",
      items: [
        { href: "/lounge/admin", icon: ShieldAlert, label: t('nav.admin') },
      ],
    }] : []),
  ], [t, isHost, isAdmin, currentParticipant?.canAccessWhiskyDb, currentParticipant?.role]);

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
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 z-0 bg-background" />

      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border/40 bg-card/95 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <Armchair className="w-4 h-4 text-amber-500" />
          <span className="font-serif font-bold text-lg text-primary">{t('app.name')}</span>
          <span className="text-[10px] text-amber-500/70 uppercase tracking-wider">Lounge</span>
        </div>
        <div className="flex items-center gap-2">
          <LoungeProfileAvatar size={36} />
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-secondary">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-border/40 w-72 bg-card">
              <LoungeNavContent navInnerRef={mobileNavRef} location={location} rooms={rooms} onNavigate={handleNavigate} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex relative z-10 overflow-hidden" style={{ height: '100dvh' }}>
        <aside className="hidden md:block w-72 h-full">
          <LoungeNavContent navInnerRef={desktopNavRef} location={location} rooms={rooms} onNavigate={handleNavigate} />
        </aside>
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-background" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-8 md:py-14 animate-in fade-in duration-700 min-w-0">
            <MemoizedChildren>{children}</MemoizedChildren>
          </div>
        </main>
        <FeedbackButton />
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/40 safe-area-bottom" style={{ paddingLeft: 'env(safe-area-inset-left, 0)', paddingRight: 'env(safe-area-inset-right, 0)' }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {[
            { href: "/lounge", icon: Armchair, label: t('loungeNav.home') },
            { href: "/lounge/tastings", icon: Wine, label: t('loungeNav.tastings') },
            { href: "/lounge/my-salon/journal", icon: NotebookPen, label: t('loungeNav.journal') },
            { href: "/lounge/my-salon/profile", icon: UserCircle, label: t('loungeNav.mySalon') },
            { href: "#more", icon: Menu, label: t('nav.more'), isMore: true },
          ].map((item) => {
            const isActive = item.href !== "#more" && (
              item.href === "/lounge"
                ? location === "/lounge"
                : location.startsWith(item.href)
            );
            if ((item as any).isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="lounge-bottom-nav-more"
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
                    isActive ? "text-amber-400" : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`lounge-bottom-nav-${item.href.replace(/\//g, '-').slice(1)}`}
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
  );
}
