import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Wine } from "lucide-react";

interface TastingShellProps {
  children: ReactNode;
  title?: string;
  status?: string;
}

export function TastingShell({ children, title, status }: TastingShellProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b border-border/40 bg-card/95 backdrop-blur-lg">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/sessions")}
            className="font-serif text-xs gap-1 flex-shrink-0"
            data-testid="button-shell-back"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("tastingShell.back")}
          </Button>
          {title && (
            <div className="flex items-center gap-2 min-w-0">
              <Wine className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-serif font-bold text-sm text-primary truncate" data-testid="text-shell-title">
                {title}
              </span>
              {status && (
                <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground flex-shrink-0">
                  {t(`session.status.${status}`)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {currentParticipant && (
            <span className="text-xs text-muted-foreground font-serif mr-1 hidden sm:inline">
              {currentParticipant.name}
            </span>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-6 md:py-12">
        {children}
      </main>
    </div>
  );
}
