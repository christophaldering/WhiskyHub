import { useState, useEffect } from "react";
import { KeyRound, LogOut, Lock, Unlock, X, Eye, EyeOff, Pencil, Check, ChevronDown, ChevronUp } from "lucide-react";
import { getSession, signIn, signOut } from "@/lib/session";
import type { SessionMode } from "@/lib/session";
import { useAppStore } from "@/lib/store";

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
  success: "#4a9e4a",
};

type View = "idle" | "login" | "forgot" | "reset" | "recoverEmail";

export default function SessionSheet({ open, onClose, onSessionChange, defaultMode = "log", variant = "dark" }: SessionSheetProps) {
  const [session, setSession] = useState(() => getSession());
  const [view, setView] = useState<View>("idle");
  const [siName, setSiName] = useState("");
  const [siEmail, setSiEmail] = useState("");
  const [siPin, setSiPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [siRemember, setSiRemember] = useState(true);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");
  const [resetPid, setResetPid] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [recoverName, setRecoverName] = useState("");
  const [recoverPw, setRecoverPw] = useState("");
  const [recoveredEmail, setRecoveredEmail] = useState("");
  const [showRecoverPw, setShowRecoverPw] = useState(false);
  const [accountSection, setAccountSection] = useState<"" | "name" | "email" | "password">("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCurPw, setEditCurPw] = useState("");
  const [editNewPw, setEditNewPw] = useState("");
  const [showEditCurPw, setShowEditCurPw] = useState(false);
  const [showEditNewPw, setShowEditNewPw] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (open) {
      setSession(getSession());
      setView("idle");
      setSiPin("");
      setSiEmail("");
      setSiName("");
      setSiError("");
      setSiRemember(true);
      setShowPassword(false);
      setResetPid("");
      setResetCode("");
      setResetNewPw("");
      setResetSuccess(false);
      setShowResetPw(false);
      setRecoverName("");
      setRecoverPw("");
      setRecoveredEmail("");
      setShowRecoverPw(false);
      setAccountSection("");
      setEditMsg("");
      setEditLoading(false);
      setEditCurPw("");
      setEditNewPw("");
      setShowEditCurPw(false);
      setShowEditNewPw(false);
      setLockoutSeconds(0);
    }
  }, [open, defaultMode]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setSiError("");
          return 0;
        }
        const mins = Math.floor(next / 60);
        const secs = next % 60;
        setSiError(`Too many attempts. Try again in ${mins}:${String(secs).padStart(2, "0")}.`);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds > 0]);

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
    success: "#4a9e4a",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: isDark ? darkColors.bg : "transparent",
    border: `1px solid ${isDark ? darkColors.border : "hsl(var(--border))"}`,
    borderRadius: 8,
    color: isDark ? darkColors.text : "hsl(var(--foreground))",
    fontSize: 13,
    padding: "10px 12px",
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    background: c.accent,
    color: isDark ? darkColors.bg : "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
  };

  const btnSecondary: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: c.mutedLight,
    fontSize: 12,
    fontFamily: "system-ui, sans-serif",
    textAlign: "center" as const,
    marginTop: 2,
  };

  const linkStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: c.accent,
    fontSize: 12,
    fontFamily: "system-ui, sans-serif",
    padding: 0,
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };

  const pwFieldWrap: React.CSSProperties = {
    position: "relative",
    width: "100%",
  };

  const eyeBtn: React.CSSProperties = {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: c.mutedLight,
    padding: 4,
    display: "flex",
    alignItems: "center",
  };

  const pid = (() => {
    try { return localStorage.getItem("casksense_participant_id") || sessionStorage.getItem("session_pid") || ""; } catch { return ""; }
  })();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siPin.trim() || !siEmail.trim()) return;
    setSiLoading(true);
    setSiError("");
    const result = await signIn({
      pin: siPin.trim(),
      email: siEmail.trim(),
      name: siName.trim() || undefined,
      mode: defaultMode,
      remember: siRemember,
    });
    setSiLoading(false);
    if (!result.ok) {
      const msg = result.error || "";
      if (result.retryAfter && result.retryAfter > 0) {
        setLockoutSeconds(result.retryAfter);
        const mins = Math.floor(result.retryAfter / 60);
        const secs = result.retryAfter % 60;
        setSiError(`Too many attempts. Try again in ${mins}:${String(secs).padStart(2, "0")}.`);
      } else if (msg.includes("Invalid p") || msg.includes("Invalid P")) setSiError("Wrong password.");
      else if (msg.includes("Too many")) setSiError("Too many attempts. Wait a moment.");
      else if (msg.includes("No account")) setSiError("No account found for this email.");
      else setSiError(msg || "Something went wrong.");
      return;
    }
    setSession(getSession());
    setView("idle");
    setSiPin("");
    setSiEmail("");
    setSiName("");
    setSiError("");
    onSessionChange();
    onClose();
  };

  const { setParticipant: clearStoreParticipant } = useAppStore();

  const handleSignOut = async () => {
    await signOut();
    clearStoreParticipant(null);
    try { localStorage.removeItem("casksense_participant_id"); } catch {}
    setSession(getSession());
    onSessionChange();
    onClose();
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siEmail.trim()) return;
    setSiLoading(true);
    setSiError("");
    try {
      const res = await fetch("/api/participants/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: siEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSiError(data.message || "Could not send reset code.");
        return;
      }
      setResetPid(data.participantId);
      setView("reset");
      setSiError("");
    } catch {
      setSiError("Network error. Please try again.");
    } finally {
      setSiLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !resetNewPw.trim()) return;
    if (resetNewPw.trim().length < 4) { setSiError("Password must be at least 4 characters."); return; }
    setSiLoading(true);
    setSiError("");
    try {
      const res = await fetch("/api/participants/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: resetPid, code: resetCode.trim(), newPin: resetNewPw.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSiError(data.message || "Reset failed.");
        return;
      }
      setResetSuccess(true);
      setSiError("");
    } catch {
      setSiError("Network error. Please try again.");
    } finally {
      setSiLoading(false);
    }
  };

  const handleRecoverEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverName.trim() || !recoverPw.trim()) return;
    setSiLoading(true);
    setSiError("");
    try {
      const res = await fetch("/api/participants/recover-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: recoverName.trim(), password: recoverPw.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSiError(data.message || "Could not recover email.");
        return;
      }
      setRecoveredEmail(data.maskedEmail);
      setSiError("");
    } catch {
      setSiError("Network error. Please try again.");
    } finally {
      setSiLoading(false);
    }
  };

  const handleAccountSave = async (section: "name" | "email" | "password") => {
    if (!pid) return;
    setEditLoading(true);
    setEditMsg("");
    try {
      if (section === "name") {
        if (!editName.trim()) { setEditMsg("Name cannot be empty."); setEditLoading(false); return; }
        const res = await fetch(`/api/participants/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        });
        if (!res.ok) { const d = await res.json(); setEditMsg(d.message || "Failed."); setEditLoading(false); return; }
        setEditMsg("Name updated.");
        const s = getSession();
        if (s.signedIn) {
          try { sessionStorage.setItem("session_name", editName.trim()); } catch {}
          try { const lk = localStorage.getItem("casksense_remember_name"); if (lk) localStorage.setItem("casksense_remember_name", editName.trim()); } catch {}
        }
        setSession({ ...session, name: editName.trim() });
        onSessionChange();
      } else if (section === "email") {
        if (!editEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) { setEditMsg("Enter a valid email."); setEditLoading(false); return; }
        const res = await fetch(`/api/participants/${pid}/email`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: editEmail.trim() }),
        });
        if (!res.ok) { const d = await res.json(); setEditMsg(d.message || "Failed."); setEditLoading(false); return; }
        setEditMsg("Email updated.");
      } else if (section === "password") {
        if (!editCurPw.trim() || !editNewPw.trim()) { setEditMsg("Fill in both fields."); setEditLoading(false); return; }
        if (editNewPw.trim().length < 4) { setEditMsg("New password must be at least 4 characters."); setEditLoading(false); return; }
        const res = await fetch(`/api/participants/${pid}/pin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPin: editCurPw.trim(), newPin: editNewPw.trim() }),
        });
        if (!res.ok) { const d = await res.json(); setEditMsg(d.message || "Failed."); setEditLoading(false); return; }
        setEditMsg("Password updated.");
        setEditCurPw("");
        setEditNewPw("");
      }
    } catch {
      setEditMsg("Network error.");
    } finally {
      setEditLoading(false);
    }
  };

  const modeLabel = session.mode === "tasting" ? "Anonymous tasting" : "Log mode";

  const renderPasswordInput = (
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    onToggle: () => void,
    placeholder: string,
    testId: string,
    extraStyle?: React.CSSProperties,
  ) => (
    <div style={pwFieldWrap}>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        name="cs_password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 36, letterSpacing: show ? 0 : 3, ...extraStyle }}
        data-testid={testId}
        autoComplete="new-password"
        autoCapitalize="none"
        spellCheck={false}
        data-form-type="other"
      />
      <button type="button" onClick={onToggle} style={eyeBtn} data-testid={`${testId}-toggle`} tabIndex={-1}>
        {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
      </button>
    </div>
  );

  const renderSignedIn = () => (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {(["name", "email", "password"] as const).map((key) => {
          const labels = { name: "Change Name", email: "Change Email", password: "Change Password" };
          const isOpen = accountSection === key;
          return (
            <div key={key} style={{ background: c.bg, borderRadius: 10, overflow: "hidden" }}>
              <button
                onClick={() => {
                  setAccountSection(isOpen ? "" : key);
                  setEditMsg("");
                  if (key === "name") setEditName(session.name || "");
                  if (key === "email") setEditEmail("");
                  if (key === "password") { setEditCurPw(""); setEditNewPw(""); setShowEditCurPw(false); setShowEditNewPw(false); }
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: c.text,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid={`button-account-${key}`}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Pencil style={{ width: 14, height: 14, color: c.mutedLight }} />
                  {labels[key]}
                </span>
                {isOpen ? <ChevronUp style={{ width: 14, height: 14, color: c.mutedLight }} /> : <ChevronDown style={{ width: 14, height: 14, color: c.mutedLight }} />}
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {key === "name" && (
                    <>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display name" style={inputStyle} data-testid="input-edit-name" />
                      <button onClick={() => handleAccountSave("name")} disabled={editLoading} style={{ ...btnPrimary, padding: 8, fontSize: 13 }} data-testid="button-save-name">
                        {editLoading ? "Saving…" : "Save"}
                      </button>
                    </>
                  )}
                  {key === "email" && (
                    <>
                      <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="New email" style={inputStyle} data-testid="input-edit-email" />
                      <button onClick={() => handleAccountSave("email")} disabled={editLoading} style={{ ...btnPrimary, padding: 8, fontSize: 13 }} data-testid="button-save-email">
                        {editLoading ? "Saving…" : "Save"}
                      </button>
                    </>
                  )}
                  {key === "password" && (
                    <>
                      {renderPasswordInput(editCurPw, setEditCurPw, showEditCurPw, () => setShowEditCurPw(!showEditCurPw), "Current password", "input-edit-cur-pw")}
                      {renderPasswordInput(editNewPw, setEditNewPw, showEditNewPw, () => setShowEditNewPw(!showEditNewPw), "New password", "input-edit-new-pw")}
                      <button onClick={() => handleAccountSave("password")} disabled={editLoading} style={{ ...btnPrimary, padding: 8, fontSize: 13 }} data-testid="button-save-password">
                        {editLoading ? "Saving…" : "Save"}
                      </button>
                    </>
                  )}
                  {editMsg && <p style={{ fontSize: 12, color: editMsg.includes("updated") ? c.success : c.error, margin: 0, textAlign: "center" }}>{editMsg}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
  );

  const renderLoginForm = () => (
    <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
      <input type="text" name="cs_trap_user" autoComplete="username" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
      <input type="password" name="cs_trap_pw" autoComplete="current-password" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
      <input
        type="text"
        placeholder="Name (optional)"
        name="cs_display_name"
        value={siName}
        onChange={(e) => setSiName(e.target.value)}
        style={inputStyle}
        data-testid="input-session-name"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        data-form-type="other"
      />
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
      {renderPasswordInput(siPin, setSiPin, showPassword, () => setShowPassword(!showPassword), "Password", "input-session-pin")}
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
        disabled={siLoading || lockoutSeconds > 0 || !siPin.trim() || !siEmail.trim()}
        data-testid="button-session-signin-submit"
        style={{
          ...btnPrimary,
          background: (lockoutSeconds > 0 || !siPin.trim() || !siEmail.trim()) ? c.muted : c.accent,
          color: (lockoutSeconds > 0 || !siPin.trim() || !siEmail.trim()) ? c.mutedLight : (isDark ? darkColors.bg : "#fff"),
          cursor: siLoading ? "wait" : (lockoutSeconds > 0 || !siPin.trim() || !siEmail.trim()) ? "not-allowed" : "pointer",
        }}
      >
        {siLoading ? "Signing in…" : "Sign in"}
      </button>
      {siError && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{siError}</p>}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
        <button type="button" onClick={() => { setView("forgot"); setSiError(""); }} style={linkStyle} data-testid="link-forgot-password">
          Forgot password?
        </button>
        <button type="button" onClick={() => { setView("recoverEmail"); setSiError(""); }} style={linkStyle} data-testid="link-forgot-email">
          Forgot email?
        </button>
      </div>
      <button type="button" onClick={() => { setView("idle"); setSiError(""); }} style={btnSecondary} data-testid="button-session-signin-cancel">
        Cancel
      </button>
    </form>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
      <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Reset Password</p>
      <p style={{ fontSize: 12, color: c.mutedLight, margin: "0 0 8px" }}>Enter your email. We'll send a 6-digit code.</p>
      <input
        type="email"
        placeholder="Email"
        value={siEmail}
        onChange={(e) => setSiEmail(e.target.value)}
        style={inputStyle}
        data-testid="input-forgot-email"
        autoComplete="off"
      />
      <button type="submit" disabled={siLoading || !siEmail.trim()} style={{ ...btnPrimary, opacity: !siEmail.trim() ? 0.5 : 1, cursor: siLoading ? "wait" : "pointer" }} data-testid="button-forgot-submit">
        {siLoading ? "Sending…" : "Send Code"}
      </button>
      {siError && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{siError}</p>}
      <button type="button" onClick={() => { setView("login"); setSiError(""); }} style={btnSecondary} data-testid="button-forgot-back">
        Back to login
      </button>
    </form>
  );

  const renderResetPassword = () => (
    resetSuccess ? (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <Check style={{ width: 32, height: 32, color: c.success, margin: "0 auto 12px" }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text }}>Password reset successfully!</p>
        <p style={{ fontSize: 12, color: c.mutedLight, marginBottom: 16 }}>You can now sign in with your new password.</p>
        <button onClick={() => { setView("login"); setResetSuccess(false); setSiError(""); }} style={btnPrimary} data-testid="button-reset-to-login">
          Sign in
        </button>
      </div>
    ) : (
      <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Enter Reset Code</p>
        <p style={{ fontSize: 12, color: c.mutedLight, margin: "0 0 8px" }}>Check your email for the 6-digit code.</p>
        <input
          type="text"
          placeholder="6-digit code"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          style={{ ...inputStyle, letterSpacing: 6, textAlign: "center", fontSize: 18, fontWeight: 600 }}
          data-testid="input-reset-code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
        />
        {renderPasswordInput(resetNewPw, setResetNewPw, showResetPw, () => setShowResetPw(!showResetPw), "New password", "input-reset-new-pw")}
        <button type="submit" disabled={siLoading || resetCode.length < 6 || !resetNewPw.trim()} style={{ ...btnPrimary, opacity: (resetCode.length < 6 || !resetNewPw.trim()) ? 0.5 : 1 }} data-testid="button-reset-submit">
          {siLoading ? "Resetting…" : "Reset Password"}
        </button>
        {siError && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{siError}</p>}
        <button type="button" onClick={() => { setView("forgot"); setSiError(""); }} style={btnSecondary} data-testid="button-reset-back">
          Resend code
        </button>
      </form>
    )
  );

  const renderRecoverEmail = () => (
    recoveredEmail ? (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 8 }}>Your email address</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: c.accent, fontFamily: "monospace", letterSpacing: 1, marginBottom: 16 }}>{recoveredEmail}</p>
        <button onClick={() => { setView("login"); setSiEmail(""); setRecoveredEmail(""); setSiError(""); }} style={btnPrimary} data-testid="button-recover-to-login">
          Sign in
        </button>
      </div>
    ) : (
      <form onSubmit={handleRecoverEmail} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
        <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Recover Email</p>
        <p style={{ fontSize: 12, color: c.mutedLight, margin: "0 0 8px" }}>Enter your name and password to reveal your email.</p>
        <input
          type="text"
          placeholder="Name"
          value={recoverName}
          onChange={(e) => setRecoverName(e.target.value)}
          style={inputStyle}
          data-testid="input-recover-name"
          autoComplete="off"
        />
        {renderPasswordInput(recoverPw, setRecoverPw, showRecoverPw, () => setShowRecoverPw(!showRecoverPw), "Password", "input-recover-pw")}
        <button type="submit" disabled={siLoading || !recoverName.trim() || !recoverPw.trim()} style={{ ...btnPrimary, opacity: (!recoverName.trim() || !recoverPw.trim()) ? 0.5 : 1 }} data-testid="button-recover-submit">
          {siLoading ? "Looking up…" : "Recover Email"}
        </button>
        {siError && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{siError}</p>}
        <button type="button" onClick={() => { setView("login"); setSiError(""); }} style={btnSecondary} data-testid="button-recover-back">
          Back to login
        </button>
      </form>
    )
  );

  const renderIdle = () => (
    <>
      <button
        onClick={() => setView("login")}
        data-testid="button-session-signin"
        style={{
          ...btnPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontWeight: 500,
        }}
      >
        <KeyRound style={{ width: 16, height: 16 }} />
        Sign in
      </button>
      <div style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
        Sign in with your email and password.
      </div>
    </>
  );

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
          maxHeight: "85vh",
          overflowY: "auto",
          background: c.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "20px 20px 40px",
          paddingBottom: "max(40px, env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: 0 }}>
            {view === "forgot" ? "Reset Password" : view === "reset" ? "Reset Password" : view === "recoverEmail" ? "Recover Email" : "Session"}
          </h3>
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

        {session.signedIn ? renderSignedIn() :
          view === "login" ? renderLoginForm() :
          view === "forgot" ? renderForgotPassword() :
          view === "reset" ? renderResetPassword() :
          view === "recoverEmail" ? renderRecoverEmail() :
          renderIdle()
        }
      </div>
    </div>
  );
}
