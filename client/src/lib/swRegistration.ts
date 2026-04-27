import { queryClient } from "./queryClient";

let updateAvailable = false;
let swRegistration: ServiceWorkerRegistration | undefined;
let pendingReloadTimer: ReturnType<typeof setTimeout> | undefined;
// Gates the `controllerchange` handler below so that:
//   - First install (no prior controller): controllerchange fires once the
//     new SW takes control. We must NOT auto-reload here, otherwise the
//     user's very first page view would be interrupted.
//   - User-triggered update via `applyUpdate()`: we DO want to auto-reload
//     so the freshly activated SW serves the next navigation.
// The flag is reset to `false` immediately before each `window.location.reload()`
// call. In practice the reload discards the JS context so the reset is a no-op,
// but making it explicit removes the implicit lifetime assumption and keeps the
// gate correct if reload is ever deferred, intercepted, or stubbed in tests.
let userTriggeredReload = false;
const listeners = new Set<(available: boolean) => void>();

export function onUpdateAvailable(cb: (available: boolean) => void) {
  listeners.add(cb);
  cb(updateAvailable);
  return () => listeners.delete(cb);
}

function setUpdateAvailable(val: boolean) {
  updateAvailable = val;
  listeners.forEach((cb) => cb(val));
}

export function applyUpdate() {
  userTriggeredReload = true;
  const waiting = swRegistration?.waiting;
  if (waiting) {
    waiting.postMessage({ type: "SKIP_WAITING" });
    // Fallback reload in case `controllerchange` does not fire (e.g. the new
    // SW fails to activate). The handler below typically wins this race and
    // cancels this timer so we don't double-reload in environments where
    // `window.location.reload()` is intercepted (e.g. tests).
    pendingReloadTimer = setTimeout(() => {
      pendingReloadTimer = undefined;
      userTriggeredReload = false;
      window.location.reload();
    }, 1500);
    return;
  }
  if (swRegistration) {
    try { swRegistration.update(); } catch { /* ignore */ }
  }
  userTriggeredReload = false;
  window.location.reload();
}

function doRegister() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js").then((reg) => {
    swRegistration = reg;

    if (reg.waiting && navigator.serviceWorker.controller) {
      setUpdateAvailable(true);
    }

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!userTriggeredReload) return;
      // Reset before reloading so the gate has no implicit lifetime
      // assumptions (see flag declaration above). Also cancel the
      // applyUpdate() fallback timer so it doesn't trigger a second reload
      // in environments where `window.location.reload()` is intercepted.
      userTriggeredReload = false;
      if (pendingReloadTimer !== undefined) {
        clearTimeout(pendingReloadTimer);
        pendingReloadTimer = undefined;
      }
      queryClient.invalidateQueries();
      window.location.reload();
    });
  }).catch((err) => {
    console.error("[SW] Registration failed:", err);
  });
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (document.readyState === "complete") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister);
  }
}
