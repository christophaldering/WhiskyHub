import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { participantApi, tastingApi } from "@/lib/api";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession, tryAutoResume } from "@/lib/session";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  error: "#c44",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: c.bg,
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  color: c.text,
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: 24,
};

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

export default function SimpleEnterPage() {
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();

  const sessionSignedIn = getSession().signedIn;
  const [step, setStep] = useState<"name" | "code">(currentParticipant || sessionSignedIn ? "code" : "name");
  const [code, setCode] = useState("");
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
      if (msg.includes("Invalid PIN")) setError("Wrong PIN.");
      else if (msg.includes("email")) setError("No account found. Use the name and PIN from a previous tasting.");
      else setError(msg || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    if (isRateLimited()) {
      setError("Too many attempts. Please wait a few minutes.");
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
        setError("Code not found or expired.");
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
        setError("Code not found or expired.");
      } else {
        setError(msg || "Could not join. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {step === "name" ? (
          <div style={cardStyle} data-testid="card-identify">
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: c.text }}>Who are you?</h1>
            <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>Enter your name and PIN from a previous tasting.</p>
            <form onSubmit={handleIdentify} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="input-enter-name" autoFocus autoComplete="off" />
              <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-enter-pin" autoComplete="off" />
              <button type="submit" disabled={loading || !name.trim() || !pin.trim()} data-testid="button-identify" style={{ width: "100%", padding: 12, fontSize: 15, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: loading ? "wait" : "pointer", opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1 }}>
                {loading ? "…" : "Continue"}
              </button>
              {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-enter-error">{error}</p>}
            </form>
          </div>
        ) : (
          <div style={cardStyle} data-testid="card-join">
            {currentParticipant && (
              <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px", textAlign: "center" }}>
                Hi, {currentParticipant.name}
              </p>
            )}
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: c.text }}>Enter session code</h1>
            <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>Ask your host for the code.</p>
            <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="e.g. ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 4, fontFamily: "monospace" }} data-testid="input-session-code" autoFocus autoComplete="off" maxLength={12} />
              <button type="submit" disabled={loading || !code.trim()} data-testid="button-join" style={{ width: "100%", padding: 12, fontSize: 15, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: loading ? "wait" : "pointer", opacity: !code.trim() ? 0.5 : 1 }}>
                {loading ? "…" : "Join"}
              </button>
              {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-join-error">{error}</p>}
            </form>
          </div>
        )}
      </motion.div>
    </SimpleShell>
  );
}
