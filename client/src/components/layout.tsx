import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, LogOut, Menu, BookOpen, User, Wine, Users, Info, NotebookPen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { WelcomeOverlay } from "@/components/welcome-overlay";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api";

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

  const initials = currentParticipant?.name
    ? currentParticipant.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const ProfileAvatar = ({ size = 36, showName = false }: { size?: number; showName?: boolean }) => {
    if (!currentParticipant) return null;
    const photoUrl = profile?.photoUrl;
    return (
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
    );
  };

  const navItems = [
    { href: "/", icon: Home, label: t('nav.lobby') },
    { href: "/sessions", icon: Wine, label: t('nav.sessions') },
    ...(currentParticipant ? [
      { href: "/profile", icon: User, label: t('profile.title') },
      { href: "/friends", icon: Users, label: t('nav.friends') },
      { href: "/journal", icon: NotebookPen, label: t('nav.journal') },
    ] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border/40">
      <div className="p-8 border-b border-border/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif font-black tracking-tight text-primary">
              {t('app.name')}
            </h1>
            <ProfileAvatar size={54} showName />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-sans">
            {t('app.tagline')}
          </p>
        </div>
      </div>
      
      <nav className="flex-1 p-6 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-300 cursor-pointer group",
                  isActive
                    ? "bg-secondary text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                onClick={() => setOpen(false)}
              >
                <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                <span className={cn("text-sm font-medium", isActive && "font-semibold")}>{item.label}</span>
              </div>
            </Link>
          );
        })}

        <Link href="/about-method">
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-300 cursor-pointer",
              location === "/about-method"
                ? "bg-secondary text-primary border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
            onClick={() => setOpen(false)}
            data-testid="nav-about-method"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">{t('nav.aboutMethod')}</span>
          </div>
        </Link>

        <Link href="/intro">
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-300 cursor-pointer",
              location === "/intro"
                ? "bg-secondary text-primary border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
            onClick={() => setOpen(false)}
            data-testid="nav-about"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">{t('nav.about')}</span>
          </div>
        </Link>
      </nav>

      <div className="p-6 border-t border-border/40 space-y-4">
        {currentParticipant && (
          <div className="text-xs text-muted-foreground px-4 mb-2">
            Signed in as <span className="font-semibold text-foreground">{currentParticipant.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        {currentParticipant && (
          <button
            onClick={() => setParticipant(null)}
            className="flex items-center gap-3 px-4 py-2 w-full text-left text-muted-foreground hover:text-destructive transition-colors rounded-sm hover:bg-destructive/5 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.leave')}</span>
          </button>
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
          <ProfileAvatar size={48} showName />
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-secondary">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-border/40 w-72 bg-card">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex relative z-10 h-screen overflow-hidden">
        <aside className="hidden md:block w-72 h-full">
          <NavContent />
        </aside>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="container max-w-5xl mx-auto p-6 md:p-12 pb-24 md:pb-12 animate-in fade-in duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
