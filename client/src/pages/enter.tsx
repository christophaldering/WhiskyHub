import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { participantApi, tastingApi } from "@/lib/api";
import { c, inputStyle } from "@/lib/theme";

export default function EnterPage() {
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();

  const [step, setStep] = useState<"code" | "name">(currentParticipant ? "code" : "name");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await participantApi.loginOrCreate(name.trim(), pin.trim());
      if (result?.id) {
        setParticipant({ id: result.id, name: result.name, role: result.role });
        setStep("code");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid p") || msg.includes("Invalid P")) {
        setError("Wrong password.");
      } else if (msg.includes("email")) {
        setError("No account found. Use the name and PIN from a previous tasting.");
      } else {
        setError(msg || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const tasting = await tastingApi.getByCode(trimmed);
      if (!tasting?.id) {
        setError("Tasting not found. Check the code.");
        return;
      }
      if (currentParticipant) {
        await tastingApi.join(tasting.id, currentParticipant.id, trimmed);
      }
      navigate(`/join/${trimmed}`);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("not found") || msg.includes("Not found") || msg.includes("404")) {
        setError("Tasting not found. Check the code.");
      } else {
        setError(msg || "Could not join. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: c.bg, color: c.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 360, margin: "0 auto", padding: "48px 20px 64px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Link href="/">
          <span
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: c.accent, cursor: "pointer", marginBottom: 40, display: "block" }}
            data-testid="link-back-home"
          >
            CaskSense
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%" }}
        >
          {step === "name" ? (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24 }} data-testid="card-identify">
              <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: c.text }}>
                Who are you?
              </h1>
              <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>
                Enter your name and password.
              </p>
              <form onSubmit={handleIdentify} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  data-testid="input-enter-name"
                  autoFocus
                  autoComplete="off"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ ...inputStyle, letterSpacing: 3 }}
                  data-testid="input-enter-pin"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !pin.trim()}
                  data-testid="button-identify"
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    background: c.accent,
                    color: c.bg,
                    border: "none",
                    borderRadius: 8,
                    cursor: loading ? "wait" : "pointer",
                    opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1,
                  }}
                >
                  {loading ? "…" : "Continue"}
                </button>
                {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-enter-error">{error}</p>}
              </form>
            </div>
          ) : (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24 }} data-testid="card-join">
              {currentParticipant && (
                <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px", textAlign: "center" }}>
                  Hi, {currentParticipant.name}
                </p>
              )}
              <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: c.text }}>
                Enter session code
              </h1>
              <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>
                Ask your host for the code.
              </p>
              <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 4, fontFamily: "monospace" }}
                  data-testid="input-session-code"
                  autoFocus
                  autoComplete="off"
                  maxLength={12}
                />
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  data-testid="button-join"
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    background: c.accent,
                    color: c.bg,
                    border: "none",
                    borderRadius: 8,
                    cursor: loading ? "wait" : "pointer",
                    opacity: !code.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? "…" : "Join"}
                </button>
                {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-join-error">{error}</p>}
              </form>
            </div>
          )}
        </motion.div>

        <Link href="/" style={{ fontSize: 12, color: "#4a4540", textDecoration: "none", marginTop: 40 }} data-testid="link-back">
          ← Back
        </Link>
      </div>
    </div>
  );
}
