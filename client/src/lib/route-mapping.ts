import { useAppStore } from "./store";
import { useLocation } from "wouter";
import { useCallback, useEffect } from "react";

export type UiVariant = "classic" | "lounge";

interface RouteMapping {
  classic: string;
  lounge: string;
  loungeTab?: string;
}

const ROUTE_MAP: RouteMapping[] = [
  { classic: "/app", lounge: "/lounge" },
  { classic: "/news", lounge: "/lounge/news" },
  { classic: "/sessions", lounge: "/lounge/tastings" },
  { classic: "/my-tastings", lounge: "/lounge/tastings/history" },
  { classic: "/calendar", lounge: "/lounge/tastings/calendar" },
  { classic: "/profile", lounge: "/lounge/my-salon/profile" },
  { classic: "/journal", lounge: "/lounge/my-salon/journal" },
  { classic: "/my-whiskies", lounge: "/lounge/my-salon/my-whiskies" },
  { classic: "/wishlist", lounge: "/lounge/my-salon/wishlist" },
  { classic: "/collection", lounge: "/lounge/my-salon/collection" },
  { classic: "/badges", lounge: "/lounge/my-salon/badges" },
  { classic: "/flavor-profile", lounge: "/lounge/my-salon/my-taste", loungeTab: "profile" },
  { classic: "/flavor-wheel", lounge: "/lounge/my-salon/my-taste", loungeTab: "wheel" },
  { classic: "/friends", lounge: "/lounge/guests/friends" },
  { classic: "/activity", lounge: "/lounge/guests/activity" },
  { classic: "/taste-twins", lounge: "/lounge/guests/related-palates" },
  { classic: "/community-rankings", lounge: "/lounge/guests/insights" },
  { classic: "/leaderboard", lounge: "/lounge/guests/leaderboard" },
  { classic: "/recommendations", lounge: "/lounge/library/recommendations" },
  { classic: "/comparison", lounge: "/lounge/library/comparison" },
  { classic: "/pairings", lounge: "/lounge/library/pairings" },
  { classic: "/benchmark", lounge: "/lounge/library/benchmark" },
  { classic: "/lexicon", lounge: "/lounge/library/lexicon" },
  { classic: "/distilleries", lounge: "/lounge/library/distilleries" },
  { classic: "/distillery-map", lounge: "/lounge/library/map" },
  { classic: "/bottlers", lounge: "/lounge/library/bottlers" },
  { classic: "/whisky-database", lounge: "/lounge/library/whisky-database" },
  { classic: "/tasting-templates", lounge: "/lounge/tastings/templates" },
  { classic: "/export-notes", lounge: "/lounge/my-salon/export-notes" },
  { classic: "/data-export", lounge: "/lounge/my-salon/data-export" },
  { classic: "/reminders", lounge: "/lounge/tastings/reminders" },
  { classic: "/host-dashboard", lounge: "/lounge/tastings/host-dashboard" },
  { classic: "/photo-tasting", lounge: "/lounge/tastings/photo-tasting" },
  { classic: "/about", lounge: "/lounge/about" },
  { classic: "/about-method", lounge: "/lounge/about-method" },
  { classic: "/features", lounge: "/lounge/features" },
  { classic: "/donate", lounge: "/lounge/donate" },
  { classic: "/admin", lounge: "/lounge/admin" },
];

function stripQuery(path: string): string {
  const idx = path.indexOf("?");
  return idx >= 0 ? path.substring(0, idx) : path;
}

function getQuery(path: string): string {
  const idx = path.indexOf("?");
  return idx >= 0 ? path.substring(idx) : "";
}

export function classicToLounge(rawPath: string): string {
  const path = stripQuery(rawPath);
  const query = getQuery(rawPath);

  if (path.startsWith("/tasting/")) {
    const id = path.replace("/tasting/", "");
    return `/lounge/tastings/${id}${query}`;
  }
  if (path.startsWith("/recap/")) {
    const id = path.replace("/recap/", "");
    return `/lounge/tastings/recap/${id}${query}`;
  }
  if (path === "/recap") {
    return `/lounge/tastings/recap${query}`;
  }

  const mapping = ROUTE_MAP.find((m) => m.classic === path);
  if (mapping) {
    if (mapping.loungeTab) {
      const sep = query ? "&" : "?";
      return `${mapping.lounge}${query}${sep}tab=${mapping.loungeTab}`;
    }
    return `${mapping.lounge}${query}`;
  }
  return "/lounge";
}

export function loungeToClassic(rawPath: string): string {
  const path = stripQuery(rawPath);
  const query = getQuery(rawPath);

  const tastingMatch = path.match(/^\/lounge\/tastings\/([a-f0-9-]{36})$/i);
  if (tastingMatch) {
    return `/tasting/${tastingMatch[1]}${query}`;
  }
  const recapMatch = path.match(/^\/lounge\/tastings\/recap\/(.+)$/);
  if (recapMatch) {
    return `/recap/${recapMatch[1]}${query}`;
  }
  if (path === "/lounge/tastings/recap") {
    return `/recap${query}`;
  }

  const mapping = ROUTE_MAP.find((m) => m.lounge === path);
  if (mapping) {
    if (mapping.loungeTab) {
      return mapping.classic;
    }
    return `${mapping.classic}${query}`;
  }

  const params = new URLSearchParams(query.replace("?", ""));
  if (path === "/lounge/my-salon/my-taste") {
    const tab = params.get("tab");
    if (tab === "wheel") return "/flavor-wheel";
    return "/flavor-profile";
  }

  return "/app";
}

export function useVariantSwitch() {
  const { uiTheme, setUiTheme } = useAppStore();
  const [location, navigate] = useLocation();

  const switchVariant = useCallback(() => {
    const target = uiTheme === "classic" ? "lounge" : "classic";
    setUiTheme(target);

    const fullPath = location + window.location.search;
    let mappedPath: string;
    if (target === "lounge") {
      mappedPath = classicToLounge(fullPath);
    } else {
      mappedPath = loungeToClassic(fullPath);
    }
    navigate(mappedPath);
  }, [uiTheme, setUiTheme, location, navigate]);

  return { currentVariant: uiTheme, switchVariant };
}

export function useAutoThemeSync() {
  const [location] = useLocation();
  const { uiTheme, setUiTheme } = useAppStore();

  useEffect(() => {
    if (location.startsWith("/lounge") && uiTheme !== "lounge") {
      setUiTheme("lounge");
    } else if (!location.startsWith("/lounge") && location !== "/" && !location.startsWith("/tour") && !location.startsWith("/join/") && !location.startsWith("/intro") && !location.startsWith("/feature-tour") && uiTheme !== "classic") {
      setUiTheme("classic");
    }
  }, [location, uiTheme, setUiTheme]);
}

export function isLoungeRoute(path: string): boolean {
  return path.startsWith("/lounge");
}

export function isClassicRoute(path: string): boolean {
  return !path.startsWith("/lounge") && path !== "/" && !path.startsWith("/tour") && !path.startsWith("/join/") && !path.startsWith("/intro") && !path.startsWith("/feature-tour");
}
