import { queryClient } from "./queryClient";

let updateAvailable = false;
let swRegistration: ServiceWorkerRegistration | undefined;
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
    setTimeout(() => window.location.reload(), 1500);
    return;
  }
  if (swRegistration) {
    try { swRegistration.update(); } catch { /* ignore */ }
  }
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
