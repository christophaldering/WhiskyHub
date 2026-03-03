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
  const [showForm, setShowForm] = useState(false);
  const [siName, setSiName] = useState("");
  const [siPin, setSiPin] = useState("");
  const [siRemember, setSiRemember] = useState(defaultMode === "log");
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");

  useEffect(() => {
    if (open) {
      setSession(getSession());
      setShowForm(false);
      setSiPin("");
      setSiName("");
      setSiError("");
      setSiRemember(defaultMode === "log");
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
    if (!siPin.trim()) return;
    setSiLoading(true);
    setSiError("");
    const result = await signIn({
      pin: siPin.trim(),
      name: defaultMode === "log" ? (siName.trim() || undefined) : undefined,
      mode: defaultMode,
      remember: siRemember,
    });
    setSiLoading(false);
    if (!result.ok) {
      const msg = result.error || "";
      if (msg.includes("Invalid PIN")) setSiError("Wrong PIN.");
      else if (msg.includes("Too many")) setSiError("Too many attempts. Wait a moment.");
      else setSiError(msg || "Something went wrong.");
      return;
    }
    setSession(getSession());
    setShowForm(false);
    setSiPin("");
    setSiName("");
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
          left: 0,
          right: 0,
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
        ) : showForm ? (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {defaultMode === "log" && (
              <input
                type="text"
                placeholder="Name (optional)"
                value={siName}
                onChange={(e) => setSiName(e.target.value)}
                style={inputStyle}
                data-testid="input-session-name"
                autoComplete="off"
              />
            )}
            <input
              type="password"
              placeholder="PIN"
              value={siPin}
              onChange={(e) => setSiPin(e.target.value)}
              style={{ ...inputStyle, letterSpacing: 3 }}
              data-testid="input-session-pin"
              autoComplete="off"
              autoFocus
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
              disabled={siLoading || !siPin.trim()}
              data-testid="button-session-signin-submit"
              style={{
                width: "100%",
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                background: !siPin.trim() ? c.muted : c.accent,
                color: !siPin.trim() ? c.mutedLight : (isDark ? darkColors.bg : "#fff"),
                border: "none",
                borderRadius: 10,
                cursor: siLoading ? "wait" : !siPin.trim() ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {siLoading ? "Signing in…" : "Sign in"}
            </button>
            {siError && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{siError}</p>}
            <button
              type="button"
              onClick={() => { setShowForm(false); setSiError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: c.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", textAlign: "center", marginTop: 2 }}
              data-testid="button-session-signin-cancel"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={() => setShowForm(true)}
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
              Sign in with your PIN to save tastings across sessions.
              <br />No account needed — just a PIN.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
