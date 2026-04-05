import { Capacitor } from "@capacitor/core";

const PRODUCTION_ORIGIN = "https://casksense.com";

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getApiOrigin(): string {
  return isNativePlatform() ? PRODUCTION_ORIGIN : "";
}

export function apiUrl(path: string): string {
  return getApiOrigin() + path;
}

function rewriteUrl(url: string): string {
  if (url.startsWith("/api")) {
    return PRODUCTION_ORIGIN + url;
  }
  try {
    const parsed = new URL(url);
    if (
      (parsed.hostname === "localhost" || parsed.hostname === "") &&
      parsed.pathname.startsWith("/api")
    ) {
      return PRODUCTION_ORIGIN + parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {}
  return url;
}

export function installNativeFetchInterceptor(): void {
  if (!isNativePlatform()) return;

  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === "string") {
      return originalFetch.call(window, rewriteUrl(input), init);
    }
    if (input instanceof URL) {
      return originalFetch.call(window, rewriteUrl(input.href), init);
    }
    if (input instanceof Request) {
      const newUrl = rewriteUrl(input.url);
      if (newUrl !== input.url) {
        const newReq = new Request(newUrl, input);
        return originalFetch.call(window, newReq, init);
      }
    }
    return originalFetch.call(window, input, init);
  };
}
