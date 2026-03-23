import { useCallback } from "react";
import { useLocation } from "wouter";
import { markBackNavigation } from "@/lib/navStack";

export function useBackNavigation(fallbackRoute: string) {
  const [, navigate] = useLocation();

  const goBack = useCallback(() => {
    markBackNavigation();
    navigate(fallbackRoute);
  }, [fallbackRoute, navigate]);

  return goBack;
}
