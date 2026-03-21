import { useCallback } from "react";
import { useLocation } from "wouter";
import { popRoute, markBackNavigation } from "@/lib/navStack";

export function useBackNavigation(fallbackRoute: string) {
  const [, navigate] = useLocation();

  const goBack = useCallback(() => {
    markBackNavigation();

    const prev = popRoute();
    if (prev && prev !== window.location.pathname.split("?")[0]) {
      navigate(prev);
      return;
    }

    navigate(fallbackRoute);
  }, [fallbackRoute, navigate]);

  return goBack;
}
