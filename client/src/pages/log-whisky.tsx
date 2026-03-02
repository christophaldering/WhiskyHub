import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  error: "#c44",
  success: "#6a9a5b",
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

function UnlockBlock({ onUnlock }: { onUnlock: (p: { id: string; name: string; role?: string }) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await participantApi.loginOrCreate(name.trim(), pin.trim());
      if (result?.id) onUnlock({ id: result.id, name: result.name, role: result.role });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid PIN")) setError("Wrong PIN.");
      else if (msg.includes("email")) setError("No account found. Use name and PIN from a tasting.");
      else setError(msg || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24 }} data-testid="card-log-unlock">
      <p style={{ fontSize: 13, color: c.muted, margin: "0 0 14px" }}>
        Identify yourself to save your log.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="input-log-name" autoComplete="off" />
        <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-log-pin" autoComplete="off" />
        <button
          type="submit"
          disabled={loading || !name.trim() || !pin.trim()}
          data-testid="button-log-unlock"
          style={{ width: "100%", padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: loading ? "wait" : "pointer", opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1 }}
        >
          {loading ? "…" : "Unlock"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
    </div>
  );
}

export default function LogWhiskyPage() {
  const { currentParticipant, setParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const [whiskyName, setWhiskyName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || !whiskyName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/journal/${pid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: whiskyName.trim(),
          whiskyName: whiskyName.trim(),
          distillery: distillery.trim() || undefined,
          personalScore: score,
          noseNotes: notes.trim() || undefined,
          source: "casksense",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWhiskyName("");
    setDistillery("");
    setScore(50);
    setNotes("");
    setSaved(false);
    setError("");
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
          {!pid && <UnlockBlock onUnlock={(p) => setParticipant(p)} />}

          {pid && saved ? (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, textAlign: "center" }} data-testid="card-log-success">
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Saved</h2>
              <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>{whiskyName} logged.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleReset}
                  data-testid="button-log-another"
                  style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: "pointer" }}
                >
                  Log another
                </button>
                <Link href="/" style={{ flex: 1, textDecoration: "none" }}>
                  <div
                    style={{ padding: 10, fontSize: 14, fontWeight: 500, background: "transparent", color: c.text, border: `1px solid ${c.border}`, borderRadius: 8, textAlign: "center", cursor: "pointer" }}
                    data-testid="button-done"
                  >
                    Done
                  </div>
                </Link>
              </div>
            </div>
          ) : pid ? (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24 }} data-testid="card-log-form">
              <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px", color: c.text }}>
                Log a Whisky
              </h1>
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Whisky name *</label>
                  <input
                    type="text"
                    value={whiskyName}
                    onChange={(e) => setWhiskyName(e.target.value)}
                    style={inputStyle}
                    data-testid="input-whisky-name"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Distillery</label>
                  <input
                    type="text"
                    value={distillery}
                    onChange={(e) => setDistillery(e.target.value)}
                    style={inputStyle}
                    data-testid="input-distillery"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>
                    Score: <span style={{ color: c.accent, fontWeight: 600 }}>{score}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    data-testid="input-score"
                    style={{ width: "100%", accentColor: c.accent }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: c.muted }}>
                    <span>0</span><span>100</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                    data-testid="input-notes"
                    placeholder="What do you taste?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !whiskyName.trim()}
                  data-testid="button-save-log"
                  style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    background: c.accent,
                    color: c.bg,
                    border: "none",
                    borderRadius: 8,
                    cursor: saving ? "wait" : "pointer",
                    opacity: !whiskyName.trim() ? 0.5 : 1,
                    marginTop: 4,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
              </form>
            </div>
          ) : null}
        </motion.div>

        <Link href="/" style={{ fontSize: 12, color: "#4a4540", textDecoration: "none", marginTop: 40 }} data-testid="link-back">
          ← Back
        </Link>
      </div>
    </div>
  );
}
