import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { primaryTabs } from "@/lib/navConfig";
import { v } from "@/lib/themeVars";
import { c } from "@/lib/theme";

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
        const label = t(tab.labelKey, tab.key === "tasting" ? "Tasting" : "My Taste");

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
              padding: "6px 18px",
              borderRadius: 50,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: active ? 600 : 450,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "0.01em",
              color: active ? v.accent : v.mutedLight,
              background: active ? `${c.accent}18` : "transparent",
              boxShadow: active ? `0 0 12px ${c.accent}12, inset 0 1px 0 ${c.accent}10` : "none",
              transition: "all 0.2s ease",
              outline: "2px solid transparent",
              outlineOffset: 2,
              WebkitTapHighlightColor: "transparent",
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${c.accent}60`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "2px solid transparent";
            }}
            data-testid={`desktop-tab-${tab.key}`}
          >
            <Icon style={{ width: 16, height: 16 }} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
