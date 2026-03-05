import { useEffect } from "react";
import { useLocation } from "wouter";
import { NAV_VERSION } from "@/lib/config";

const REDIRECT_MAP: Record<string, string> = {
  "/simple-host": "/host",
};

const PREFIX_REDIRECTS: Array<{ prefix: string; target: string }> = [
  { prefix: "/legacy/", target: "/tasting" },
  { prefix: "/app/", target: "/tasting" },
];

const PROTECTED_PREFIXES = [
  "/tasting-room-simple/",
  "/tasting-results/",
  "/admin",
  "/api/",
  "/naked/",
  "/join/",
];

export default function NavRedirects() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (NAV_VERSION !== "v2_simplified") return;

    if (PROTECTED_PREFIXES.some((p) => location.startsWith(p))) return;

    if (REDIRECT_MAP[location]) {
      navigate(REDIRECT_MAP[location], { replace: true });
      return;
    }

    for (const { prefix, target } of PREFIX_REDIRECTS) {
      if (location.startsWith(prefix)) {
        navigate(target, { replace: true });
        return;
      }
    }
  }, [location, navigate]);

  return null;
}
