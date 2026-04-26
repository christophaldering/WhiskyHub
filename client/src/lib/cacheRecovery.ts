const CHUNK_RELOAD_KEY = "cs_chunk_reload";
const COOLDOWN_MS = 10000;

const CHUNK_ERROR_FRAGMENTS = [
  "Loading chunk",
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "Unable to preload CSS",
  "is not a valid JavaScript MIME type",
];

export function isChunkLoadErrorMessage(message: unknown): boolean {
  const msg = String(message ?? "");
  if (!msg) return false;
  if (msg.includes("Load failed") && msg.toLowerCase().includes("import")) return true;
  return CHUNK_ERROR_FRAGMENTS.some((fragment) => msg.includes(fragment));
}

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return isChunkLoadErrorMessage(error.message);
  }
  if (typeof error === "object" && error && "message" in error) {
    return isChunkLoadErrorMessage((error as { message?: unknown }).message);
  }
  return isChunkLoadErrorMessage(error);
}

export function shouldAutoReloadForChunkError(): boolean {
  try {
    const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (!last || now - parseInt(last, 10) > COOLDOWN_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

async function unregisterAllServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
  } catch {
    void 0;
  }
}

async function deleteAllCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
  } catch {
    void 0;
  }
}

function buildReloadUrl(): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    return url.toString();
  } catch {
    return window.location.href;
  }
}

export async function hardRecoverAndReload(): Promise<void> {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    void 0;
  }
  await Promise.all([unregisterAllServiceWorkers(), deleteAllCaches()]);
  const target = buildReloadUrl();
  try {
    window.location.replace(target);
  } catch {
    window.location.href = target;
  }
}

export function triggerHardRecovery(): void {
  void hardRecoverAndReload();
}

export function handlePotentialChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  if (!shouldAutoReloadForChunkError()) return true;
  void hardRecoverAndReload();
  return true;
}
