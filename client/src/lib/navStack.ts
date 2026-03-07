const STORAGE_KEY = "cs_nav_stack";
const MAX_SIZE = 20;

function getStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStack(stack: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {}
}

export function pushRoute(path: string) {
  if (!path || !path.startsWith("/")) return;
  const clean = path.split("?")[0];
  const stack = getStack();
  if (stack.length > 0 && stack[stack.length - 1] === clean) return;
  stack.push(clean);
  if (stack.length > MAX_SIZE) stack.splice(0, stack.length - MAX_SIZE);
  saveStack(stack);
}

export function popRoute(): string | null {
  const stack = getStack();
  if (stack.length < 2) return null;
  stack.pop();
  const prev = stack[stack.length - 1] || null;
  saveStack(stack);
  return prev;
}

export function peekRoute(): string | null {
  const stack = getStack();
  if (stack.length < 2) return null;
  return stack[stack.length - 2] || null;
}

export function getSmartFallback(currentPath: string): string {
  if (currentPath.startsWith("/my-taste")) return "/my-taste";
  return "/tasting";
}

const SCROLL_KEY = "cs_scroll_positions";
const BACK_NAV_KEY = "cs_back_nav";

function getScrollMap(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveScrollPosition(path: string, scrollTop: number) {
  try {
    const map = getScrollMap();
    map[path] = scrollTop;
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map));
  } catch {}
}

export function getScrollPosition(path: string): number | null {
  const map = getScrollMap();
  return typeof map[path] === "number" ? map[path] : null;
}

export function markBackNavigation() {
  try {
    sessionStorage.setItem(BACK_NAV_KEY, "1");
  } catch {}
}

export function consumeBackNavigation(): boolean {
  try {
    const val = sessionStorage.getItem(BACK_NAV_KEY);
    if (val === "1") {
      sessionStorage.removeItem(BACK_NAV_KEY);
      return true;
    }
  } catch {}
  return false;
}
