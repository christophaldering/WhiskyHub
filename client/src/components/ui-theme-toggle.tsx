import { Armchair, Palette } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

export function UiThemeToggle({ compact = false }: { compact?: boolean }) {
  const { uiTheme, setUiTheme } = useAppStore();
  const { t } = useTranslation();

  return (
    <div
      className="inline-flex items-center rounded-md border border-border/50 p-0.5 text-xs"
      role="radiogroup"
      aria-label={t("uiTheme.label")}
      data-testid="ui-theme-toggle"
    >
      <button
        role="radio"
        aria-checked={uiTheme === "classic"}
        onClick={() => setUiTheme("classic")}
        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-serif text-xs tracking-wide transition-all ${
          uiTheme === "classic"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
        data-testid="button-ui-theme-classic"
      >
        <Palette className="w-3.5 h-3.5" />
        {!compact && t("uiTheme.classic")}
      </button>
      <button
        role="radio"
        aria-checked={uiTheme === "lounge"}
        onClick={() => setUiTheme("lounge")}
        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-serif text-xs tracking-wide transition-all ${
          uiTheme === "lounge"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
        data-testid="button-ui-theme-lounge"
      >
        <Armchair className="w-3.5 h-3.5" />
        {!compact && t("uiTheme.lounge")}
      </button>
    </div>
  );
}
