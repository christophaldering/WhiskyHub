import { useLocation } from "wouter";
import { ArrowRightLeft } from "lucide-react";

const UI_PREF_KEY = "casksense_ui";

export type UIPref = "v2" | "legacy";

export function getUIPref(): UIPref {
  try {
    const v = localStorage.getItem(UI_PREF_KEY);
    if (v === "v2" || v === "legacy") return v;
  } catch {}
  return "v2";
}

export function setUIPref(pref: UIPref) {
  try {
    localStorage.setItem(UI_PREF_KEY, pref);
  } catch {}
}

const ROUTE_MAP_V2_TO_LEGACY: [RegExp, string][] = [
  [/^\/app\/session\/(.+)$/, "/legacy/tasting/$1"],
  [/^\/app\/home$/, "/legacy/home"],
  [/^\/app\/sessions$/, "/legacy/tasting/sessions"],
  [/^\/app\/discover$/, "/legacy/discover"],
  [/^\/app\/cellar$/, "/legacy/my/journal"],
  [/^\/app\/more$/, "/legacy/home"],
  [/^\/app\/admin$/, "/legacy/admin"],
  [/^\/app\/recap\/(.+)$/, "/legacy/recap/$1"],
  [/^\/app\/invite\/(.+)$/, "/legacy/invite/$1"],
];

const ROUTE_MAP_LEGACY_TO_V2: [RegExp, string][] = [
  [/^\/legacy\/tasting\/([0-9a-f-]+)$/, "/app/session/$1"],
  [/^\/legacy\/tasting\/sessions$/, "/app/sessions"],
  [/^\/legacy\/tasting\/calendar$/, "/app/sessions"],
  [/^\/legacy\/tasting\/host$/, "/app/more"],
  [/^\/legacy\/tasting$/, "/app/home"],
  [/^\/legacy\/home$/, "/app/home"],
  [/^\/legacy\/my\/journal$/, "/app/cellar"],
  [/^\/legacy\/my\/collection$/, "/app/cellar"],
  [/^\/legacy\/my\/wishlist$/, "/app/cellar"],
  [/^\/legacy\/discover.*$/, "/app/discover"],
  [/^\/legacy\/profile.*$/, "/app/more"],
  [/^\/legacy\/admin$/, "/app/admin"],
  [/^\/legacy\/recap\/(.+)$/, "/app/recap/$1"],
  [/^\/legacy\/invite\/(.+)$/, "/app/invite/$1"],
  [/^\/legacy\/news$/, "/app/more"],
  [/^\/legacy\/badges$/, "/app/cellar"],
  [/^\/legacy\/flavor-profile$/, "/app/cellar"],
  [/^\/legacy\/flavor-wheel$/, "/app/cellar"],
  [/^\/legacy\/photo-tasting$/, "/app/more"],
  [/^\/legacy\/method$/, "/app/more"],
];

function mapRoute(location: string, mappings: [RegExp, string][], fallback: string): string {
  for (const [pattern, replacement] of mappings) {
    const match = location.match(pattern);
    if (match) {
      let result = replacement;
      for (let i = 1; i < match.length; i++) {
        result = result.replace(`$${i}`, match[i]);
      }
      return result;
    }
  }
  return fallback;
}

export function ViewSwitcherV2() {
  const [location, navigate] = useLocation();

  const handleSwitch = () => {
    setUIPref("legacy");
    const target = mapRoute(location, ROUTE_MAP_V2_TO_LEGACY, "/legacy/home");
    navigate(target);
  };

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
      style={{
        background: "var(--v2-surface-hover, #2e281f)",
        color: "var(--v2-text-secondary, #b8af90)",
        border: "1px solid var(--v2-border, #3d3529)",
      }}
      data-testid="switch-to-legacy"
    >
      <ArrowRightLeft className="w-3.5 h-3.5" />
      Classic View
    </button>
  );
}

export function ViewSwitcherLegacy() {
  const [location, navigate] = useLocation();

  const handleSwitch = () => {
    setUIPref("v2");
    const target = mapRoute(location, ROUTE_MAP_LEGACY_TO_V2, "/app/home");
    navigate(target);
  };

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-900/30 to-amber-800/20 text-amber-500 hover:from-amber-900/50 hover:to-amber-800/30 transition-all border border-amber-700/30 hover:border-amber-600/40"
      data-testid="switch-to-v2"
    >
      <ArrowRightLeft className="w-4 h-4" />
      <span>Dark Warm UI</span>
    </button>
  );
}
