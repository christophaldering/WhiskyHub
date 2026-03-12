import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { v } from "@/lib/themeVars";
import { getTheme, setTheme, type ThemeName } from "@/lib/themeVars";
import { getSession, signIn, signOut, setSessionPid } from "@/lib/session";
import { participantApi } from "@/lib/api";
import {
  X, LogOut, User, Globe, Settings, Palette, Download,
  ArrowLeftRight, UserPlus, KeyRound, Mail, Eye, EyeOff,
  Shield, ChevronLeft, Sun, Moon, CheckCircle2, Info, HandHeart,
  FlaskConical, Layout
} from "lucide-react";
import i18n from "@/lib/i18n";

function mapRouteToCounterpart(path: string): { target: string; isLabs: boolean } {
  const isLabs = path.startsWith("/labs");

  const specialM2ToLabs: Record<string, string> = {
    "/m2": "/labs/home",
    "/m2/tastings": "/labs/tastings",
    "/m2/tastings/host": "/labs/host",
    "/m2/tastings/dashboard": "/labs/host/dashboard",
    "/m2/tastings/solo": "/labs/solo",
    "/m2/tastings/join": "/labs/join",
    "/m2/taste/historical": "/labs/host/history",
    "/m2/taste/historical/insights": "/labs/host/history/insights",
    "/m2/discover/about": "/labs/about",
    "/m2/circle": "/labs/circle",
  };

  const specialLabsToM2: Record<string, string> = {};
  for (const [m2, labs] of Object.entries(specialM2ToLabs)) {
    specialLabsToM2[labs] = m2;
  }

  if (isLabs) {
    if (specialLabsToM2[path]) return { target: specialLabsToM2[path], isLabs: true };
    const sub = path.replace(/^\/labs/, "");
    return { target: "/m2" + (sub || ""), isLabs: true };
  } else {
    if (specialM2ToLabs[path]) return { target: specialM2ToLabs[path], isLabs: false };
    const sub = path.replace(/^\/m2/, "");
    return { target: "/labs" + (sub || "/home"), isLabs: false };
  }
}

type MenuView = "main" | "register" | "forgot-pin" | "reset-pin" | "verify-email" | "guest";

interface M2ProfileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function M2ProfileMenu({ open, onClose }: M2ProfileMenuProps) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const [session, setSession] = useState(getSession());
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(getTheme());

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");
  const [regShowPin, setRegShowPin] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPid, setForgotPid] = useState("");

  const [resetCode, setResetCode] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [verifyCode, setVerifyCode] = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPin, setGuestPin] = useState("");

  const refreshSession = useCallback(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    if (open) {
      refreshSession();
      setView("main");
      setError("");
      setRegSuccess(false);
      setResetSuccess(false);
      setVerifySuccess(false);
    }
  }, [open, refreshSession]);

  useEffect(() => {
    window.addEventListener("session-change", refreshSession);
    return () => window.removeEventListener("session-change", refreshSession);
  }, [refreshSession]);

  if (!open) return null;

  const handleSignIn = async () => {
    if (!email.trim() || !pin.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn({
        pin: pin.trim(),
        email: email.trim(),
        mode: "log",
        remember: true,
      });
      if (!result.ok) {
        const msg = result.error || "";
        if (result.retryAfter && result.retryAfter > 0) {
          const mins = Math.floor(result.retryAfter / 60);
          const secs = result.retryAfter % 60;
          setError(t("m2.profile.tooManyAttempts", `Too many attempts. Try again in ${mins}:${String(secs).padStart(2, "0")}`, { time: `${mins}:${String(secs).padStart(2, "0")}` }));
        } else if (msg.includes("Invalid p") || msg.includes("Invalid P")) {
          setError(t("m2.profile.wrongPassword", "Wrong password"));
        } else if (msg.includes("No account")) {
          setError(t("m2.profile.noAccount", "No account found with this email"));
        } else {
          setError(msg || t("m2.profile.loginFailed", "Login failed"));
        }
        setLoading(false);
        return;
      }
      setEmail("");
      setPin("");
      setError("");
      refreshSession();
      onClose();
    } catch (e: any) {
      setError(e.message || t("m2.profile.loginFailed", "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    refreshSession();
    onClose();
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "de" ? "en" : "de";
    i18n.changeLanguage(newLang);
  };

  const toggleTheme = () => {
    const newTheme: ThemeName = currentTheme === "dark-warm" ? "light-warm" : "dark-warm";
    setTheme(newTheme);
    setCurrentTheme(newTheme);
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPin.trim()) {
      setError(t("m2.register.allFieldsRequired", "All fields are required"));
      return;
    }
    if (regPin !== regPinConfirm) {
      setError(t("m2.register.pinMismatch", "Passwords do not match"));
      return;
    }
    if (regPin.length < 4) {
      setError(t("m2.register.pinTooShort", "Password must be at least 4 characters"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError(t("m2.register.invalidEmail", "Please enter a valid email"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await participantApi.loginOrCreate(regName.trim(), regPin.trim(), regEmail.trim());
      setRegSuccess(true);
      const result = await signIn({
        pin: regPin.trim(),
        email: regEmail.trim(),
        mode: "log",
        remember: true,
      });
      if (result.ok) {
        refreshSession();
        setTimeout(() => onClose(), 1500);
      }
    } catch (e: any) {
      setError(e.message || t("m2.register.failed", "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    if (!forgotEmail.trim()) {
      setError(t("m2.forgotPin.emailRequired", "Email is required"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/participants/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("m2.forgotPin.failed", "Request failed"));
        setLoading(false);
        return;
      }
      setForgotPid(data.participantId);
      setView("reset-pin");
    } catch (e: any) {
      setError(e.message || t("m2.forgotPin.failed", "Request failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!resetCode.trim() || !resetNewPin.trim()) {
      setError(t("m2.resetPin.allFieldsRequired", "All fields are required"));
      return;
    }
    if (resetNewPin.length < 4) {
      setError(t("m2.resetPin.pinTooShort", "Password must be at least 4 characters"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/participants/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: forgotPid, code: resetCode.trim(), newPin: resetNewPin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("m2.resetPin.failed", "Reset failed"));
        setLoading(false);
        return;
      }
      setResetSuccess(true);
      setTimeout(() => { setView("main"); setResetSuccess(false); }, 2000);
    } catch (e: any) {
      setError(e.message || t("m2.resetPin.failed", "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode.trim()) return;
    const pid = session.pid;
    if (!pid) return;
    setError("");
    setLoading(true);
    try {
      await participantApi.verify(pid, verifyCode.trim());
      setVerifySuccess(true);
      setTimeout(() => { setView("main"); }, 1500);
    } catch (e: any) {
      setError(e.message || t("m2.verify.failed", "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const pid = session.pid;
    if (!pid) return;
    setLoading(true);
    try {
      await participantApi.resendVerification(pid);
      setError("");
    } catch (e: any) {
      setError(e.message || t("m2.profile.resendFailed", "Failed to resend"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestJoin = async () => {
    if (!guestName.trim() || !guestPin.trim()) {
      setError(t("m2.guest.allFieldsRequired", "Name and tasting code are required"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await participantApi.guestJoin(guestName.trim(), guestPin.trim());
      if (res?.id) {
        setSessionPid(res.id);
        try {
          sessionStorage.setItem("session_signed_in", "1");
          sessionStorage.setItem("session_mode", "tasting");
          sessionStorage.setItem("session_name", guestName.trim());
          sessionStorage.setItem("session_role", "");
          localStorage.setItem("casksense_participant_id", res.id);
        } catch {}
        try {
          const { useAppStore } = await import("@/lib/store");
          useAppStore.getState().setParticipant({ id: res.id, name: guestName.trim() });
        } catch {}
        window.dispatchEvent(new Event("session-change"));
        refreshSession();
        onClose();
      }
    } catch (e: any) {
      setError(e.message || t("m2.guest.failed", "Could not join as guest"));
    } finally {
      setLoading(false);
    }
  };

  const participantEmail = (() => {
    try {
      return localStorage.getItem("casksense_participant_email") || "";
    } catch { return ""; }
  })();

  const renderBackButton = (label: string) => (
    <button
      onClick={() => { setView("main"); setError(""); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: v.accent,
        fontSize: 14,
        fontWeight: 500,
        padding: 0,
        marginBottom: 12,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid="m2-profile-back"
    >
      <ChevronLeft style={{ width: 16, height: 16 }} />
      {label}
    </button>
  );

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: `1px solid ${hasError ? v.danger : v.border}`,
    background: v.elevated,
    color: v.text,
    fontSize: 15,
    fontFamily: "system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  });

  const primaryBtnStyle = (disabled?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: disabled ? v.muted : v.accent,
    color: v.bg,
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "system-ui, sans-serif",
    opacity: loading ? 0.6 : 1,
    transition: "opacity 0.15s, background 0.15s",
  });

  const renderRegisterView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.register.back", "Back to Sign In"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: "0 0 4px" }}>
        {t("m2.register.title", "Create Account")}
      </h3>
      {regSuccess ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: v.success, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: v.text, fontWeight: 600 }}>
            {t("m2.register.success", "Account created successfully!")}
          </div>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={regName}
            onChange={(e) => { setRegName(e.target.value); setError(""); }}
            placeholder={t("m2.register.namePlaceholder", "Display Name")}
            autoComplete="name"
            style={inputStyle(!!error)}
            data-testid="m2-register-name"
          />
          <input
            type="email"
            value={regEmail}
            onChange={(e) => { setRegEmail(e.target.value); setError(""); }}
            placeholder={t("m2.register.emailPlaceholder", "Email")}
            autoComplete="email"
            style={inputStyle(!!error)}
            data-testid="m2-register-email"
          />
          <div style={{ position: "relative" }}>
            <input
              type={regShowPin ? "text" : "password"}
              value={regPin}
              onChange={(e) => { setRegPin(e.target.value); setError(""); }}
              placeholder={t("m2.register.passwordPlaceholder", "Password (min 4 chars)")}
              autoComplete="new-password"
              style={inputStyle(!!error)}
              data-testid="m2-register-password"
            />
            <button
              type="button"
              onClick={() => setRegShowPin(!regShowPin)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 0 }}
              data-testid="m2-register-toggle-password"
            >
              {regShowPin ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
            </button>
          </div>
          <input
            type={regShowPin ? "text" : "password"}
            value={regPinConfirm}
            onChange={(e) => { setRegPinConfirm(e.target.value); setError(""); }}
            placeholder={t("m2.register.confirmPasswordPlaceholder", "Confirm Password")}
            autoComplete="new-password"
            style={inputStyle(!!error)}
            data-testid="m2-register-confirm-password"
          />
          {error && (
            <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-register-error">
              {error}
            </div>
          )}
          <button
            onClick={handleRegister}
            disabled={loading}
            style={primaryBtnStyle(!regName.trim() || !regEmail.trim() || !regPin.trim())}
            data-testid="m2-register-submit"
          >
            {loading ? t("m2.register.creating", "Creating...") : t("m2.register.create", "Create Account")}
          </button>
        </>
      )}
    </div>
  );

  const renderForgotPinView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.forgotPin.back", "Back to Sign In"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: "0 0 4px" }}>
        {t("m2.forgotPin.title", "Reset Password")}
      </h3>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 4px" }}>
        {t("m2.forgotPin.description", "Enter your email and we'll send you a verification code.")}
      </p>
      <input
        type="email"
        value={forgotEmail}
        onChange={(e) => { setForgotEmail(e.target.value); setError(""); }}
        placeholder={t("m2.forgotPin.emailPlaceholder", "Your email")}
        autoComplete="email"
        style={inputStyle(!!error)}
        data-testid="m2-forgot-email"
      />
      {error && (
        <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-forgot-error">
          {error}
        </div>
      )}
      <button
        onClick={handleForgotPin}
        disabled={loading || !forgotEmail.trim()}
        style={primaryBtnStyle(!forgotEmail.trim())}
        data-testid="m2-forgot-submit"
      >
        {loading ? t("m2.forgotPin.sending", "Sending...") : t("m2.forgotPin.send", "Send Reset Code")}
      </button>
    </div>
  );

  const renderResetPinView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.resetPin.back", "Back"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: "0 0 4px" }}>
        {t("m2.resetPin.title", "Enter Reset Code")}
      </h3>
      {resetSuccess ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: v.success, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: v.text, fontWeight: 600 }}>
            {t("m2.resetPin.success", "Password reset successfully! You can now sign in.")}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: v.muted, margin: "0 0 4px" }}>
            {t("m2.resetPin.description", "Check your email for the 6-digit code.")}
          </p>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => { setResetCode(e.target.value); setError(""); }}
            placeholder={t("m2.resetPin.codePlaceholder", "6-digit code")}
            maxLength={6}
            style={inputStyle(!!error)}
            data-testid="m2-reset-code"
          />
          <input
            type="password"
            value={resetNewPin}
            onChange={(e) => { setResetNewPin(e.target.value); setError(""); }}
            placeholder={t("m2.resetPin.newPinPlaceholder", "New password (min 4 chars)")}
            autoComplete="new-password"
            style={inputStyle(!!error)}
            data-testid="m2-reset-new-pin"
          />
          {error && (
            <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-reset-error">
              {error}
            </div>
          )}
          <button
            onClick={handleResetPin}
            disabled={loading || !resetCode.trim() || !resetNewPin.trim()}
            style={primaryBtnStyle(!resetCode.trim() || !resetNewPin.trim())}
            data-testid="m2-reset-submit"
          >
            {loading ? t("m2.resetPin.resetting", "Resetting...") : t("m2.resetPin.reset", "Reset Password")}
          </button>
        </>
      )}
    </div>
  );

  const renderVerifyEmailView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.verify.back", "Back"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: "0 0 4px" }}>
        {t("m2.verify.title", "Verify Email")}
      </h3>
      {verifySuccess ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <CheckCircle2 style={{ width: 48, height: 48, color: v.success, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: v.text, fontWeight: 600 }}>
            {t("m2.verify.success", "Email verified successfully!")}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: v.muted, margin: "0 0 4px" }}>
            {t("m2.verify.description", "Enter the 6-digit code sent to your email.")}
          </p>
          <input
            type="text"
            value={verifyCode}
            onChange={(e) => { setVerifyCode(e.target.value); setError(""); }}
            placeholder={t("m2.verify.codePlaceholder", "6-digit code")}
            maxLength={6}
            style={inputStyle(!!error)}
            data-testid="m2-verify-code"
          />
          {error && (
            <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-verify-error">
              {error}
            </div>
          )}
          <button
            onClick={handleVerifyEmail}
            disabled={loading || !verifyCode.trim()}
            style={primaryBtnStyle(!verifyCode.trim())}
            data-testid="m2-verify-submit"
          >
            {loading ? t("m2.verify.verifying", "Verifying...") : t("m2.verify.verify", "Verify")}
          </button>
          <button
            onClick={handleResendVerification}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${v.border}`,
              background: "transparent",
              color: v.accent,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="m2-verify-resend"
          >
            {t("m2.verify.resend", "Resend Code")}
          </button>
        </>
      )}
    </div>
  );

  const renderGuestView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {renderBackButton(t("m2.guest.back", "Back to Sign In"))}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: v.text, margin: "0 0 4px" }}>
        {t("m2.guest.title", "Joyn as Guest")}
      </h3>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 4px" }}>
        {t("m2.guest.description", "Enter your name and the tasting code to join without an account.")}
      </p>
      <input
        type="text"
        value={guestName}
        onChange={(e) => { setGuestName(e.target.value); setError(""); }}
        placeholder={t("m2.guest.namePlaceholder", "Your Name")}
        style={inputStyle(!!error)}
        data-testid="m2-guest-name"
      />
      <input
        type="text"
        value={guestPin}
        onChange={(e) => { setGuestPin(e.target.value); setError(""); }}
        placeholder={t("m2.guest.codePlaceholder", "Tasting Code")}
        style={inputStyle(!!error)}
        data-testid="m2-guest-code"
      />
      {error && (
        <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-guest-error">
          {error}
        </div>
      )}
      <button
        onClick={handleGuestJoin}
        disabled={loading || !guestName.trim() || !guestPin.trim()}
        style={primaryBtnStyle(!guestName.trim() || !guestPin.trim())}
        data-testid="m2-guest-submit"
      >
        {loading ? t("m2.guest.joining", "Joining...") : t("m2.guest.join", "Joyn Tasting")}
      </button>
    </div>
  );

  const renderSignedInView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ background: v.elevated, borderRadius: 12, padding: "16px", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <User style={{ width: 32, height: 32, color: v.accent }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: v.text }} data-testid="m2-profile-display-name">
              {session.name || "—"}
            </div>
            {participantEmail && (
              <div style={{ fontSize: 12, color: v.muted }}>{participantEmail}</div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const ri = mapRouteToCounterpart(location);
        return (
          <MenuButton
            icon={ri.isLabs
              ? <Layout style={{ width: 18, height: 18, color: v.accent }} />
              : <FlaskConical style={{ width: 18, height: 18, color: v.accent }} />}
            label={ri.isLabs
              ? (i18n.language === "de" ? "Zu M2 wechseln" : "Switch to M2")
              : (i18n.language === "de" ? "Zu Labs wechseln" : "Switch to Labs")}
            onClick={() => { onClose(); navigate(ri.target); }}
            testId="m2-profile-switch-version"
          />
        );
      })()}

      <div style={{ height: 1, background: v.border, margin: "8px 0" }} />

      <MenuButton
        icon={<Settings style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.settings", "Settings")}
        onClick={() => { onClose(); navigate("/m2/taste/settings"); }}
        testId="m2-profile-settings"
      />
      <MenuButton
        icon={currentTheme === "dark-warm"
          ? <Sun style={{ width: 18, height: 18, color: v.accent }} />
          : <Moon style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.theme", "Theme")}
        onClick={toggleTheme}
        suffix={
          <span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>
            {currentTheme === "dark-warm"
              ? t("m2.profile.themeLight", "Light")
              : t("m2.profile.themeDark", "Dark")}
          </span>
        }
        testId="m2-profile-theme"
      />
      <MenuButton
        icon={<Globe style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.language", "Language")}
        onClick={toggleLanguage}
        suffix={<span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>{i18n.language.toUpperCase()}</span>}
        testId="m2-profile-language"
      />
      <MenuButton
        icon={<Mail style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.verifyEmail", "Verify Email")}
        onClick={() => { setView("verify-email"); setError(""); }}
        testId="m2-profile-verify-email"
      />
      <MenuButton
        icon={<Download style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.dataExport", "Data & Export")}
        onClick={() => { onClose(); navigate("/m2/taste/downloads"); }}
        testId="m2-profile-data"
      />
      {session.role === "admin" && (
        <>
          <MenuButton
            icon={<Shield style={{ width: 18, height: 18, color: v.accent }} />}
            label={t("m2.profile.admin", "Admin")}
            onClick={() => { onClose(); navigate("/m2/admin"); }}
            testId="m2-profile-admin"
          />
          <MenuButton
            icon={<ArrowLeftRight style={{ width: 18, height: 18, color: v.accent }} />}
            label={t("m2.profile.switchClassic", "Switch to Classic UI")}
            onClick={() => { onClose(); window.location.href = "/tasting"; }}
            testId="m2-profile-classic"
          />
        </>
      )}

      <div style={{ height: 1, background: v.border, margin: "8px 0" }} />

      <MenuButton
        icon={<Info style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.about", "About CaskSense")}
        onClick={() => { onClose(); navigate("/m2/discover/about"); }}
        testId="m2-profile-about"
      />
      <MenuButton
        icon={<HandHeart style={{ width: 18, height: 18, color: v.accent }} />}
        label={t("m2.profile.support", "Support Us")}
        onClick={() => { onClose(); navigate("/m2/discover/donate"); }}
        testId="m2-profile-support"
      />

      <div style={{ height: 8 }} />

      <button
        onClick={handleSignOut}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          background: "transparent",
          border: `1px solid ${v.border}`,
          borderRadius: 12,
          cursor: "pointer",
          color: v.danger,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid="m2-profile-signout"
      >
        <LogOut style={{ width: 18, height: 18 }} />
        {t("m2.profile.signOut", "Sign Out")}
      </button>
    </div>
  );

  const renderSignedOutView = () => (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder={t("m2.profile.emailPlaceholder", "Email")}
          autoComplete="email"
          style={inputStyle(!!error)}
          data-testid="m2-profile-email"
        />
        <input
          type="password"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(""); }}
          placeholder={t("m2.profile.passwordPlaceholder", "Password")}
          autoComplete="current-password"
          onKeyDown={(e) => { if (e.key === "Enter" && email.trim() && pin.trim() && !loading) handleSignIn(); }}
          style={inputStyle(!!error)}
          data-testid="m2-profile-password"
        />
        {error && (
          <div style={{ fontSize: 13, color: v.danger, padding: "4px 2px" }} data-testid="m2-profile-error">
            {error}
          </div>
        )}
        <button
          onClick={handleSignIn}
          disabled={loading || !email.trim() || !pin.trim()}
          style={primaryBtnStyle(!email.trim() || !pin.trim())}
          data-testid="m2-profile-signin"
        >
          {loading ? t("m2.profile.signingIn", "Signing in...") : t("m2.profile.signIn", "Sign In")}
        </button>

        <button
          onClick={() => { setView("forgot-pin"); setError(""); }}
          style={{
            background: "none",
            border: "none",
            color: v.accent,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            padding: "4px 0",
            textAlign: "right",
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-forgot-pin"
        >
          {t("m2.profile.forgotPassword", "Forgot Password?")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => { setView("register"); setError(""); }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: v.elevated,
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: v.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-register"
        >
          <UserPlus style={{ width: 16, height: 16, color: v.accent }} />
          {t("m2.profile.createAccount", "Register")}
        </button>
        <button
          onClick={() => { setView("guest"); setError(""); }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: v.elevated,
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: v.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-guest-mode"
        >
          <Shield style={{ width: 16, height: 16, color: v.accent }} />
          {t("m2.profile.guestMode", "Guest")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={toggleTheme}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: "transparent",
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: v.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-theme"
        >
          {currentTheme === "dark-warm"
            ? <Sun style={{ width: 16, height: 16, color: v.accent }} />
            : <Moon style={{ width: 16, height: 16, color: v.accent }} />}
          {currentTheme === "dark-warm"
            ? t("m2.profile.themeLight", "Light")
            : t("m2.profile.themeDark", "Dark")}
        </button>
        <button
          onClick={toggleLanguage}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 16px",
            background: "transparent",
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: v.text,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="m2-profile-language"
        >
          <Globe style={{ width: 16, height: 16, color: v.accent }} />
          {i18n.language === "de" ? "English" : "Deutsch"}
        </button>
      </div>

      {(() => {
        const ri = mapRouteToCounterpart(location);
        return (
          <button
            onClick={() => { onClose(); navigate(ri.target); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 16px",
              marginTop: 8,
              background: "transparent",
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              cursor: "pointer",
              color: v.text,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="m2-profile-switch-version-signedout"
          >
            {ri.isLabs
              ? <Layout style={{ width: 16, height: 16, color: v.accent }} />
              : <FlaskConical style={{ width: 16, height: 16, color: v.accent }} />}
            {ri.isLabs
              ? (i18n.language === "de" ? "Zu M2 wechseln" : "Switch to M2")
              : (i18n.language === "de" ? "Zu Labs wechseln" : "Switch to Labs")}
          </button>
        );
      })()}

      <div style={{ height: 24 }} />
    </>
  );

  const renderContent = () => {
    switch (view) {
      case "register": return renderRegisterView();
      case "forgot-pin": return renderForgotPinView();
      case "reset-pin": return renderResetPinView();
      case "verify-email": return renderVerifyEmailView();
      case "guest": return renderGuestView();
      default:
        return session.signedIn ? renderSignedInView() : renderSignedOutView();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="m2-profile-overlay"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: v.card,
          borderRadius: "16px 16px 0 0",
          padding: "20px 16px calc(80px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "85vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        data-testid="m2-profile-menu"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: v.text, margin: 0 }}>
            {view === "main"
              ? t("m2.profile.label", "Profile")
              : view === "register"
              ? t("m2.register.title", "Create Account")
              : view === "forgot-pin"
              ? t("m2.forgotPin.title", "Reset Password")
              : view === "reset-pin"
              ? t("m2.resetPin.title", "Enter Reset Code")
              : view === "verify-email"
              ? t("m2.verify.title", "Verify Email")
              : t("m2.guest.title", "Joyn as Guest")}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 4 }}
            data-testid="m2-profile-close"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, suffix, testId }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  suffix?: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        background: v.elevated,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        cursor: "pointer",
        color: v.text,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid={testId}
    >
      {icon}
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {suffix}
    </button>
  );
}
