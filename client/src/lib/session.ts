import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";

const SK_SIGNED_IN = "session_signed_in";
const SK_MODE = "session_mode";
const SK_NAME = "session_name";
const SK_PID = "session_pid";
const SK_ROLE = "session_role";
const SK_PHOTO_URL = "session_photo_url";

const LK_REMEMBER = "session_remember";
const LK_TOKEN = "session_resume_token";
const LK_MODE = "session_resume_mode";
const LK_NAME = "session_resume_name";

export type SessionMode = "log" | "tasting";

export interface SessionState {
  signedIn: boolean;
  mode?: SessionMode;
  name?: string | null;
  pid?: string;
  role?: string;
  photoUrl?: string;
  remember?: boolean;
}

export function getSession(): SessionState {
  try {
    const signedIn = sessionStorage.getItem(SK_SIGNED_IN) === "1";
    const mode = (sessionStorage.getItem(SK_MODE) || undefined) as SessionMode | undefined;
    const name = sessionStorage.getItem(SK_NAME) || null;
    const pid = sessionStorage.getItem(SK_PID) || undefined;
    const role = sessionStorage.getItem(SK_ROLE) || undefined;
    const photoUrl = sessionStorage.getItem(SK_PHOTO_URL) || undefined;
    const remember = localStorage.getItem(LK_REMEMBER) === "1";
    return { signedIn, mode, name, pid, role, photoUrl, remember };
  } catch {
    return { signedIn: false };
  }
}

function setSessionStorage(mode: SessionMode, name?: string | null, pid?: string, role?: string, photoUrl?: string) {
  try {
    sessionStorage.setItem(SK_SIGNED_IN, "1");
    sessionStorage.setItem(SK_MODE, mode);
    if (name) sessionStorage.setItem(SK_NAME, name);
    else sessionStorage.removeItem(SK_NAME);
    if (pid) sessionStorage.setItem(SK_PID, pid);
    else sessionStorage.removeItem(SK_PID);
    if (role) sessionStorage.setItem(SK_ROLE, role);
    else sessionStorage.removeItem(SK_ROLE);
    if (photoUrl) sessionStorage.setItem(SK_PHOTO_URL, photoUrl);
    else sessionStorage.removeItem(SK_PHOTO_URL);
  } catch {}
}

function clearSessionStorage() {
  try {
    sessionStorage.removeItem(SK_SIGNED_IN);
    sessionStorage.removeItem(SK_MODE);
    sessionStorage.removeItem(SK_NAME);
    sessionStorage.removeItem(SK_PID);
    sessionStorage.removeItem(SK_ROLE);
    sessionStorage.removeItem(SK_PHOTO_URL);
  } catch {}
}

function setRemember(token: string, mode: SessionMode, name?: string | null) {
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

export function setSessionPid(pid: string) {
  try {
    sessionStorage.setItem(SK_PID, pid);
  } catch {}
}

export function syncStoreParticipant(pid?: string, name?: string | null, role?: string, photoUrl?: string) {
  try {
    if (pid) {
      useAppStore.getState().setParticipant({ id: pid, name: name || "", role, photoUrl });
    } else {
      useAppStore.getState().setParticipant(null);
    }
  } catch {}
}

export function setGuestSession(pid: string, name: string) {
  setSessionStorage("tasting", name, pid, undefined);
  try { localStorage.setItem("casksense_participant_id", pid); } catch {}
  syncStoreParticipant(pid, name, undefined);
  window.dispatchEvent(new Event("session-change"));
}

export async function signIn(opts: {
  pin: string;
  name?: string;
  email?: string;
  mode: SessionMode;
  remember?: boolean;
}): Promise<{ ok: boolean; name?: string; resumeToken?: string; error?: string; retryAfter?: number; code?: string; adminEmail?: string; participantId?: string }> {
  const res = await fetch("/api/session/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pin: opts.pin,
      name: opts.name || undefined,
      email: opts.email || undefined,
      mode: opts.mode,
      remember: opts.remember ?? (opts.mode === "log"),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.message || "Sign in failed", retryAfter: data.retryAfter, code: data.code, adminEmail: data.adminEmail, participantId: data.participantId };
  }
  const displayName = data.name || opts.name || null;
  const pid = data.pid || undefined;
  const role = data.role || undefined;
  const photoUrl = data.photoUrl || undefined;
  setSessionStorage(opts.mode, displayName, pid, role, photoUrl);
  if (pid) {
    try { localStorage.setItem("casksense_participant_id", pid); } catch {}
  }
  syncStoreParticipant(pid, displayName, role, photoUrl);
  if (data.resumeToken) {
    setRemember(data.resumeToken, opts.mode, displayName);
  } else {
    try {
      localStorage.setItem(LK_TOKEN, "");
      localStorage.setItem(LK_MODE, opts.mode);
      if (displayName) localStorage.setItem(LK_NAME, displayName);
    } catch {}
  }
  window.dispatchEvent(new Event("session-change"));
  return { ok: true, name: displayName || undefined, resumeToken: data.resumeToken };
}

export async function tryAutoResume(): Promise<boolean> {
  try {
    if (sessionStorage.getItem(SK_SIGNED_IN) === "1") {
      syncStoreParticipant(
        sessionStorage.getItem(SK_PID) || undefined,
        sessionStorage.getItem(SK_NAME),
        sessionStorage.getItem(SK_ROLE) || undefined,
      );
      return true;
    }

    migrateLegacyKeys();

    const token = localStorage.getItem(LK_TOKEN);
    if (token) {
      try {
        const res = await fetch("/api/session/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeToken: token }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            const mode = (data.mode || localStorage.getItem(LK_MODE) || "log") as SessionMode;
            const name = data.name || localStorage.getItem(LK_NAME) || null;
            const pid = data.pid || undefined;
            const role = data.role || undefined;
            const photoUrl = data.photoUrl || undefined;
            setSessionStorage(mode, name, pid, role, photoUrl);
            if (pid) {
              try { localStorage.setItem("casksense_participant_id", pid); } catch {}
            }
            syncStoreParticipant(pid, name, role, photoUrl);
            window.dispatchEvent(new Event("session-change"));
            return true;
          }
        } else if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          if (errData.code === "EMAIL_VERIFICATION_EXPIRED") {
            clearRemember();
            try { localStorage.removeItem("casksense_participant_id"); } catch {}
            syncStoreParticipant(undefined);
            return false;
          }
        }
      } catch {}
      clearRemember();
    }

    const storedPid = localStorage.getItem("casksense_participant_id");
    const storePid = useAppStore.getState().currentParticipant?.id;
    const candidatePid = storedPid || storePid;
    if (candidatePid) {
      try {
        const verRes = await fetch(`/api/participants/${candidatePid}/verification-status`, { headers: { "x-participant-id": candidatePid } });
        if (verRes.ok) {
          const verData = await verRes.json();
          if (!verData.emailVerified && verData.expired) {
            try { localStorage.removeItem("casksense_participant_id"); } catch {}
            clearRemember();
            syncStoreParticipant(undefined);
            return false;
          }
        } else if (verRes.status === 503) {
          syncStoreParticipant(undefined);
          return false;
        }
      } catch {
        syncStoreParticipant(undefined);
        return false;
      }
      try {
        const res = await fetch(`/api/participants/${candidatePid}`, { headers: { "x-participant-id": candidatePid } });
        if (res.ok) {
          const p = await res.json();
          if (p?.id) {
            const mode = (localStorage.getItem(LK_MODE) || "log") as SessionMode;
            setSessionStorage(mode, p.name || null, p.id, p.role || undefined, p.photoUrl || undefined);
            try { localStorage.setItem("casksense_participant_id", p.id); } catch {}
            syncStoreParticipant(p.id, p.name, p.role, p.photoUrl || undefined);
            window.dispatchEvent(new Event("session-change"));
            return true;
          }
        }
      } catch {}
      if (storedPid) {
        try { localStorage.removeItem("casksense_participant_id"); } catch {}
      }
    }

    syncStoreParticipant(undefined);
    return false;
  } catch {
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    const token = localStorage.getItem(LK_TOKEN);
    await fetch("/api/session/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeToken: token || undefined }),
    });
  } catch {}
  clearSessionStorage();
  clearRemember();
  try { localStorage.removeItem("casksense_participant_id"); } catch {}
  try { useAppStore.getState().setParticipant(null); } catch {}
  try { queryClient.clear(); } catch {}
  const offlineKeys = [
    "m2_solo_logs", "simple_manual_logs", "simple_feedback",
    "simple_score_details", "casksense_remember_name",
  ];
  for (const k of offlineKeys) {
    try { localStorage.removeItem(k); } catch {}
  }
  window.dispatchEvent(new Event("session-change"));
}

function migrateLegacyKeys() {
  try {
    const oldRemember = localStorage.getItem("simple_remember");
    const oldToken = localStorage.getItem("simple_resume_token");
    if (oldRemember === "1" && oldToken) {
      localStorage.setItem(LK_REMEMBER, "1");
      localStorage.setItem(LK_TOKEN, oldToken);
      const m = localStorage.getItem("simple_resume_mode");
      if (m) localStorage.setItem(LK_MODE, m);
      const n = localStorage.getItem("simple_resume_name");
      if (n) localStorage.setItem(LK_NAME, n);
    }
    localStorage.removeItem("simple_remember");
    localStorage.removeItem("simple_resume_token");
    localStorage.removeItem("simple_resume_mode");
    localStorage.removeItem("simple_resume_name");

    const oldUnlocked = sessionStorage.getItem("simple_unlocked");
    if (oldUnlocked === "1") {
      sessionStorage.setItem(SK_SIGNED_IN, "1");
      const sm = sessionStorage.getItem("simple_mode");
      if (sm) sessionStorage.setItem(SK_MODE, sm);
      const sn = sessionStorage.getItem("simple_name");
      if (sn) sessionStorage.setItem(SK_NAME, sn);
      const sp = sessionStorage.getItem("simple_pid");
      if (sp) sessionStorage.setItem(SK_PID, sp);
    }
    sessionStorage.removeItem("simple_unlocked");
    sessionStorage.removeItem("simple_mode");
    sessionStorage.removeItem("simple_name");
    sessionStorage.removeItem("simple_pid");
  } catch {}
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(getSession);
  useEffect(() => {
    const handler = () => setState(getSession());
    window.addEventListener("session-change", handler);
    return () => window.removeEventListener("session-change", handler);
  }, []);
  return state;
}
