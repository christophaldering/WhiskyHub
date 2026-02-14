import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="font-mono text-xs tracking-wider border border-border/50 hover:bg-secondary/50 gap-2"
      data-testid="button-theme-toggle"
      title={theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
    >
      {theme === "dark" ? (
        <Sun className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-primary" />
      )}
      <span className="text-muted-foreground">
        {theme === "dark" ? t("theme.light") : t("theme.dark")}
      </span>
    </Button>
  );
}
