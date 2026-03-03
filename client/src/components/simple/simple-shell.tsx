import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Wine, PenLine, User, KeyRound, X, LogOut, Lock, Unlock } from "lucide-react";
import { getAuth, signIn, signOut, tryAutoResume } from "@/lib/simple-auth";
import type { SimpleMode } from "@/lib/simple-auth";

const c = {
  bg: "#1a1714",
  text: "#f5f0e8",
  accent: "#d4a256",
  muted: "#4a4540",
  mutedLight: "#8a7e6d",
  border: "#2e281f",
  card: "#242018",
  error: "#cc4444",
};

const NAV_ITEMS = [
  { href: "/enter", icon: Wine, label: "Join" },
  { href: "/log-simple", icon: PenLine, label: "Log" },
  { href: "/my-taste", icon: User, label: "My Taste" },
];

interface SimpleShellProps {
  children: ReactNode;
  showBack?: boolean;
  maxWidth?: number;
}

export default function SimpleShell({ children, showBack = true, maxWidth = 420 }: SimpleShellProps) {
  const [location] = useLocation();
  const [showUserSheet, setShowUserSheet] = useState(false);
  const [authState, setAuthState] = useState(() => getAuth());
  const [resuming, setResuming] = useState(true);

  const [showSignInForm, setShowSignInForm] = useState(false);
  const [siName, setSiName] = useState("");
  const [siPin, setSiPin] = useState("");
  const [siRemember, setSiRemember] = useState(true);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");

  const refreshAuth = useCallback(() => setAuthState(getAuth()), []);

  useEffect(() => {
    tryAutoResume().then(() => {
      refreshAuth();
      setResuming(false);
    });
  }, [refreshAuth]);

  const inferMode = (): SimpleMode => {
    if (location.startsWith("/enter") || location.includes("/naked/") || location.includes("/join/")) return "tasting";
    return "log";
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siPin.trim()) return;
    setSiLoading(true);
    setSiError("");
    const mode = inferMode();
    const result = await signIn({
      pin: siPin.trim(),
      name: mode === "log" ? (siName.trim() || undefined) : undefined,
      mode,
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
    refreshAuth();
    setShowSignInForm(false);
    setShowUserSheet(false);
    setSiPin("");
    setSiName("");
    setSiError("");
  };

  const handleSignOut = async () => {
    await signOut();
    refreshAuth();
    setShowUserSheet(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    color: c.text,
    fontSize: 13,
    padding: "10px 12px",
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: c.bg,
        color: c.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "40px 20px 100px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Link href="/">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                color: c.accent,
                cursor: "pointer",
              }}
              data-testid="link-brand-home"
            >
              CaskSense
            </span>
          </Link>
          <button
            onClick={() => { setShowUserSheet(true); setShowSignInForm(false); setSiError(""); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: authState.unlocked ? c.accent : c.mutedLight,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            data-testid="button-user-menu"
          >
            <KeyRound style={{ width: 18, height: 18 }} strokeWidth={authState.unlocked ? 2.2 : 1.6} />
          </button>
        </div>

        <div style={{ width: "100%" }}>
          {children}
        </div>

        {showBack && (
          <Link
            href="/"
            style={{ fontSize: 12, color: c.muted, textDecoration: "none", marginTop: 40 }}
            data-testid="link-back"
          >
            ← Back
          </Link>
        )}
      </div>

      {showUserSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60 }} data-testid="user-sheet">
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowUserSheet(false)}
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
                onClick={() => setShowUserSheet(false)}
                style={{ background: c.bg, border: "none", cursor: "pointer", padding: 6, borderRadius: "50%", color: c.mutedLight, display: "flex" }}
                data-testid="button-close-user-sheet"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: c.bg, borderRadius: 12, marginBottom: 12 }}>
              {authState.unlocked ? (
                <Unlock style={{ width: 18, height: 18, color: c.accent, flexShrink: 0 }} />
              ) : (
                <Lock style={{ width: 18, height: 18, color: c.mutedLight, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                {authState.unlocked ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{authState.name || "Session active"}</div>
                    <div style={{ fontSize: 11, color: c.mutedLight }}>Signed in</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>Signed out</div>
                  </>
                )}
              </div>
            </div>

            {authState.unlocked ? (
              <button
                onClick={handleSignOut}
                data-testid="button-logout"
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
            ) : showSignInForm ? (
              <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inferMode() === "log" && (
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={siName}
                    onChange={(e) => setSiName(e.target.value)}
                    style={inputStyle}
                    data-testid="input-signin-name"
                    autoComplete="off"
                  />
                )}
                <input
                  type="password"
                  placeholder="PIN"
                  value={siPin}
                  onChange={(e) => setSiPin(e.target.value)}
                  style={{ ...inputStyle, letterSpacing: 3 }}
                  data-testid="input-signin-pin"
                  autoComplete="off"
                  autoFocus
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.mutedLight, cursor: "pointer", padding: "2px 0" }}>
                  <input
                    type="checkbox"
                    checked={siRemember}
                    onChange={(e) => setSiRemember(e.target.checked)}
                    style={{ accentColor: c.accent, width: 14, height: 14 }}
                    data-testid="checkbox-remember"
                  />
                  Stay signed in on this device
                </label>
                <button
                  type="submit"
                  disabled={siLoading || !siPin.trim()}
                  data-testid="button-signin-submit"
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    background: !siPin.trim() ? c.border : c.accent,
                    color: !siPin.trim() ? c.muted : c.bg,
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
                  onClick={() => { setShowSignInForm(false); setSiError(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: c.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", textAlign: "center", marginTop: 2 }}
                  data-testid="button-signin-cancel"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <button
                  onClick={() => setShowSignInForm(true)}
                  data-testid="button-signin-open"
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
                    color: c.bg,
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <KeyRound style={{ width: 16, height: 16 }} />
                  Sign in
                </button>
                <div style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 8 }}>
                  Sign in to save tastings to your session.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "rgba(26, 23, 20, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #2e281f",
          paddingTop: 8,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
        data-testid="simple-bottom-nav"
      >
        {NAV_ITEMS.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "4px 16px",
                  cursor: "pointer",
                  color: active ? c.accent : c.mutedLight,
                  transition: "color 0.2s",
                }}
                data-testid={`simple-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon
                  style={{ width: 20, height: 20 }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
