import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, LogOut, Menu, BookOpen, User, Wine, Users, Info, NotebookPen, Trophy, Library, Activity, Sparkles, GitCompareArrows, FileText, Rss, Calendar, Download, LayoutDashboard, ClipboardList, CircleDot, Puzzle, Medal, ShieldAlert, Landmark, Database, Map, Heart, Brain, LayoutGrid, Star } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientToggle } from "@/components/ambient-toggle";
import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { WelcomeOverlay } from "@/components/welcome-overlay";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { profileApi, tastingApi } from "@/lib/api";

type NavItem = { href: string; icon: any; label: string; match?: (loc: string) => boolean };
type NavGroup = { label: string; items: NavItem[] };

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();

  const { data: profile } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: allTastings = [] } = useQuery({
    queryKey: ["tastings"],
    queryFn: () => tastingApi.getAll(),
    enabled: !!currentParticipant,
  });

  const isHost = currentParticipant && allTastings.some((t: any) => t.hostId === currentParticipant.id);
  const isAdmin = currentParticipant?.role === "admin";

  const initials = currentParticipant?.name
    ? currentParticipant.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const ProfileAvatar = ({ size = 36, showName = false, showSignOut = false }: { size?: number; showName?: boolean; showSignOut?: boolean }) => {
    if (!currentParticipant) return null;
    const photoUrl = profile?.photoUrl;
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
  };

  const navGroups: NavGroup[] = [
    {
      label: t('navGroup.main'),
      items: [
        { href: "/features", icon: LayoutGrid, label: t('nav.features') },
        { href: "/", icon: Home, label: t('nav.lobby') },
        ...(currentParticipant ? [{ href: "/sessions", icon: Wine, label: t('nav.sessions') }] : []),
        { href: "/calendar", icon: Calendar, label: t('nav.calendar') },
      ],
    },
    ...(currentParticipant ? [
      {
        label: t('navGroup.myWhisky'),
        items: [
          { href: "/profile", icon: User, label: t('profile.title') },
          { href: "/journal", icon: NotebookPen, label: t('nav.journal') },
          { href: "/flavor-profile", icon: Activity, label: t('nav.flavorProfile') },
          { href: "/flavor-wheel", icon: CircleDot, label: t('nav.flavorWheel') },
          { href: "/badges", icon: Trophy, label: t('nav.badges') },
          { href: "/wishlist", icon: Star, label: t('nav.wishlist') },
        ],
      },
      {
        label: t('navGroup.tools'),
        items: [
          { href: "/recommendations", icon: Sparkles, label: t('nav.recommendations') },
          { href: "/comparison", icon: GitCompareArrows, label: t('nav.comparison') },
          { href: "/tasting-templates", icon: FileText, label: t('nav.templates') },
          { href: "/export-notes", icon: Download, label: t('nav.exportNotes') },
          { href: "/pairings", icon: Puzzle, label: t('nav.pairings') },
        ],
      },
      {
        label: t('navGroup.community'),
        items: [
          { href: "/friends", icon: Users, label: t('nav.friends') },
          { href: "/activity", icon: Rss, label: t('nav.activity') },
          { href: "/leaderboard", icon: Medal, label: t('nav.leaderboard') },
        ],
      },
    ] : []),
    ...((isHost || isAdmin) ? [
      {
        label: t('navGroup.host'),
        items: [
          { href: "/host-dashboard", icon: LayoutDashboard, label: t('nav.hostDashboard') },
          { href: "/recap", icon: ClipboardList, label: t('nav.recap'), match: (loc: string) => loc === "/recap" || loc.startsWith("/recap/") },
          { href: "/whisky-database", icon: Database, label: t('nav.whiskyDatabase') },
          { href: "/benchmark", icon: Brain, label: t('nav.benchmark') },
        ],
      },
    ] : []),
    {
      label: t('navGroup.reference'),
      items: [
        { href: "/lexicon", icon: Library, label: t('nav.lexicon') },
        { href: "/distilleries", icon: Landmark, label: t('nav.distilleries') },
        { href: "/distillery-map", icon: Map, label: t('nav.distilleryMap') },
        { href: "/about-method", icon: BookOpen, label: t('nav.aboutMethod') },
        { href: "/donate", icon: Heart, label: t('nav.donate') },
        { href: "/intro", icon: Info, label: t('nav.about') },
      ],
    },
    ...(currentParticipant?.role === "admin" ? [
      {
        label: t('navGroup.admin'),
        items: [
          { href: "/admin", icon: ShieldAlert, label: t('nav.admin') },
        ],
      },
    ] : []),
  ];

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

  const NavContent = ({ navInnerRef }: { navInnerRef?: React.RefObject<HTMLElement | null> }) => (
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
      
      <nav ref={navInnerRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="border-t border-border/30 my-2" />}
            <div className="px-3 pt-1 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </span>
            </div>
            {group.items.map((item) => {
              const isActive = item.match ? item.match(location) : location === item.href;
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
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                    <span className={cn("text-sm font-medium truncate", isActive && "font-semibold")}>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border/40 space-y-3">
        {currentParticipant && (
          <div className="text-xs text-muted-foreground px-3 mb-1">
            Signed in as <span className="font-semibold text-foreground">{currentParticipant.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageToggle />
          <ThemeToggle />
          <AmbientToggle />
        </div>
        {currentParticipant && (
          <Button
            variant="outline"
            onClick={() => { setParticipant(null); setOpen(false); }}
            className="w-full flex items-center gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors"
            data-testid="button-signout-sidebar"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.leave')}</span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0 bg-background" />

      <WelcomeOverlay />

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
              <NavContent navInnerRef={mobileNavRef} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex relative z-10 h-screen overflow-hidden">
        <aside className="hidden md:block w-72 h-full">
          <NavContent navInnerRef={desktopNavRef} />
        </aside>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="container max-w-5xl mx-auto p-6 md:p-12 pb-24 md:pb-12 animate-in fade-in duration-700">
            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/40 safe-area-bottom" style={{ paddingLeft: 'env(safe-area-inset-left, 0)', paddingRight: 'env(safe-area-inset-right, 0)' }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {[
            { href: "/", icon: Home, label: t('nav.lobby') },
            ...(currentParticipant ? [
              { href: "/sessions", icon: Wine, label: t('nav.sessions') },
              { href: "/journal", icon: NotebookPen, label: t('nav.journal') },
              { href: "/calendar", icon: Calendar, label: t('nav.calendar') },
            ] : []),
            { href: "/more", icon: Menu, label: t('nav.more'), isMore: true },
          ].map((item) => {
            const isActive = location === item.href;
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
  );
}
