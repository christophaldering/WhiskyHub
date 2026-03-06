import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { primaryTabs } from "@/lib/navConfig";
import { v } from "@/lib/themeVars";
import { c } from "@/lib/theme";

const BG_DARK = "#1a1714";

export default function DesktopTabSwitcher({ maxWidth = 600 }: { maxWidth?: number }) {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
      }}
      role="tablist"
      data-testid="desktop-tab-switcher"
    >
      {primaryTabs.map((tab) => {
        const matches = tab.match || [tab.route];
        const active = matches.some(
          (m) => location === m || location.startsWith(m + "/")
        );
        const Icon = tab.icon;
        const label = t(tab.labelKey, tab.key === "tasting" ? "Tasting" : "Taste");

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => navigate(tab.route)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 20px",
              borderRadius: 50,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: active ? "0.02em" : "0.01em",
              color: active ? BG_DARK : v.mutedLight,
              background: active ? c.accent : "transparent",
              boxShadow: active ? `0 1px 8px ${c.accent}40` : "none",
              transition: "all 0.2s ease",
              outline: "2px solid transparent",
              outlineOffset: 2,
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = `${c.accent}14`;
                e.currentTarget.style.color = v.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = v.mutedLight;
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = active
                ? `2px solid ${BG_DARK}`
                : `2px solid ${c.accent}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "2px solid transparent";
            }}
            data-testid={`desktop-tab-${tab.key}`}
          >
            <Icon style={{ width: 16, height: 16 }} strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
