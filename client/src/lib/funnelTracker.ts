// Cookie-free funnel tracker. NO localStorage, NO cookies, NO persistent identifier.
// Session token lives only in module memory and is gone when the tab closes.

const SESSION_TOKEN: string =
  (typeof crypto !== "undefined" && typeof (crypto as Crypto).randomUUID === "function")
    ? (crypto as Crypto).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let utm: { source: string; medium: string; campaign: string } = { source: "", medium: "", campaign: "" };

function captureUtm(): void {
  try {
    const qs = new URLSearchParams(window.location.search);
    const s = qs.get("utm_source"); const m = qs.get("utm_medium"); const c = qs.get("utm_campaign");
    if (s) utm.source = s.slice(0, 64);
    if (m) utm.medium = m.slice(0, 64);
    if (c) utm.campaign = c.slice(0, 96);
  } catch {}
}
captureUtm();

function deviceType(): string {
  const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return "tablet";
  return "desktop";
}

interface QueueEvent {
  event: string;
  page: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  language: string;
  deviceType: string;
  count?: number;
  histogram?: { dimension: string; bucket: string };
}

let queue: QueueEvent[] = [];
let flushTimer: number | null = null;

function enqueue(event: string, opts?: { page?: string; histogram?: QueueEvent["histogram"] }): void {
  const ev: QueueEvent = {
    event,
    page: opts?.page || (typeof window !== "undefined" ? window.location.pathname : ""),
    utmSource: utm.source,
    utmMedium: utm.medium,
    utmCampaign: utm.campaign,
    language: (typeof document !== "undefined" ? document.documentElement.lang : "").slice(0, 2).toLowerCase(),
    deviceType: deviceType(),
  };
  if (opts?.histogram) ev.histogram = opts.histogram;
  queue.push(ev);
  if (queue.length >= 8) flush();
  else if (flushTimer === null) {
    flushTimer = window.setTimeout(() => { flushTimer = null; flush(); }, 4000);
  }
}

function flush(useBeacon = false): void {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  const payload = JSON.stringify({ events: batch });
  try {
    if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "text/plain" });
      navigator.sendBeacon("/api/funnel/beacon", blob);
      return;
    }
    fetch("/api/funnel/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {}
}

function liveBeat(type: string, detail?: string): void {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/funnel/live-heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: SESSION_TOKEN,
        page: window.location.pathname,
        type,
        detail: detail || "",
        source: utm.source || "direct",
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {}
}

export function trackEvent(event: string, opts?: { page?: string; histogram?: QueueEvent["histogram"]; live?: { type: string; detail?: string } }): void {
  enqueue(event, opts);
  if (opts?.live) liveBeat(opts.live.type, opts.live.detail);
}

export function trackPageView(path: string): void {
  enqueue("page_view", { page: path });
  liveBeat("page_view", path);
}

export function trackSignupView(formName: string): void {
  enqueue("signup_view", { page: `/signup/${formName}` });
  liveBeat("signup_view", formName);
}

export function trackSignupFieldFocus(fieldName: string): void {
  enqueue("signup_field_first_focus", { page: `/signup/field/${fieldName}` });
}

export function trackSignupFieldBlurEmpty(fieldName: string): void {
  enqueue("signup_field_blur_empty", { page: `/signup/field/${fieldName}` });
}

export function trackSignupValidationError(fieldName: string, errorType: string): void {
  enqueue("signup_validation_error", { page: `/signup/${errorType}/${fieldName}` });
}

export function trackSignupSubmitAttempt(formName: string): void {
  enqueue("signup_submit_attempt", { page: `/signup/${formName}` });
  liveBeat("signup_attempt", formName);
}

export function trackSignupSubmitSuccess(formName: string): void {
  enqueue("signup_submit_success", { page: `/signup/${formName}` });
  liveBeat("signup_success", formName);
}

export function trackCtaClick(label: string): void {
  enqueue("landing_cta_click", { page: window.location.pathname });
  liveBeat("cta_click", label.slice(0, 48));
}

let bootstrapped = false;
export function startGlobalTracker(): void {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  captureUtm();

  const startTs = Date.now();
  let lastActivity = startTs;
  let maxScrollPct = 0;
  let lastFlushedHistogramAt = 0;

  const onActivity = () => { lastActivity = Date.now(); };
  ["click", "keydown", "touchstart", "mousemove"].forEach(ev =>
    window.addEventListener(ev, onActivity, { passive: true }),
  );

  window.addEventListener("scroll", () => {
    lastActivity = Date.now();
    const doc = document.documentElement;
    const pct = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
    if (pct > maxScrollPct) maxScrollPct = pct;
  }, { passive: true });

  window.setInterval(() => {
    if (document.visibilityState === "visible") {
      liveBeat("heartbeat");
      flush();
    }
  }, 15000);

  function scrollBucket(p: number): string {
    if (p < 25) return "<25";
    if (p < 50) return "25-50";
    if (p < 75) return "50-75";
    if (p < 95) return "75-95";
    return "finished";
  }
  function readBucket(s: number): string {
    if (s < 10) return "<10s";
    if (s < 30) return "10-30s";
    if (s < 120) return "30s-2m";
    if (s < 300) return "2-5m";
    return ">5m";
  }

  function finalReport() {
    if (Date.now() - lastFlushedHistogramAt < 5000) return;
    lastFlushedHistogramAt = Date.now();
    const activeSec = Math.min(Math.round((lastActivity - startTs) / 1000), 7200);
    const path = window.location.pathname;
    enqueue("page_view_histogram", { page: path, histogram: { dimension: "scroll_depth", bucket: scrollBucket(maxScrollPct) } });
    enqueue("page_view_histogram", { page: path, histogram: { dimension: "read_time", bucket: readBucket(activeSec) } });
    flush(true);
  }

  window.addEventListener("pagehide", finalReport);
  window.addEventListener("beforeunload", finalReport);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") finalReport();
  });

  const sectionsSeen = new Set<string>();
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      const path = window.location.pathname;
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          const el = e.target as HTMLElement;
          const id = (el.dataset.section || el.id || "").toString().slice(0, 64);
          if (!id) return;
          const key = path + ":" + id;
          if (sectionsSeen.has(key)) return;
          sectionsSeen.add(key);
          enqueue("landing_section_view", { page: path + ":" + id });
        }
      });
    }, { threshold: [0.5] });
    const observe = () => {
      document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => {
        if (!el.dataset.csObserved) { el.dataset.csObserved = "1"; io.observe(el); }
      });
    };
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const cta = target.closest<HTMLElement>("[data-cta]");
    if (!cta) return;
    const ctaId = (cta.getAttribute("data-cta") || "cta").slice(0, 64);
    enqueue("landing_cta_click", { page: window.location.pathname + ":" + ctaId });
  }, { passive: true });
}
