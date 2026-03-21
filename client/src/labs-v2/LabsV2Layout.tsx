import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { THEMES, type ThemeTokens, type V2Theme, SP, FONT, RADIUS, TAB_BAR_H, TOP_BAR_H, TOUCH_MIN } from "./tokens";
import { type V2Lang, type Translations, getT } from "./i18n";
import { TabTastings, TabDiscover, TabWorld, TabCircle, type IconProps } from "./icons";
import "./animations.css";

type TabId = "tastings" | "discover" | "world" | "circle";

interface ThemeCtx {
  mode: V2Theme;
  th: ThemeTokens;
  toggle: () => void;
}
interface LangCtx {
  lang: V2Lang;
  t: Translations;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  mode: "dark",
  th: THEMES.dark,
  toggle: () => {},
});
const LangContext = createContext<LangCtx>({
  lang: "de",
  t: getT("de"),
  toggle: () => {},
});

export const useV2Theme = () => useContext(ThemeContext);
export const useV2Lang = () => useContext(LangContext);

interface LayoutProps {
  children: ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hideTabBar?: boolean;
  onLogoClick?: () => void;
}

const tabMeta: { id: TabId; icon: (p: IconProps) => React.JSX.Element; label: (t: Translations) => string }[] = [
  { id: "tastings", icon: TabTastings, label: (t) => t.tabTastings },
  { id: "discover", icon: TabDiscover, label: (t) => t.tabEntdecken },
  { id: "world", icon: TabWorld, label: (t) => t.tabMeineWelt },
  { id: "circle", icon: TabCircle, label: (t) => t.tabCircle },
];

export default function LabsV2Layout({ children, activeTab, onTabChange, hideTabBar, onLogoClick }: LayoutProps) {
  const [mode, setMode] = useState<V2Theme>(() => {
    try {
      return (localStorage.getItem("v2_theme") as V2Theme) || "dark";
    } catch (_e: unknown) {
      return "dark";
    }
  });
  const [lang, setLang] = useState<V2Lang>(() => {
    try {
      return (localStorage.getItem("v2_lang") as V2Lang) || "de";
    } catch (_e: unknown) {
      return "de";
    }
  });

  const th = THEMES[mode];
  const t = getT(lang);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("v2_theme", next); } catch (_e: unknown) { /* unavailable */ }
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "de" ? "en" : "de";
      try { localStorage.setItem("v2_lang", next); } catch (_e: unknown) { /* unavailable */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, th, toggle: toggleTheme }}>
      <LangContext.Provider value={{ lang, t, toggle: toggleLang }}>
        <div
          style={{
            minHeight: "100dvh",
            background: th.bg,
            color: th.text,
            fontFamily: FONT.body,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              height: TOP_BAR_H,
              background: th.headerBg,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderBottom: `1px solid ${th.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `0 ${SP.md}px`,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: SP.sm, cursor: onLogoClick ? "pointer" : "default" }}
              onClick={onLogoClick}
              role={onLogoClick ? "button" : undefined}
              tabIndex={onLogoClick ? 0 : undefined}
              onKeyDown={onLogoClick ? (e) => { if (e.key === "Enter" || e.key === " ") onLogoClick(); } : undefined}
            >
              <span
                style={{
                  fontFamily: FONT.display,
                  fontSize: 20,
                  fontWeight: 600,
                  color: th.gold,
                  letterSpacing: "0.01em",
                }}
                data-testid="v2-logo"
              >
                CaskSense
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: th.faint,
                  background: th.bgCard,
                  padding: `${SP.xs}px ${SP.sm}px`,
                  borderRadius: RADIUS.sm,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                V2
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.full,
                  overflow: "hidden",
                }}
                data-testid="v2-lang-toggle"
              >
                <button
                  onClick={() => { if (lang !== "de") toggleLang(); }}
                  data-testid="v2-lang-de"
                  style={{
                    minHeight: 32,
                    padding: `0 ${SP.sm}px`,
                    fontSize: 13,
                    fontWeight: lang === "de" ? 600 : 400,
                    fontFamily: FONT.body,
                    background: lang === "de" ? th.bgCard : "transparent",
                    color: lang === "de" ? th.gold : th.muted,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  DE
                </button>
                <button
                  onClick={() => { if (lang !== "en") toggleLang(); }}
                  data-testid="v2-lang-en"
                  style={{
                    minHeight: 32,
                    padding: `0 ${SP.sm}px`,
                    fontSize: 13,
                    fontWeight: lang === "en" ? 600 : 400,
                    fontFamily: FONT.body,
                    background: lang === "en" ? th.bgCard : "transparent",
                    color: lang === "en" ? th.gold : th.muted,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  EN
                </button>
              </div>
              <button
                onClick={onLogoClick}
                data-testid="v2-profile-btn"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: `rgba(196,160,80,0.15)`,
                  border: `1.5px solid ${th.gold}`,
                  color: th.gold,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                C
              </button>
            </div>
          </header>

          <main
            style={{
              flex: 1,
              paddingBottom: hideTabBar ? 0 : TAB_BAR_H + SP.md,
              overflowY: "auto",
            }}
          >
            {children}
          </main>

          {!hideTabBar && (
            <nav
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                height: TAB_BAR_H,
                background: th.tabBg,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderTop: `1px solid ${th.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                zIndex: 50,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
              data-testid="v2-tab-bar"
            >
              {tabMeta.map(({ id, icon: TabIcon, label: getLabel }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    data-testid={`v2-tab-${id}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: SP.xs,
                      minWidth: TOUCH_MIN,
                      minHeight: TOUCH_MIN,
                      background: "none",
                      border: "none",
                      color: active ? th.gold : th.faint,
                      cursor: "pointer",
                      padding: `${SP.xs}px ${SP.sm}px`,
                      transition: "color 0.2s, transform 0.2s",
                      transform: active ? "scale(1.08)" : "scale(1)",
                      position: "relative",
                    }}
                  >
                    <TabIcon color={active ? th.gold : th.faint} size={24} />
                    <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: FONT.body }}>
                      {getLabel(t)}
                    </span>
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 2,
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: th.gold,
                        }}
                        data-testid={`v2-tab-dot-${id}`}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
