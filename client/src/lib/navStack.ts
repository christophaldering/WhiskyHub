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
