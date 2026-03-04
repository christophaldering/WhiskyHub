import { useState, useEffect } from "react";
import { KeyRound, LogOut, Lock, Unlock, X } from "lucide-react";
import { getSession, signIn, signOut } from "@/lib/session";
import type { SessionMode } from "@/lib/session";

interface SessionSheetProps {
  open: boolean;
  onClose: () => void;
  onSessionChange: () => void;
  defaultMode?: SessionMode;
  variant?: "dark" | "light";
}

const darkColors = {
  bg: "#1a1714",
  text: "#f5f0e8",
  accent: "#d4a256",
  muted: "#4a4540",
  mutedLight: "#8a7e6d",
  border: "#2e281f",
  card: "#242018",
  error: "#cc4444",
};

export default function SessionSheet({ open, onClose, onSessionChange, defaultMode = "log", variant = "dark" }: SessionSheetProps) {
  const [session, setSession] = useState(() => getSession());
  const [view, setView] = useState<"idle" | "login" | "forgot" | "reset">("idle");
  const [siEmail, setSiEmail] = useState("");
  const [siPin, setSiPin] = useState("");
  const [siRemember, setSiRemember] = useState(true);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");
  const [resetPid, setResetPid] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setSession(getSession());
      setView("idle");
      setSiPin("");
      setSiEmail("");
      setSiError("");
      setSiRemember(true);
      setResetPid("");
      setResetCode("");
      setResetNewPw("");
      setResetSuccess(false);
    }
  }, [open, defaultMode]);

  if (!open) return null;

  const isDark = variant === "dark";
  const c = isDark ? darkColors : {
    bg: "hsl(var(--background))",
    text: "hsl(var(--foreground))",
    accent: "hsl(var(--primary))",
    muted: "hsl(var(--border))",
    mutedLight: "hsl(var(--muted-foreground))",
    border: "hsl(var(--border))",
    card: "hsl(var(--card))",
    error: "hsl(var(--destructive))",
  };

  const inputStyle: React.CSSProperties = isDark ? {
    width: "100%",
    background: darkColors.bg,
    border: `1px solid ${darkColors.border}`,
    borderRadius: 8,
    color: darkColors.text,
    fontSize: 13,
    padding: "10px 12px",
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
  } : {
    width: "100%",
    background: "transparent",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    fontSize: 13,
    padding: "10px 12px",
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siPin.trim() || !siEmail.trim()) return;
    setSiLoading(true);
    setSiError("");
    const result = await signIn({
      pin: siPin.trim(),
      email: siEmail.trim(),
      mode: defaultMode,
      remember: siRemember,
    });
    setSiLoading(false);
    if (!result.ok) {
      const msg = result.error || "";
      if (msg.includes("Invalid p") || msg.includes("Invalid P")) setSiError("Wrong password.");
      else if (msg.includes("Too many")) setSiError("Too many attempts. Wait a moment.");
      else if (msg.includes("No account")) setSiError("No account found for this email.");
      else setSiError(msg || "Something went wrong.");
      return;
    }
    setSession(getSession());
    setView("idle");
    setSiPin("");
    setSiEmail("");
    setSiError("");
    onSessionChange();
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(getSession());
    onSessionChange();
    onClose();
  };

  const modeLabel = session.mode === "tasting" ? "Anonymous tasting" : "Log mode";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }} data-testid="session-sheet">
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 420,
          background: c.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "20px 20px 40px",
          paddingBottom: "max(40px, env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: 0 }}>Session</h3>
          <button
            onClick={onClose}
            style={{ background: c.bg, border: "none", cursor: "pointer", padding: 6, borderRadius: "50%", color: c.mutedLight, display: "flex" }}
            data-testid="button-close-session-sheet"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: c.bg, borderRadius: 12, marginBottom: 12 }}>
          {session.signedIn ? (
            <Unlock style={{ width: 18, height: 18, color: c.accent, flexShrink: 0 }} />
          ) : (
            <Lock style={{ width: 18, height: 18, color: c.mutedLight, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            {session.signedIn ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{session.name || "Session active"}</div>
                <div style={{ fontSize: 11, color: c.mutedLight }}>Signed in · {modeLabel}</div>
              </>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>Signed out</div>
            )}
          </div>
        </div>

        {session.signedIn ? (
          <>
            <button
              onClick={handleSignOut}
              data-testid="button-session-signout"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 12,
                fontSize: 14,
                fontWeight: 500,
                background: "transparent",
                color: "#c44",
                border: "1px solid #c4444440",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <LogOut style={{ width: 16, height: 16 }} />
              Sign out
            </button>
            <div style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
              Signing out clears this session on this device.
              <br />Your saved tastings remain safe.
            </div>
          </>
        ) : view === "login" ? (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
            <input type="text" name="cs_trap_user" autoComplete="username" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
            <input type="password" name="cs_trap_pw" autoComplete="current-password" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
            <input
              type="email"
              placeholder="Email"
              name="cs_email"
              value={siEmail}
              onChange={(e) => setSiEmail(e.target.value)}
              style={inputStyle}
              data-testid="input-session-email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              data-form-type="other"
            />
            <input
              type="password"
              placeholder="Password"
              name="cs_password"
              value={siPin}
              onChange={(e) => setSiPin(e.target.value)}
              style={{ ...inputStyle, letterSpacing: 3 }}
              data-testid="input-session-pin"
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              data-form-type="other"
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.mutedLight, cursor: "pointer", padding: "2px 0" }}>
              <input
                type="checkbox"
                checked={siRemember}
                onChange={(e) => setSiRemember(e.target.checked)}
                style={{ accentColor: isDark ? darkColors.accent : undefined, width: 14, height: 14 }}
                data-testid="checkbox-session-remember"
              />
              Remember me on this device
            </label>
            <button
              type="submit"
              disabled={siLoading || !siPin.trim() || !siEmail.trim()}
              data-testid="button-session-signin-submit"
              style={{
                width: "100%",
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                background: (!siPin.trim() || !siEmail.trim()) ? c.muted : c.accent,
                color: (!siPin.trim() || !siEmail.trim()) ? c.mutedLight : (isDark ? darkColors.bg : "#fff"),
                border: "none",
                borderRadius: 10,
                cursor: siLoading ? "wait" : (!siPin.trim() || !siEmail.trim()) ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {siLoading ? "Signing in…" : "Sign in"}
            </button>
            {siError && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{siError}</p>}
            <button
              type="button"
              onClick={() => { setView("idle"); setSiError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: c.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", textAlign: "center", marginTop: 2 }}
              data-testid="button-session-signin-cancel"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={() => setView("login")}
              data-testid="button-session-signin"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 12,
                fontSize: 14,
                fontWeight: 500,
                background: c.accent,
                color: isDark ? darkColors.bg : "#fff",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <KeyRound style={{ width: 16, height: 16 }} />
              Sign in
            </button>
            <div style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
              Sign in with your password to save tastings across sessions.
              <br />No account needed — just a password.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
