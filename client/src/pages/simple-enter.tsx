import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { participantApi, tastingApi } from "@/lib/api";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession, tryAutoResume } from "@/lib/session";
import { c, inputStyle, cardStyle, radius, shadow } from "@/lib/theme";
import { ApplePage, AppleCard, AppleButton, AppleInput } from "@/components/apple";
import { UI_SKIN } from "@/lib/config";
import BackButton from "@/components/back-button";

const RL_KEY = "simple_join_attempts";
const RL_MAX = 5;
const RL_WINDOW = 5 * 60 * 1000;

function isRateLimited(): boolean {
  try {
    const raw = sessionStorage.getItem(RL_KEY);
    if (!raw) return false;
    const attempts: number[] = JSON.parse(raw);
    const now = Date.now();
    const recent = attempts.filter((t) => now - t < RL_WINDOW);
    return recent.length >= RL_MAX;
  } catch { return false; }
}

function recordAttempt() {
  try {
    const raw = sessionStorage.getItem(RL_KEY);
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    attempts.push(now);
    const recent = attempts.filter((t) => now - t < RL_WINDOW);
    sessionStorage.setItem(RL_KEY, JSON.stringify(recent));
  } catch {}
}

const appleInputStyle: React.CSSProperties = {
  ...inputStyle,
  borderRadius: radius.md,
};

const appleButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 20px",
  fontSize: 15,
  fontWeight: 650,
  background: c.accent,
  color: c.bg,
  border: "none",
  borderRadius: radius.md,
  fontFamily: "system-ui, -apple-system, sans-serif",
  letterSpacing: "-0.01em",
  transition: "all 0.15s ease",
};

const appleCardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}20`,
  borderRadius: radius.lg,
  padding: 24,
  boxShadow: shadow.card,
};

export default function SimpleEnterPage() {
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();
  const { t } = useTranslation();

  const sessionSignedIn = getSession().signedIn;
  const [step, setStep] = useState<"name" | "code">(currentParticipant || sessionSignedIn ? "code" : "name");
  const prefillCode = new URLSearchParams(window.location.search).get("code") || "";
  const [code, setCode] = useState(prefillCode.toUpperCase());
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    tryAutoResume().then(() => {
      const s = getSession();
      if (s.signedIn) setStep("code");
    });
  }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      console.log("[SIMPLE_MODE] identify attempt", name.trim());
      const result = await participantApi.loginOrCreate(name.trim(), pin.trim());
      if (result?.id) {
        console.log("[SIMPLE_MODE] identify success", result.id);
        setParticipant({ id: result.id, name: result.name, role: result.role });
        setStep("code");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      console.error("[SIMPLE_MODE] identify error", msg);
      if (msg.includes("Invalid p") || msg.includes("Invalid P")) setError(t("simpleEnter.errorWrongPassword"));
      else if (msg.includes("email")) setError(t("simpleEnter.errorNoAccount"));
      else setError(msg || t("simpleEnter.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    if (isRateLimited()) {
      setError(t("simpleEnter.rateLimited"));
      console.warn("[SIMPLE_MODE] join rate limited");
      return;
    }

    setLoading(true);
    setError("");
    recordAttempt();

    try {
      console.log("[SIMPLE_MODE] join attempt code:", trimmed);
      const tasting = await tastingApi.getByCode(trimmed);
      if (!tasting?.id) {
        setError(t("simpleEnter.codeNotFound"));
        console.warn("[SIMPLE_MODE] join code not found");
        return;
      }
      if (currentParticipant) {
        try {
          await tastingApi.join(tasting.id, currentParticipant.id, trimmed);
        } catch {}
      }
      console.log("[SIMPLE_MODE] join success, navigating to tasting room");
      navigate(`/tasting-room-simple/${tasting.id}`);
    } catch (err: any) {
      const msg = err?.message || "";
      console.error("[SIMPLE_MODE] join error", msg);
      if (msg.includes("not found") || msg.includes("Not found")) {
        setError(t("simpleEnter.codeNotFound"));
      } else {
        setError(msg || t("simpleEnter.joinFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleShell>
      <BackButton fallback="/tasting" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {step === "name" ? (
          <div style={appleCardStyle} data-testid="card-identify">
            <ApplePage title={t("simpleEnter.joinTitle")} subtitle={t("simpleEnter.joinDesc")}>
              <form style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" tabIndex={-1}>
                <input type="text" name="cs_trap_user" autoComplete="username" tabIndex={-1} />
                <input type="password" name="cs_trap_pw" autoComplete="current-password" tabIndex={-1} />
              </form>
              <form onSubmit={handleIdentify} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="text" placeholder={t("simpleEnter.namePlaceholder")} name="cs_display_name" value={name} onChange={(e) => setName(e.target.value)} style={appleInputStyle} data-testid="input-enter-name" autoFocus autoComplete="name" autoCapitalize="words" spellCheck={false} />
                <input type="password" placeholder={t("simpleEnter.pinPlaceholder")} name="cs_password" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...appleInputStyle, letterSpacing: 3 }} data-testid="input-enter-pin" autoComplete="new-password" autoCapitalize="none" spellCheck={false} />
                <button type="submit" disabled={loading || !name.trim() || !pin.trim()} data-testid="button-identify" style={{ ...appleButtonStyle, cursor: loading ? "wait" : "pointer", opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1 }}>
                  {loading ? "…" : t("simpleEnter.continue")}
                </button>
                {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-enter-error">{error}</p>}
              </form>
            </ApplePage>
          </div>
        ) : (
          <div style={appleCardStyle} data-testid="card-join">
            {currentParticipant && sessionSignedIn && (
              <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px", textAlign: "center" }}>
                {t("simpleEnter.greeting", { name: currentParticipant.name })}
              </p>
            )}
            <ApplePage title={t("simpleEnter.codeTitle")} subtitle={t("simpleEnter.codeDesc")}>
              <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="text" placeholder={t("simpleEnter.codePlaceholder")} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ ...appleInputStyle, textAlign: "center", fontSize: 20, letterSpacing: 4, fontFamily: "monospace" }} data-testid="input-session-code" autoFocus autoComplete="off" maxLength={12} />
                <button type="submit" disabled={loading || !code.trim()} data-testid="button-join" style={{ ...appleButtonStyle, cursor: loading ? "wait" : "pointer", opacity: !code.trim() ? 0.5 : 1 }}>
                  {loading ? "…" : t("simpleEnter.join")}
                </button>
                {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-join-error">{error}</p>}
              </form>
            </ApplePage>
          </div>
        )}
      </motion.div>
    </SimpleShell>
  );
}
