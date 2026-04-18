import { useCallback } from "react";
import { useLocation } from "wouter";
import { markBackNavigation, popRoute } from "@/lib/navStack";

export function useBackNavigation(fallbackRoute: string) {
  const [, navigate] = useLocation();

  const goBack = useCallback(() => {
    const prev = popRoute();
    markBackNavigation();
    navigate(prev || fallbackRoute);
  }, [fallbackRoute, navigate]);

  return goBack;
}
