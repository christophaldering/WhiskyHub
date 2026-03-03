const SK_UNLOCKED = "simple_unlocked";
const SK_MODE = "simple_mode";
const SK_NAME = "simple_name";
const SK_PID = "simple_pid";

const LK_REMEMBER = "simple_remember";
const LK_TOKEN = "simple_resume_token";
const LK_MODE = "simple_resume_mode";
const LK_NAME = "simple_resume_name";

export type SimpleMode = "log" | "tasting";

export interface SimpleAuthState {
  unlocked: boolean;
  mode?: SimpleMode;
  name?: string;
  pid?: string;
}

export function getAuth(): SimpleAuthState {
  try {
    const unlocked = sessionStorage.getItem(SK_UNLOCKED) === "1";
    const mode = (sessionStorage.getItem(SK_MODE) || undefined) as SimpleMode | undefined;
    const name = sessionStorage.getItem(SK_NAME) || undefined;
    const pid = sessionStorage.getItem(SK_PID) || undefined;
    return { unlocked, mode, name, pid };
  } catch {
    return { unlocked: false };
  }
}

export function getSimpleAuth(): { unlocked: boolean; name?: string; pid?: string } {
  return getAuth();
}

function setSession(mode: SimpleMode, name?: string, pid?: string) {
  try {
    sessionStorage.setItem(SK_UNLOCKED, "1");
    sessionStorage.setItem(SK_MODE, mode);
    if (name) sessionStorage.setItem(SK_NAME, name);
    else sessionStorage.removeItem(SK_NAME);
    if (pid) sessionStorage.setItem(SK_PID, pid);
    else sessionStorage.removeItem(SK_PID);
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SK_UNLOCKED);
    sessionStorage.removeItem(SK_MODE);
    sessionStorage.removeItem(SK_NAME);
    sessionStorage.removeItem(SK_PID);
  } catch {}
}

function setRemember(token: string, mode: SimpleMode, name?: string) {
  try {
    localStorage.setItem(LK_REMEMBER, "1");
    localStorage.setItem(LK_TOKEN, token);
    localStorage.setItem(LK_MODE, mode);
    if (name) localStorage.setItem(LK_NAME, name);
    else localStorage.removeItem(LK_NAME);
  } catch {}
}

function clearRemember() {
  try {
    localStorage.removeItem(LK_REMEMBER);
    localStorage.removeItem(LK_TOKEN);
    localStorage.removeItem(LK_MODE);
    localStorage.removeItem(LK_NAME);
  } catch {}
}

export function setSimpleAuth(name: string, pid?: string): void {
  setSession("log", name, pid);
}

export function clearSimpleAuth(): void {
  clearSession();
  clearRemember();
}

export async function signIn(opts: {
  pin: string;
  name?: string;
  mode: SimpleMode;
  remember?: boolean;
}): Promise<{ ok: boolean; name?: string; resumeToken?: string; error?: string }> {
  const res = await fetch("/api/simple/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pin: opts.pin,
      name: opts.name || undefined,
      mode: opts.mode,
      remember: opts.remember ?? (opts.mode === "log"),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.message || "Sign in failed" };
  }
  const displayName = data.name || opts.name || undefined;
  setSession(opts.mode, displayName);
  if (data.resumeToken) {
    setRemember(data.resumeToken, opts.mode, displayName);
  }
  return { ok: true, name: displayName, resumeToken: data.resumeToken };
}

export async function tryAutoResume(): Promise<boolean> {
  try {
    if (sessionStorage.getItem(SK_UNLOCKED) === "1") return true;
    if (localStorage.getItem(LK_REMEMBER) !== "1") return false;
    const token = localStorage.getItem(LK_TOKEN);
    if (!token) return false;

    const res = await fetch("/api/simple/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeToken: token }),
    });
    if (!res.ok) {
      clearRemember();
      return false;
    }
    const data = await res.json();
    if (!data.ok) {
      clearRemember();
      return false;
    }
    const mode = (data.mode || localStorage.getItem(LK_MODE) || "log") as SimpleMode;
    const name = data.name || localStorage.getItem(LK_NAME) || undefined;
    setSession(mode, name);
    return true;
  } catch {
    clearRemember();
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    const token = localStorage.getItem(LK_TOKEN);
    await fetch("/api/simple/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeToken: token || undefined }),
    });
  } catch {}
  clearSession();
  clearRemember();
}
