import { getSession, signIn as sessionSignIn, signOut as sessionSignOut, tryAutoResume as sessionTryAutoResume, setSessionPid } from "./session";
import type { SessionMode, SessionState } from "./session";

export type SimpleMode = SessionMode;

export function getAuth(): { unlocked: boolean; mode?: SessionMode; name?: string; pid?: string } {
  const s = getSession();
  return { unlocked: s.signedIn, mode: s.mode, name: s.name || undefined, pid: s.pid };
}

export function getSimpleAuth(): { unlocked: boolean; name?: string; pid?: string } {
  return getAuth();
}

export function setSimpleAuth(name: string, pid?: string): void {
  try {
    sessionStorage.setItem("session_signed_in", "1");
    sessionStorage.setItem("session_mode", "log");
    if (name) sessionStorage.setItem("session_name", name);
    if (pid) sessionStorage.setItem("session_pid", pid);
  } catch {}
}

export function clearSimpleAuth(): void {
  sessionSignOut();
}

export async function signIn(opts: {
  pin: string;
  name?: string;
  mode: SessionMode;
  remember?: boolean;
}): Promise<{ ok: boolean; name?: string; resumeToken?: string; error?: string }> {
  return sessionSignIn(opts);
}

export async function tryAutoResume(): Promise<boolean> {
  return sessionTryAutoResume();
}

export async function signOut(): Promise<void> {
  return sessionSignOut();
}
