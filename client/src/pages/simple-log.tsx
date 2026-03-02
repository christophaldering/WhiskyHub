import { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import SimpleShell from "@/components/simple/simple-shell";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  error: "#c44",
  success: "#6a9a5b",
  high: "#6a9a5b",
  medium: "#d4a256",
  low: "#c44",
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

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: 12,
  fontSize: 15,
  fontWeight: 600,
  background: c.accent,
  color: c.bg,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const btnOutline: React.CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: c.text,
  border: `1px solid ${c.border}`,
  fontWeight: 500,
};

interface Candidate {
  name: string;
  distillery: string;
  confidence: number;
  whiskyId?: string;
}

function confidenceLabel(conf: number): { text: string; color: string } {
  if (conf >= 0.8) return { text: "High", color: c.high };
  if (conf >= 0.6) return { text: "Medium", color: c.medium };
  return { text: "Low", color: c.low };
}

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
      console.log("[SIMPLE_MODE] unlock attempt", name.trim());
      const result = await participantApi.loginOrCreate(name.trim(), pin.trim());
      if (result?.id) {
        console.log("[SIMPLE_MODE] unlock success", result.id);
        onUnlock({ id: result.id, name: result.name, role: result.role });
      }
    } catch (err: any) {
      const msg = err?.message || "";
      console.error("[SIMPLE_MODE] unlock error", msg);
      if (msg.includes("Invalid PIN")) setError("Wrong PIN.");
      else if (msg.includes("email")) setError("No account found.");
      else setError(msg || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle} data-testid="card-log-unlock">
      <p style={{ fontSize: 13, color: c.muted, margin: "0 0 14px" }}>Identify yourself to save your log.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="input-log-name" autoComplete="off" />
        <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-log-pin" autoComplete="off" />
        <button type="submit" disabled={loading || !name.trim() || !pin.trim()} data-testid="button-log-unlock" style={{ ...btnPrimary, opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "…" : "Unlock"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
    </div>
  );
}

function CandidateSheet({
  candidates,
  photoUrl,
  onSelect,
  onRetake,
  onSearchManually,
  onCreateUnknown,
}: {
  candidates: Candidate[];
  photoUrl: string;
  onSelect: (c: Candidate) => void;
  onRetake: () => void;
  onSearchManually: () => void;
  onCreateUnknown: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: c.card,
        borderTop: `1px solid ${c.border}`,
        borderRadius: "16px 16px 0 0",
        padding: "20px 20px 40px",
        zIndex: 100,
        maxHeight: "80vh",
        overflowY: "auto",
      }}
      data-testid="sheet-candidates"
    >
      <div style={{ width: 40, height: 4, background: c.border, borderRadius: 2, margin: "0 auto 16px" }} />

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Scanned"
            style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: `1px solid ${c.border}` }}
            data-testid="img-scan-preview"
          />
        )}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: 0 }}>
            {candidates.length > 0 ? "We found" : "Not sure"}
          </h3>
          <p style={{ fontSize: 12, color: c.muted, margin: "2px 0 0" }}>
            {candidates.length > 0
              ? `${candidates.length} possible match${candidates.length > 1 ? "es" : ""}`
              : "We couldn't confidently identify this whisky."}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {candidates.map((cand, i) => {
          const badge = confidenceLabel(cand.confidence);
          return (
            <button
              key={i}
              onClick={() => onSelect(cand)}
              data-testid={`button-candidate-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "12px 14px",
                background: i === 0 ? `${c.accent}15` : "transparent",
                border: `1px solid ${i === 0 ? c.accent : c.border}`,
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{cand.name}</div>
                <div style={{ fontSize: 12, color: c.muted }}>{cand.distillery}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: `${badge.color}20`, padding: "3px 8px", borderRadius: 6 }}>
                {badge.text}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onRetake} data-testid="button-retake" style={btnOutline}>Retake</button>
        <button onClick={onSearchManually} data-testid="button-search-manually" style={btnOutline}>Search manually</button>
        <button onClick={onCreateUnknown} data-testid="button-create-unknown" style={{ ...btnOutline, color: c.muted, borderColor: c.muted }}>Create as Unknown</button>
      </div>
    </motion.div>
  );
}

export default function SimpleLogPage() {
  const { currentParticipant, setParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [whiskyName, setWhiskyName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [showUnknown, setShowUnknown] = useState(false);
  const [unknownAge, setUnknownAge] = useState("");
  const [unknownAbv, setUnknownAbv] = useState("");
  const [unknownCask, setUnknownCask] = useState("");
  const [unknownWbId, setUnknownWbId] = useState("");
  const [unknownPrice, setUnknownPrice] = useState("");

  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const handleScan = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError("");
    console.log("[SIMPLE_MODE] scan started, file:", file.name, file.size);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/whisky/identify", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Identification failed");
      }

      const data = await res.json();
      console.log("[SIMPLE_MODE] identify result:", data);
      setCandidates(data.candidates || []);
      setPhotoUrl(data.photoUrl || "");
      setShowSheet(true);
    } catch (err: any) {
      console.error("[SIMPLE_MODE] scan error:", err);
      setError(err?.message || "Scan failed. Try again.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectCandidate = (cand: Candidate) => {
    console.log("[SIMPLE_MODE] candidate selected:", cand.name);
    setWhiskyName(cand.name);
    setDistillery(cand.distillery);
    setSelectedCandidate(cand);
    setShowSheet(false);
    setShowUnknown(false);
  };

  const handleCreateUnknown = () => {
    console.log("[SIMPLE_MODE] create as unknown");
    setShowSheet(false);
    setShowUnknown(true);
    setWhiskyName("");
    setDistillery("");
    setSelectedCandidate(null);
  };

  const handleRetake = () => {
    setShowSheet(false);
    setCandidates([]);
    setPhotoUrl("");
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleSearchManually = () => {
    setShowSheet(false);
    setCandidates([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whiskyName.trim()) return;

    if (!pid) {
      const entry = {
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim(),
        score,
        notes: notes.trim(),
        photoUrl,
        isUnknown: showUnknown,
        unknownMeta: showUnknown ? { age: unknownAge, abv: unknownAbv, cask: unknownCask, whiskybaseId: unknownWbId, price: unknownPrice } : undefined,
        date: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("simple_unknown_logs") || "[]");
      existing.push(entry);
      localStorage.setItem("simple_unknown_logs", JSON.stringify(existing));
      console.log("[SIMPLE_MODE] log saved locally (no participant)");
      setSaved(true);
      return;
    }

    setSaving(true);
    setError("");
    try {
      console.log("[SIMPLE_MODE] saving log for", pid, showUnknown ? "(unknown)" : "(known)");

      const body: Record<string, any> = {
        title: whiskyName.trim(),
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim() || undefined,
        personalScore: score,
        noseNotes: notes.trim() || undefined,
        source: "casksense",
        imageUrl: photoUrl || undefined,
      };

      if (showUnknown) {
        if (unknownAge.trim()) body.age = unknownAge.trim();
        if (unknownAbv.trim()) body.abv = unknownAbv.trim();
        if (unknownCask.trim()) body.caskType = unknownCask.trim();
        if (unknownWbId.trim()) body.whiskybaseId = unknownWbId.trim();
        if (unknownPrice.trim()) {
          body.body = `[UNKNOWN_WHISKY]\nPrice: ${unknownPrice.trim()}\n[/UNKNOWN_WHISKY]`;
        }
      }

      const res = await fetch(`/api/journal/${pid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }

      console.log("[SIMPLE_MODE] log saved to server");
      setSaved(true);
    } catch (err: any) {
      console.error("[SIMPLE_MODE] save error:", err);
      const entry = {
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim(),
        score,
        notes: notes.trim(),
        photoUrl,
        isUnknown: showUnknown,
        unknownMeta: showUnknown ? { age: unknownAge, abv: unknownAbv, cask: unknownCask, whiskybaseId: unknownWbId, price: unknownPrice } : undefined,
        date: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("simple_unknown_logs") || "[]");
      existing.push(entry);
      localStorage.setItem("simple_unknown_logs", JSON.stringify(existing));
      console.log("[SIMPLE_MODE] fallback: saved to localStorage");
      setSaved(true);
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
    setShowUnknown(false);
    setUnknownAge("");
    setUnknownAbv("");
    setUnknownCask("");
    setUnknownWbId("");
    setUnknownPrice("");
    setPhotoUrl("");
    setCandidates([]);
    setSelectedCandidate(null);
  };

  const handleCopyJson = () => {
    const logs = localStorage.getItem("simple_unknown_logs") || "[]";
    navigator.clipboard.writeText(logs);
  };

  return (
    <SimpleShell>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-testid="input-camera"
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {!pid && !saved && <UnlockBlock onUnlock={(p) => setParticipant(p)} />}

        {saved ? (
          <div style={{ ...cardStyle, textAlign: "center" }} data-testid="card-log-success">
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Saved</h2>
            <p style={{ fontSize: 13, color: c.muted, margin: "0 0 20px" }}>{whiskyName} logged.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleReset} data-testid="button-log-another" style={{ ...btnPrimary, flex: 1 }}>Log another</button>
              <Link href="/my-taste" style={{ flex: 1, textDecoration: "none" }}>
                <div style={{ ...btnOutline, textAlign: "center" }} data-testid="button-goto-taste">My Taste</div>
              </Link>
            </div>
            <button onClick={handleCopyJson} data-testid="button-copy-json" style={{ ...btnOutline, marginTop: 10, fontSize: 12, color: c.muted, borderColor: c.muted }}>
              Copy local logs (JSON)
            </button>
          </div>
        ) : (pid || !pid) && !saved ? (
          <div style={cardStyle} data-testid="card-log-form">
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px", color: c.text }}>Log a Whisky</h1>

            {photoUrl && (
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <img src={photoUrl} alt="Scanned label" style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", border: `1px solid ${c.border}` }} data-testid="img-photo-preview" />
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Whisky name *</label>
                <input type="text" value={whiskyName} onChange={(e) => setWhiskyName(e.target.value)} style={inputStyle} data-testid="input-whisky-name" autoComplete="off" />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={scanning}
                  data-testid="button-scan-label"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    background: scanning ? c.border : c.accent,
                    color: scanning ? c.muted : c.bg,
                    border: "none",
                    borderRadius: 8,
                    cursor: scanning ? "wait" : "pointer",
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {scanning ? (
                    <>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${c.muted}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Identifying…
                    </>
                  ) : (
                    <>📷 Scan label</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUnknown(!showUnknown); setSelectedCandidate(null); }}
                  data-testid="button-toggle-unknown"
                  style={{ ...btnOutline, flex: 0, whiteSpace: "nowrap", padding: "10px 14px", fontSize: 13 }}
                >
                  {showUnknown ? "Hide" : "Unknown?"}
                </button>
              </div>

              {showUnknown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0", borderTop: `1px solid ${c.border}` }}
                  data-testid="section-unknown"
                >
                  <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>Fill in what you know — everything except name is optional.</p>
                  <div>
                    <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Distillery</label>
                    <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} style={inputStyle} data-testid="input-unknown-distillery" autoComplete="off" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Age</label>
                      <input type="text" value={unknownAge} onChange={(e) => setUnknownAge(e.target.value)} style={inputStyle} data-testid="input-unknown-age" placeholder="e.g. 12" autoComplete="off" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>ABV</label>
                      <input type="text" value={unknownAbv} onChange={(e) => setUnknownAbv(e.target.value)} style={inputStyle} data-testid="input-unknown-abv" placeholder="e.g. 46%" autoComplete="off" />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Cask type</label>
                    <input type="text" value={unknownCask} onChange={(e) => setUnknownCask(e.target.value)} style={inputStyle} data-testid="input-unknown-cask" placeholder="e.g. Sherry" autoComplete="off" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Whiskybase ID</label>
                      <input type="text" value={unknownWbId} onChange={(e) => setUnknownWbId(e.target.value)} style={inputStyle} data-testid="input-unknown-wbid" autoComplete="off" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Price</label>
                      <input type="text" value={unknownPrice} onChange={(e) => setUnknownPrice(e.target.value)} style={inputStyle} data-testid="input-unknown-price" placeholder="e.g. €65" autoComplete="off" />
                    </div>
                  </div>
                </motion.div>
              )}

              {!showUnknown && (
                <div>
                  <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Distillery</label>
                  <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} style={inputStyle} data-testid="input-distillery" autoComplete="off" />
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>
                  Score: <span style={{ color: c.accent, fontWeight: 600 }}>{score}</span>
                </label>
                <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} data-testid="input-score" style={{ width: "100%", accentColor: c.accent }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: c.muted }}><span>0</span><span>100</span></div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-notes" placeholder="What do you taste?" />
              </div>

              <button type="submit" disabled={saving || !whiskyName.trim() || (!pid)} data-testid="button-save-log" style={{ ...btnPrimary, opacity: (!whiskyName.trim() || !pid) ? 0.5 : 1, cursor: saving ? "wait" : "pointer", marginTop: 4 }}>
                {saving ? "Saving…" : "Save"}
              </button>
              {!pid && whiskyName.trim() && (
                <p style={{ fontSize: 11, color: c.muted, margin: 0, textAlign: "center" }}>Unlock above to save.</p>
              )}
              {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
            </form>
          </div>
        ) : null}
      </motion.div>

      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "#000", zIndex: 99 }}
              onClick={() => setShowSheet(false)}
            />
            <CandidateSheet
              candidates={candidates}
              photoUrl={photoUrl}
              onSelect={handleSelectCandidate}
              onRetake={handleRetake}
              onSearchManually={handleSearchManually}
              onCreateUnknown={handleCreateUnknown}
            />
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </SimpleShell>
  );
}
