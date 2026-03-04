import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, ChevronDown, Camera } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { getSession, signIn, setSessionPid } from "@/lib/session";
import SimpleShell from "@/components/simple/simple-shell";
import { c, inputStyle, cardStyle, sliderCSS, sectionSpacing } from "@/lib/theme";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

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

const ATTRIBUTES = {
  nose: ["Fruity", "Floral", "Spicy", "Smoky", "Woody", "Sweet", "Malty", "Sherry", "Citrus", "Peaty"],
  taste: ["Sweet", "Dry", "Oily", "Spicy", "Fruity", "Nutty", "Chocolate", "Vanilla", "Salty", "Peaty"],
  finish: ["Short", "Medium", "Long", "Warm", "Dry", "Spicy", "Smoky", "Sweet", "Bitter"],
  balance: ["Harmonious", "Complex", "Rough", "Elegant", "Powerful", "Thin"],
} as const;

type DimKey = "nose" | "taste" | "finish" | "balance";

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 20,
  border: `1px solid ${selected ? c.accent : c.border}`,
  background: selected ? `${c.accent}18` : "transparent",
  color: selected ? c.accent : c.mutedLight,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  transition: "all 0.15s",
  whiteSpace: "nowrap" as const,
});

function DetailModule({
  dim,
  label,
  score,
  onScoreChange,
  chips,
  onToggleChip,
  text,
  onTextChange,
  expanded,
  onToggleExpand,
  voiceListening,
  onToggleVoice,
  hasSpeechAPI,
}: {
  dim: DimKey;
  label: string;
  score: number;
  onScoreChange: (val: number) => void;
  chips: string[];
  onToggleChip: (dim: DimKey, chip: string) => void;
  text: string;
  onTextChange: (dim: DimKey, val: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  voiceListening: boolean;
  onToggleVoice: (dim: DimKey) => void;
  hasSpeechAPI: boolean;
}) {
  const attrs = ATTRIBUTES[dim];
  return (
    <div style={{ borderBottom: `1px solid ${c.border}` }}>
      <button
        type="button"
        onClick={onToggleExpand}
        data-testid={`button-expand-${dim}`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{label}</span>
          {chips.length > 0 && (
            <span style={{ fontSize: 10, color: c.accent, background: `${c.accent}15`, padding: "2px 8px", borderRadius: 10 }}>
              {chips.length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: c.accent, fontVariantNumeric: "tabular-nums", width: 24, textAlign: "right" }}>{score}</span>
          <ChevronDown style={{ width: 16, height: 16, color: c.mutedLight, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingBottom: 16 }}>
              <input
                type="range"
                min={0}
                max={100}
                value={score}
                onChange={(e) => onScoreChange(Number(e.target.value))}
                data-testid={`input-score-${dim}`}
                className="warm-slider"
                style={{ width: "100%", accentColor: c.accent, display: "block", marginBottom: 14 }}
              />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }} data-testid={`chips-${dim}`}>
                {attrs.map((attr) => (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => onToggleChip(dim, attr)}
                    data-testid={`chip-${dim}-${attr.toLowerCase()}`}
                    style={chipStyle(chips.includes(attr))}
                  >
                    {attr}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <textarea
                  value={text}
                  onChange={(e) => onTextChange(dim, e.target.value)}
                  placeholder={`Describe the ${label.toLowerCase()}...`}
                  rows={2}
                  data-testid={`input-text-${dim}`}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 56,
                    paddingRight: hasSpeechAPI ? 40 : 14,
                    borderColor: voiceListening ? "#c44" : c.border,
                    boxShadow: voiceListening ? "0 0 0 2px #c4444420" : "none",
                  }}
                />
                {hasSpeechAPI && (
                  <button
                    type="button"
                    onClick={() => onToggleVoice(dim)}
                    data-testid={`button-voice-${dim}`}
                    aria-label={voiceListening ? `Stop voice for ${label}` : `Voice input for ${label}`}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                      background: voiceListening ? "#c4444420" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: 4,
                      color: voiceListening ? "#c44" : c.mutedLight,
                      display: "flex",
                      alignItems: "center",
                      animation: voiceListening ? "pulse-mic 1.5s ease-in-out infinite" : "none",
                    }}
                  >
                    {voiceListening ? <MicOff style={{ width: 14, height: 14 }} /> : <Mic style={{ width: 14, height: 14 }} />}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Candidate {
  name: string;
  distillery: string;
  confidence: number;
  whiskyId?: string;
  source?: "local" | "external";
}

interface IdentifyResult {
  candidates: Candidate[];
  photoUrl?: string;
  debug?: {
    detectedMode?: "label" | "menu" | "text";
    ocrText?: string;
    queryText?: string;
    tookMs?: number;
    indexSize?: number;
  };
}

function confidenceLabel(conf: number): { text: string; color: string } {
  if (conf >= 0.78) return { text: "High", color: c.high };
  if (conf >= 0.55) return { text: "Medium", color: c.medium };
  return { text: "Low", color: c.low };
}

function SignInCard({ onSignedIn, onCancel }: { onSignedIn: (name: string, pid?: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn({
        pin: pin.trim(),
        name: name.trim() || undefined,
        mode: "log",
        remember,
      });
      if (!result.ok) {
        const msg = result.error || "";
        if (msg.includes("Invalid PIN")) setError("Wrong PIN.");
        else if (msg.includes("Too many")) setError("Too many attempts. Wait a moment.");
        else setError(msg || "Something went wrong.");
        return;
      }
      const displayName = result.name || name.trim() || "Guest";

      if (name.trim() && pin.trim()) {
        try {
          const pResult = await participantApi.loginOrCreate(name.trim(), pin.trim());
          if (pResult?.id) {
            setSessionPid(pResult.id);
            onSignedIn(displayName, pResult.id);
            return;
          }
        } catch {}
      }
      onSignedIn(displayName);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: "20px 20px 24px",
        marginTop: 12,
      }}
      data-testid="card-unlock"
    >
      <h3 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: "0 0 12px" }}>Sign in to save</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
        <input type="text" name="cs_trap_user" autoComplete="username" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
        <input type="password" name="cs_trap_pw" autoComplete="current-password" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
        <input type="text" placeholder="Name (optional)" name="cs_display_name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }} data-testid="input-unlock-name" autoComplete="off" autoCapitalize="none" spellCheck={false} data-form-type="other" />
        <input type="password" placeholder="PIN" name="cs_password" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px", letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="new-password" autoCapitalize="none" spellCheck={false} data-form-type="other" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.mutedLight, cursor: "pointer", padding: "2px 0" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: c.accent, width: 14, height: 14 }} data-testid="checkbox-remember-save" />
          Stay signed in on this device
        </label>
        <button type="submit" disabled={loading || !pin.trim()} data-testid="button-unlock-submit" style={{ ...btnPrimary, fontSize: 14, padding: 12, opacity: !pin.trim() ? 0.5 : 1, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
      <button
        type="button"
        onClick={onCancel}
        style={{ background: "none", border: "none", cursor: "pointer", color: c.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", width: "100%", textAlign: "center", marginTop: 10 }}
        data-testid="button-unlock-cancel"
      >
        Cancel
      </button>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: c.mutedLight, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function IdentifyPicker({
  onTakePhoto,
  onUploadPhotos,
  onDescribe,
  onClose,
}: {
  onTakePhoto: () => void;
  onUploadPhotos: () => void;
  onDescribe: () => void;
  onClose: () => void;
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
      }}
      data-testid="sheet-identify-picker"
    >
      <div style={{ width: 40, height: 4, background: c.border, borderRadius: 2, margin: "0 auto 16px" }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Identify a whisky</h3>
      <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px" }}>Snap the label, a menu, or a shelf — we'll match it to our library.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onTakePhoto} data-testid="button-take-photo" style={{ ...btnPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📷</span> Take a photo
        </button>
        <button onClick={onUploadPhotos} data-testid="button-upload-photos" style={{ ...btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🖼️</span> Upload from gallery
        </button>
        <button onClick={onDescribe} data-testid="button-describe" style={{ ...btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✏️</span> Type what you see
        </button>
      </div>

      <button onClick={onClose} data-testid="button-close-picker" style={{ ...btnOutline, marginTop: 12, color: c.muted, borderColor: c.muted, fontSize: 13 }}>
        Cancel
      </button>
    </motion.div>
  );
}

function DescribeSheet({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (query: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");

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
      }}
      data-testid="sheet-describe"
    >
      <div style={{ width: 40, height: 4, background: c.border, borderRadius: 2, margin: "0 auto 16px" }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Describe the bottle</h3>
      <p style={{ fontSize: 12, color: c.muted, margin: "0 0 12px" }}>Type the name, distillery, or anything you see on the label.</p>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type whisky name / distillery / age / cask ..."
        rows={3}
        style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
        data-testid="input-describe-query"
        autoFocus
      />

      <button
        onClick={() => query.trim() && onSubmit(query.trim())}
        disabled={loading || !query.trim()}
        data-testid="button-find-matches"
        style={{ ...btnPrimary, opacity: !query.trim() ? 0.5 : 1, cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        {loading ? (
          <>
            <span style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${c.muted}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Searching...
          </>
        ) : "Find matches"}
      </button>

      <button onClick={onClose} data-testid="button-close-describe" style={{ ...btnOutline, marginTop: 8, color: c.muted, borderColor: c.muted, fontSize: 13 }}>
        Cancel
      </button>
    </motion.div>
  );
}

function CandidateRow({ cand, index, onSelect }: { cand: Candidate; index: number; onSelect: (c: Candidate) => void }) {
  const badge = confidenceLabel(cand.confidence);
  const isOnline = cand.source === "external";
  return (
    <button
      onClick={() => onSelect(cand)}
      data-testid={`button-candidate-${index}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        padding: "12px 14px",
        background: index === 0 ? `${c.accent}15` : "transparent",
        border: `1px solid ${index === 0 ? c.accent : c.border}`,
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{cand.name}</div>
        <div style={{ fontSize: 12, color: c.muted }}>{cand.distillery}</div>
        {isOnline && cand.externalUrl && (
          <a
            href={cand.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 10, color: c.accent, textDecoration: "underline" }}
            data-testid={`link-external-${index}`}
          >
            Open source
          </a>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: isOnline ? "#6ba3d6" : badge.color, background: isOnline ? "#6ba3d620" : `${badge.color}20`, padding: "3px 8px", borderRadius: 6 }}>
          {isOnline ? "Online" : badge.text}
        </span>
        <span style={{ fontSize: 9, color: c.muted }}>{cand.source === "local" ? "Library" : "External"}</span>
      </div>
    </button>
  );
}

function CandidateSheet({
  candidates,
  photoUrl,
  isMenuMode,
  showOnlineSearch,
  onSelect,
  onRetake,
  onSearchManually,
  onCreateUnknown,
  onSearchOnline,
}: {
  candidates: Candidate[];
  photoUrl: string;
  isMenuMode: boolean;
  showOnlineSearch: boolean;
  onSelect: (c: Candidate) => void;
  onRetake: () => void;
  onSearchManually: () => void;
  onCreateUnknown: () => void;
  onSearchOnline: () => void;
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
          {isMenuMode && candidates.length > 0 && (
            <p style={{ fontSize: 11, color: c.accent, margin: "4px 0 0", fontStyle: "italic" }} data-testid="text-menu-hint">
              Multiple items detected — pick one to log.
            </p>
          )}
        </div>
      </div>

      {candidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {candidates.map((cand, i) => (
            <CandidateRow key={i} cand={cand} index={i} onSelect={onSelect} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.length === 0 && (
          <button onClick={onCreateUnknown} data-testid="button-add-manually-sheet" style={btnPrimary}>Add manually</button>
        )}
        {candidates.length === 0 && (
          <button onClick={onSearchManually} data-testid="button-search-manually" style={btnOutline}>Search manually</button>
        )}
        {showOnlineSearch && (
          <button onClick={onSearchOnline} data-testid="button-search-online" style={{ ...btnOutline, color: "#6ba3d6", borderColor: "#6ba3d640" }}>
            Search online (Beta)
            <span style={{ display: "block", fontSize: 10, color: c.muted, fontWeight: 400, marginTop: 2 }}>may send text externally</span>
          </button>
        )}
        <button onClick={onRetake} data-testid="button-retake" style={btnOutline}>Try again</button>
        {candidates.length > 0 && (
          <button onClick={onSearchManually} data-testid="button-search-manually" style={btnOutline}>Search manually</button>
        )}
        {candidates.length > 0 && (
          <button onClick={onCreateUnknown} data-testid="button-add-manually-alt" style={{ ...btnOutline, color: c.mutedLight || c.muted, borderColor: `${c.muted}40` }}>Add manually</button>
        )}
      </div>
    </motion.div>
  );
}

function OnlineSearchSheet({
  query,
  photoUrl,
  onSelect,
  onClose,
}: {
  query: string;
  photoUrl: string;
  onSelect: (c: Candidate) => void;
  onClose: () => void;
}) {
  const [sendPhoto, setSendPhoto] = useState(false);
  const [showPhotoToggle, setShowPhotoToggle] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const doSearch = async () => {
    setSearching(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/whisky/identify-online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          sendPhoto,
          photoUrl: sendPhoto ? photoUrl : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("Too many requests. Please wait.");
        throw new Error(err.message || "Online search failed");
      }

      const data = await res.json();
      setCandidates(data.candidates || []);
      setSearched(true);

      if (data.candidates.length === 0) {
        if (data.debug?.provider === "off") {
          setErrorMsg("Online search not configured.");
        } else {
          setErrorMsg("No results found online.");
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorMsg("Online search timed out.");
      } else {
        setErrorMsg(err?.message || "Online search failed.");
      }
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

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
      data-testid="sheet-online-search"
    >
      <div style={{ width: 40, height: 4, background: c.border, borderRadius: 2, margin: "0 auto 16px" }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 8px" }}>Search online (Beta)</h3>
      <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px" }}>
        Searching for: <span style={{ color: c.text }}>{query.substring(0, 60)}{query.length > 60 ? "..." : ""}</span>
      </p>

      {!searched && (
        <>
          <button
            onClick={() => setShowPhotoToggle(!showPhotoToggle)}
            style={{ background: "none", border: "none", color: c.muted, fontSize: 11, cursor: "pointer", padding: "4px 0", marginBottom: 8, fontFamily: "system-ui, sans-serif" }}
            data-testid="button-toggle-photo-option"
          >
            {showPhotoToggle ? "Hide options" : "Advanced options"}
          </button>

          {showPhotoToggle && photoUrl && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.muted, marginBottom: 4, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sendPhoto}
                onChange={(e) => setSendPhoto(e.target.checked)}
                data-testid="checkbox-send-photo"
                style={{ accentColor: c.accent }}
              />
              Also send photo (better results)
            </label>
          )}
          {showPhotoToggle && sendPhoto && (
            <p style={{ fontSize: 10, color: c.muted, margin: "0 0 12px", fontStyle: "italic" }}>Sends the image to a third-party API.</p>
          )}

          <button
            onClick={doSearch}
            disabled={searching}
            data-testid="button-run-online-search"
            style={{ ...btnPrimary, background: "#6ba3d6", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}
          >
            {searching ? (
              <>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Searching online...
              </>
            ) : "Search now"}
          </button>
        </>
      )}

      {searched && candidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {candidates.map((cand, i) => (
            <CandidateRow key={i} cand={cand} index={i} onSelect={onSelect} />
          ))}
        </div>
      )}

      {searched && errorMsg && (
        <p style={{ fontSize: 13, color: c.muted, textAlign: "center", margin: "12px 0" }}>{errorMsg}</p>
      )}

      <button onClick={onClose} data-testid="button-close-online" style={{ ...btnOutline, marginTop: searched ? 8 : 12, color: c.muted, borderColor: c.muted, fontSize: 13 }}>
        {searched ? "Back" : "Cancel"}
      </button>
    </motion.div>
  );
}

type SheetView = "none" | "picker" | "describe" | "candidates" | "identifying" | "onlineSearch";

export default function SimpleLogPage() {
  const { currentParticipant, setParticipant } = useAppStore();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [unlocked, setUnlocked] = useState(() => getSession().signedIn);
  const [pid, setPid] = useState<string | undefined>(() => getSession().pid || currentParticipant?.id);
  const [showUnlockPanel, setShowUnlockPanel] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (sess.signedIn) {
      setUnlocked(true);
      if (sess.pid) setPid(sess.pid);
    }
    if (currentParticipant?.id) setPid(currentParticipant.id);
  }, [currentParticipant]);

  const handleUnlocked = (name: string, participantId?: string) => {
    setUnlocked(true);
    setShowUnlockPanel(false);
    if (participantId) {
      setPid(participantId);
      setParticipant({ id: participantId, name, role: "participant" });
    }
  };

  const [whiskyName, setWhiskyName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [showManual, setShowManual] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => { try { return localStorage.getItem("simple_intro_seen") === "true"; } catch { return false; } });
  const [unknownAge, setUnknownAge] = useState("");
  const [unknownAbv, setUnknownAbv] = useState("");
  const [unknownCask, setUnknownCask] = useState("");
  const [unknownWbId, setUnknownWbId] = useState("");
  const [unknownPrice, setUnknownPrice] = useState("");
  const [showDetailed, setShowDetailed] = useState(false);
  const [detailedScores, setDetailedScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50 });
  const [detailTouched, setDetailTouched] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  const [detailChips, setDetailChips] = useState<Record<DimKey, string[]>>({ nose: [], taste: [], finish: [], balance: [] });
  const [detailTexts, setDetailTexts] = useState<Record<DimKey, string>>({ nose: "", taste: "", finish: "", balance: "" });
  const [expandedModules, setExpandedModules] = useState<Record<DimKey, boolean>>({ nose: false, taste: false, finish: false, balance: false });

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<DimKey | "notes" | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasSpeechAPI = !!SpeechRecognitionAPI;

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceListening(false);
    setVoiceTarget(null);
  }, []);

  const startVoice = useCallback((target: DimKey | "notes") => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        if (target === "notes") {
          setNotes((prev) => (prev ? prev + " " + transcript.trim() : transcript.trim()));
        } else {
          setDetailTexts((prev) => ({ ...prev, [target]: prev[target] ? prev[target] + " " + transcript.trim() : transcript.trim() }));
        }
      }
    };
    recognition.onerror = () => { setVoiceListening(false); setVoiceTarget(null); };
    recognition.onend = () => { setVoiceListening(false); setVoiceTarget(null); };
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceListening(true);
    setVoiceTarget(target);
  }, []);

  const toggleVoice = useCallback((target: DimKey | "notes" = "notes") => {
    if (voiceListening && voiceTarget === target) {
      stopVoice();
    } else {
      startVoice(target);
    }
  }, [voiceListening, voiceTarget, stopVoice, startVoice]);

  const handleToggleChip = (dim: DimKey, chip: string) => {
    setDetailChips((prev) => ({
      ...prev,
      [dim]: prev[dim].includes(chip) ? prev[dim].filter((c) => c !== chip) : [...prev[dim], chip],
    }));
  };

  const handleDetailTextChange = (dim: DimKey, val: string) => {
    setDetailTexts((prev) => ({ ...prev, [dim]: val }));
  };

  const toggleModule = (dim: DimKey) => {
    setExpandedModules((prev) => ({ ...prev, [dim]: !prev[dim] }));
  };

  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sheetView, setSheetView] = useState<SheetView>("none");
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isMenuMode, setIsMenuMode] = useState(false);
  const [lastResult, setLastResult] = useState<IdentifyResult | null>(null);
  const [onlineQuery, setOnlineQuery] = useState("");

  const processFiles = async (files: File[]) => {
    setScanning(true);
    setSheetView("identifying");
    setError("");

    try {
      let bestResult: IdentifyResult = { candidates: [] };

      for (const file of files.slice(0, 5)) {
        const formData = new FormData();
        formData.append("photo", file);

        const res = await fetch("/api/whisky/identify", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 429) throw new Error("Too many requests. Please wait a few minutes.");
          throw new Error(err.message || "Identification failed");
        }

        const data: IdentifyResult = await res.json();

        if (data.candidates.length > (bestResult.candidates?.length || 0) ||
            (data.candidates[0]?.confidence || 0) > (bestResult.candidates?.[0]?.confidence || 0)) {
          bestResult = data;
        }
      }

      setCandidates(bestResult.candidates || []);
      setPhotoUrl(bestResult.photoUrl || "");
      setIsMenuMode(bestResult.debug?.detectedMode === "menu");
      setLastResult(bestResult);
      setOnlineQuery(bestResult.debug?.ocrText || whiskyName || "");
      setSheetView("candidates");
    } catch (err: any) {
      setError(err?.message || "Identification failed. Try again.");
      setSheetView("none");
    } finally {
      setScanning(false);
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    await processFiles(files);
  };

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    await processFiles(files);
  };

  const handleDescribeSubmit = async (query: string) => {
    setScanning(true);
    setSheetView("identifying");
    setError("");

    try {
      const res = await fetch("/api/whisky/identify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("Too many requests. Please wait a few minutes.");
        throw new Error(err.message || "Search failed");
      }

      const data: IdentifyResult = await res.json();
      setCandidates(data.candidates || []);
      setPhotoUrl("");
      setIsMenuMode(data.debug?.detectedMode === "menu");
      setLastResult(data);
      setSheetView("candidates");
    } catch (err: any) {
      setError(err?.message || "Search failed. Try again.");
      setSheetView("none");
    } finally {
      setScanning(false);
    }
  };

  const handleSelectCandidate = (cand: Candidate) => {
    setWhiskyName(cand.name);
    setDistillery(cand.distillery);
    setSelectedCandidate(cand);
    setSheetView("none");
    setShowManual(false);
    if (!introSeen) { setIntroSeen(true); try { localStorage.setItem("simple_intro_seen", "true"); } catch {} }
  };

  const handleCreateUnknown = () => {
    setSheetView("none");
    setShowManual(true);
    setWhiskyName("");
    setDistillery("");
    setSelectedCandidate(null);
  };

  const handleRetake = () => {
    setSheetView("picker");
    setCandidates([]);
    setPhotoUrl("");
    setLastResult(null);
  };

  const handleSearchManually = () => {
    setSheetView("none");
    setCandidates([]);
  };

  const handleLogAnother = () => {
    if (lastResult) {
      setCandidates(lastResult.candidates || []);
      setPhotoUrl(lastResult.photoUrl || "");
      setIsMenuMode(lastResult.debug?.detectedMode === "menu");
      setSheetView("candidates");
    }
  };

  const getWhiskyHistory = (name: string): { score: number; date: string } | null => {
    if (!name.trim()) return null;
    try {
      const logs: { whiskyName?: string; score?: number; overall?: number; date?: string; timestamp?: string }[] = JSON.parse(localStorage.getItem("simple_manual_logs") || "[]");
      const scores: { whiskyName?: string; overall?: number; timestamp?: string }[] = JSON.parse(localStorage.getItem("simple_score_details") || "[]");
      const normalize = (s: string) => s.trim().toLowerCase();
      const target = normalize(name);
      const allEntries = [
        ...logs.filter(l => normalize(l.whiskyName || "") === target).map(l => ({ score: l.score ?? 0, date: l.date || l.timestamp || "" })),
        ...scores.filter(s => normalize(s.whiskyName || "") === target).map(s => ({ score: s.overall ?? 0, date: s.timestamp || "" })),
      ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      return allEntries[0] || null;
    } catch { return null; }
  };

  const buildScoresBlock = () => {
    if (!showDetailed) return "";
    const parts = [`\n[SCORES] Nose:${detailedScores.nose} Taste:${detailedScores.taste} Finish:${detailedScores.finish} Balance:${detailedScores.balance} [/SCORES]`];
    const dims: DimKey[] = ["nose", "taste", "finish", "balance"];
    for (const d of dims) {
      const chipStr = detailChips[d].length > 0 ? detailChips[d].join(", ") : "";
      const textStr = detailTexts[d].trim();
      if (chipStr || textStr) {
        parts.push(`[${d.toUpperCase()}] ${[chipStr, textStr].filter(Boolean).join(" — ")} [/${d.toUpperCase()}]`);
      }
    }
    return parts.join("\n");
  };

  const persistDetailedScores = () => {
    if (!showDetailed) return;
    try {
      const existing = JSON.parse(localStorage.getItem("simple_score_details") || "[]");
      existing.push({
        whiskyName: whiskyName.trim(),
        overall: score,
        nose: detailedScores.nose,
        taste: detailedScores.taste,
        finish: detailedScores.finish,
        balance: detailedScores.balance,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("simple_score_details", JSON.stringify(existing));
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whiskyName.trim()) return;

    const scoresBlock = buildScoresBlock();

    if (!pid) {
      const notesLocal = (notes.trim() + scoresBlock).trim();
      const entry = {
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim(),
        score,
        detailedScores: showDetailed ? { ...detailedScores } : undefined,
        notes: notesLocal,
        photoUrl,
        isManual: showManual,
        manualMeta: showManual ? { age: unknownAge, abv: unknownAbv, cask: unknownCask, whiskybaseId: unknownWbId, price: unknownPrice } : undefined,
        date: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("simple_manual_logs") || "[]");
      existing.push(entry);
      localStorage.setItem("simple_manual_logs", JSON.stringify(existing));
      persistDetailedScores();
      setSaved(true);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const notesWithScores = (notes.trim() + scoresBlock).trim() || undefined;

      const body: Record<string, any> = {
        title: whiskyName.trim(),
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim() || undefined,
        personalScore: score,
        noseNotes: notesWithScores,
        source: "casksense",
        imageUrl: photoUrl || undefined,
      };

      if (showManual) {
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

      persistDetailedScores();
      setSaved(true);
    } catch (err: any) {
      const notesFallback = (notes.trim() + scoresBlock).trim();
      const entry = {
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim(),
        score,
        detailedScores: showDetailed ? { ...detailedScores } : undefined,
        notes: notesFallback,
        photoUrl,
        isManual: showManual,
        manualMeta: showManual ? { age: unknownAge, abv: unknownAbv, cask: unknownCask, whiskybaseId: unknownWbId, price: unknownPrice } : undefined,
        date: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("simple_manual_logs") || "[]");
      existing.push(entry);
      localStorage.setItem("simple_manual_logs", JSON.stringify(existing));
      persistDetailedScores();
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
    setShowManual(false);
    setUnknownAge("");
    setUnknownAbv("");
    setUnknownCask("");
    setUnknownWbId("");
    setUnknownPrice("");
    setPhotoUrl("");
    setCandidates([]);
    setSelectedCandidate(null);
    setIsMenuMode(false);
    setShowDetailed(false);
    setDetailedScores({ nose: 50, taste: 50, finish: 50, balance: 50 });
    setDetailTouched(false);
    setOverrideActive(false);
    setDetailChips({ nose: [], taste: [], finish: [], balance: [] });
    setDetailTexts({ nose: "", taste: "", finish: "", balance: "" });
    setExpandedModules({ nose: false, taste: false, finish: false, balance: false });
    stopVoice();
  };

  const handleCopyJson = () => {
    const logs = localStorage.getItem("simple_manual_logs") || "[]";
    navigator.clipboard.writeText(logs);
  };

  const handleDownloadJson = () => {
    const logs = localStorage.getItem("simple_manual_logs") || "[]";
    const blob = new Blob([logs], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casksense-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [scoreAnimating, setScoreAnimating] = useState(false);
  const showOverlay = sheetView !== "none";

  const calcOverall = (scores: typeof detailedScores) =>
    Math.round((scores.nose + scores.taste + scores.finish + scores.balance) / 4);

  const handleScoreChange = (val: number) => {
    if (showDetailed && detailTouched) {
      setOverrideActive(true);
    }
    setScore(val);
    setScoreAnimating(true);
    setTimeout(() => setScoreAnimating(false), 120);
  };

  const handleDetailScoreChange = (key: "nose" | "taste" | "finish" | "balance", val: number) => {
    const next = { ...detailedScores, [key]: val };
    setDetailedScores(next);
    setDetailTouched(true);
    if (!overrideActive) {
      const avg = calcOverall(next);
      setScore(avg);
      setScoreAnimating(true);
      setTimeout(() => setScoreAnimating(false), 120);
    }
  };

  const resetOverride = () => {
    setOverrideActive(false);
    const avg = calcOverall(detailedScores);
    setScore(avg);
    setScoreAnimating(true);
    setTimeout(() => setScoreAnimating(false), 120);
  };

  const hasWhisky = !!(whiskyName.trim() && (selectedCandidate || showManual));

  const handleSaveClick = () => {
    if (!unlocked) {
      setShowUnlockPanel(true);
      return;
    }
    handleSave({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <SimpleShell>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraChange} style={{ display: "none" }} data-testid="input-camera" />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple onChange={handleUploadChange} style={{ display: "none" }} data-testid="input-upload" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {saved ? (
          <div style={{ textAlign: "center", padding: "40px 0 20px" }} data-testid="card-log-success">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${c.success}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <span style={{ fontSize: 24, color: c.success }}>✓</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Saved.</h2>
              <p style={{ fontSize: 14, color: c.mutedLight, margin: "0 0 28px" }}>{whiskyName}</p>
            </motion.div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleReset} data-testid="button-log-another" style={{ ...btnPrimary, flex: 1 }}>Log another</button>
              <Link href="/my-taste" style={{ flex: 1, textDecoration: "none" }}>
                <div style={{ ...btnOutline, textAlign: "center" }} data-testid="button-goto-taste">My Taste</div>
              </Link>
            </div>
            {lastResult && lastResult.candidates.length > 0 && (lastResult.debug?.detectedMode === "menu" || isMenuMode) && (
              <button onClick={() => { handleReset(); setTimeout(handleLogAnother, 100); }} data-testid="button-log-from-menu" style={{ ...btnOutline, marginTop: 10, fontSize: 13, color: c.accent, borderColor: c.accent }}>
                Log another from same menu
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} data-testid="form-log">

            <div style={{ marginBottom: 28, textAlign: "center" }} data-testid="section-intro">
              <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: 0, fontFamily: "'Playfair Display', serif" }}>Log a Whisky</h1>
              <p style={{ fontSize: 13, color: c.mutedLight, margin: "6px 0 0", lineHeight: 1.4 }}>Snap a photo, rate it, save your notes.</p>
            </div>

            {/* ── SECTION 1: IDENTIFY ── */}
            <div style={{ marginBottom: sectionSpacing }} data-testid="section-identify">
              <SectionLabel>Whisky</SectionLabel>

              <AnimatePresence mode="wait">
              {hasWhisky && !showManual ? (
                <motion.div
                  key="whisky-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                  data-testid="card-whisky-selected"
                >
                  {photoUrl && (
                    <img src={photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: `1px solid ${c.border}`, flexShrink: 0 }} data-testid="img-whisky-thumb" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: c.text, lineHeight: 1.2 }} data-testid="text-whisky-name">{whiskyName}</div>
                    {distillery && (
                      <div style={{ fontSize: 13, color: c.mutedLight, marginTop: 2 }} data-testid="text-whisky-meta">
                        {distillery}
                        {selectedCandidate && unknownAbv ? ` · ${unknownAbv}` : ""}
                      </div>
                    )}
                    {(() => {
                      const hist = getWhiskyHistory(whiskyName);
                      if (!hist) return null;
                      const d = hist.date ? new Date(hist.date) : null;
                      const dateStr = d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "";
                      return (
                        <div style={{ fontSize: 11, color: c.mutedLight, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }} data-testid="text-whisky-history">
                          <span>Logged before · {hist.score} pts{dateStr ? ` · ${dateStr}` : ""}</span>
                          <Link href="/my-taste" style={{ color: c.accent, fontSize: 11, textDecoration: "underline", textDecorationColor: `${c.accent}40`, textUnderlineOffset: 2 }} data-testid="link-compare">Compare</Link>
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setWhiskyName(""); setDistillery(""); setSelectedCandidate(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: c.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", padding: "2px 0", flexShrink: 0, textDecoration: "underline", textDecorationColor: `${c.mutedLight}40`, textUnderlineOffset: 2 }}
                    data-testid="button-change-whisky"
                  >
                    Change
                  </button>
                </motion.div>
              ) : (
                <motion.div key="whisky-input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <input
                    type="text"
                    value={whiskyName}
                    onChange={(e) => setWhiskyName(e.target.value)}
                    style={{ ...inputStyle, height: 44, marginBottom: showManual ? 0 : 10 }}
                    data-testid="input-whisky-name"
                    autoComplete="off"
                    placeholder="Identify by photo, description or search"
                  />
                  {!showManual && (
                    <div style={{ fontSize: 12, color: c.mutedLight, marginTop: 4, marginBottom: 10, lineHeight: 1.4 }} data-testid="text-identify-helper">
                      Matches your history automatically – or add manually.
                    </div>
                  )}

                  {!showManual && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSheetView("picker")}
                        disabled={scanning}
                        data-testid="button-identify"
                        style={{
                          width: "100%",
                          padding: "11px 14px",
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
                          marginBottom: 8,
                        }}
                      >
                        {scanning ? (
                          <>
                            <span style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${c.muted}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            Identifying...
                          </>
                        ) : (
                          <>
                            <Camera style={{ width: 16, height: 16 }} />
                            Identify Whisky
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowManual(true); setSelectedCandidate(null); }}
                        data-testid="button-add-manually"
                        style={{ background: "none", border: "none", cursor: "pointer", color: c.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", padding: 0, textAlign: "center", width: "100%" }}
                      >
                        or <span style={{ textDecoration: "underline", textDecorationColor: `${c.mutedLight}50`, textUnderlineOffset: 2 }}>add manually</span>
                      </button>
                    </>
                  )}

                  <AnimatePresence>
                  {showManual && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}
                      data-testid="section-manual"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: c.accent, background: `${c.accent}18`, padding: "3px 10px", borderRadius: 20 }} data-testid="chip-manual-entry">
                          <span style={{ fontSize: 9 }}>✎</span> Manual entry
                        </span>
                        <button type="button" onClick={() => setShowManual(false)} style={{ background: "none", border: "none", cursor: "pointer", color: c.muted, fontSize: 11, fontFamily: "system-ui, sans-serif", padding: 4 }} data-testid="button-hide-manual">
                          Collapse
                        </button>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Distillery</label>
                        <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} style={inputStyle} data-testid="input-manual-distillery" autoComplete="off" />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Age</label>
                          <input type="text" value={unknownAge} onChange={(e) => setUnknownAge(e.target.value)} style={inputStyle} data-testid="input-manual-age" placeholder="e.g. 12" autoComplete="off" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>ABV</label>
                          <input type="text" value={unknownAbv} onChange={(e) => setUnknownAbv(e.target.value)} style={inputStyle} data-testid="input-manual-abv" placeholder="e.g. 46%" autoComplete="off" />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Cask type</label>
                        <input type="text" value={unknownCask} onChange={(e) => setUnknownCask(e.target.value)} style={inputStyle} data-testid="input-manual-cask" placeholder="e.g. Sherry" autoComplete="off" />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Whiskybase ID</label>
                          <input type="text" value={unknownWbId} onChange={(e) => setUnknownWbId(e.target.value)} style={inputStyle} data-testid="input-manual-wbid" autoComplete="off" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: c.muted, display: "block", marginBottom: 2 }}>Price</label>
                          <input type="text" value={unknownPrice} onChange={(e) => setUnknownPrice(e.target.value)} style={inputStyle} data-testid="input-manual-price" placeholder="e.g. €65" autoComplete="off" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {!(hasWhisky || showManual || whiskyName.trim()) && (
              <div style={{ textAlign: "center", padding: "12px 0 4px", color: c.mutedLight, fontSize: 12 }} data-testid="text-unlock-hint">
                Add a whisky above to start
              </div>
            )}

            <div style={{ opacity: (hasWhisky || showManual || whiskyName.trim()) ? 1 : 0.3, pointerEvents: (hasWhisky || showManual || whiskyName.trim()) ? "auto" : "none", transition: "opacity 0.3s ease" }}>

            {/* ── SECTION 2: SCORE ── */}
            <div style={{ marginBottom: sectionSpacing }} data-testid="section-score">
              <SectionLabel>Score</SectionLabel>

              <button
                type="button"
                onClick={() => setShowDetailed(!showDetailed)}
                data-testid="button-toggle-detailed"
                style={{
                  width: "100%",
                  background: showDetailed ? `${c.accent}10` : c.inputBg,
                  border: `1px solid ${showDetailed ? c.accent : c.inputBorder}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  color: c.text,
                  fontSize: 13,
                  fontFamily: "system-ui, sans-serif",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  textAlign: "left",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Rate in detail</span>
                  <span style={{ fontSize: 16, color: c.accent, transition: "transform 0.2s", transform: showDetailed ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </span>
                {!showDetailed && (
                  <>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(["Nose", "Taste", "Finish", "Balance"] as const).map((dim) => {
                        const key = dim.toLowerCase() as DimKey;
                        const chipCount = detailChips[key].length;
                        return (
                          <span key={dim} style={{ fontSize: 10, color: chipCount > 0 ? c.accent : c.mutedLight, background: chipCount > 0 ? `${c.accent}15` : c.border, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.3 }}>
                            {dim}{chipCount > 0 ? ` (${chipCount})` : ""}
                          </span>
                        );
                      })}
                    </span>
                    {!detailTouched && (
                      <span style={{ fontSize: 11, color: c.mutedLight, lineHeight: 1.3 }}>
                        Rate Nose, Taste, Finish &amp; Balance individually
                      </span>
                    )}
                  </>
                )}
              </button>

              <AnimatePresence>
              {showDetailed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ paddingTop: 8, marginTop: 4 }}
                  data-testid="section-detailed-scoring"
                >
                  {(["Nose", "Taste", "Finish", "Balance"] as const).map((dim) => {
                    const key = dim.toLowerCase() as DimKey;
                    return (
                      <DetailModule
                        key={dim}
                        dim={key}
                        label={dim}
                        score={detailedScores[key]}
                        onScoreChange={(val) => handleDetailScoreChange(key, val)}
                        chips={detailChips[key]}
                        onToggleChip={handleToggleChip}
                        text={detailTexts[key]}
                        onTextChange={handleDetailTextChange}
                        expanded={expandedModules[key]}
                        onToggleExpand={() => toggleModule(key)}
                        voiceListening={voiceListening && voiceTarget === key}
                        onToggleVoice={toggleVoice}
                        hasSpeechAPI={hasSpeechAPI}
                      />
                    );
                  })}
                </motion.div>
              )}
              </AnimatePresence>

              <div style={{ marginTop: showDetailed ? 8 : 16, borderTop: detailTouched ? `1px solid ${c.border}` : "none", paddingTop: detailTouched ? 14 : 0 }}>
                {detailTouched && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.mutedLight }}>Suggested Score</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: c.mutedLight, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', serif" }} data-testid="text-suggested-score">
                        {calcOverall(detailedScores)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: c.mutedLight, marginTop: 2 }} data-testid="text-score-suggestion">
                      Based on your detailed ratings
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
                  {photoUrl && (
                    <img src={photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${c.border}`, flexShrink: 0 }} data-testid="img-score-thumb" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>Your Final Score</span>
                    {overrideActive && (
                      <span
                        style={{
                          fontSize: 10,
                          color: c.accent,
                          background: `${c.accent}15`,
                          padding: "2px 8px",
                          borderRadius: 20,
                          marginLeft: 8,
                        }}
                        data-testid="badge-score-mode"
                      >
                        Manually adjusted
                      </span>
                    )}
                  </div>
                  <motion.div
                    animate={{ scale: scoreAnimating ? 1.05 : 1 }}
                    transition={{ duration: 0.12 }}
                    style={{ fontSize: 28, fontWeight: 700, color: c.text, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}
                    data-testid="text-score-value"
                  >
                    {score}
                  </motion.div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => handleScoreChange(Number(e.target.value))}
                  data-testid="input-score"
                  className="warm-slider"
                  style={{ width: "100%", accentColor: c.accent, display: "block" }}
                />

                <div style={{ fontSize: 11, color: c.mutedLight, marginTop: 6, textAlign: "center" }}>
                  {detailTouched
                    ? (overrideActive ? "You've adjusted the score manually" : "Calculated from your detail ratings — slide to override")
                    : "Slide to set your score — or rate in detail above"
                  }
                </div>

                {overrideActive && (
                  <button
                    type="button"
                    onClick={resetOverride}
                    data-testid="button-reset-override"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: c.accent,
                      fontSize: 11,
                      fontFamily: "system-ui, sans-serif",
                      padding: "6px 0 0",
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                      display: "block",
                      margin: "0 auto",
                    }}
                  >
                    Reset to calculated
                  </button>
                )}
              </div>
            </div>

            {/* ── SECTION 3: REFLECTION ── */}
            <div style={{ marginBottom: sectionSpacing }} data-testid="section-reflection">
              <SectionLabel>Reflection</SectionLabel>
              <div style={{ position: "relative" }}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 120,
                    paddingRight: hasSpeechAPI ? 40 : 14,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    borderColor: (voiceListening && voiceTarget === "notes") ? "#c44" : c.border,
                    boxShadow: (voiceListening && voiceTarget === "notes") ? "0 0 0 2px #c4444420" : "none",
                  }}
                  onFocus={(e) => { if (!(voiceListening && voiceTarget === "notes")) { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.boxShadow = `0 0 0 2px ${c.accent}20`; } }}
                  onBlur={(e) => { if (!(voiceListening && voiceTarget === "notes")) { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; } }}
                  data-testid="input-notes"
                  placeholder={(voiceListening && voiceTarget === "notes") ? "Listening..." : "What stands out?"}
                />
                {hasSpeechAPI && (
                  <button
                    type="button"
                    onClick={() => toggleVoice("notes")}
                    data-testid="button-voice-input"
                    aria-label={(voiceListening && voiceTarget === "notes") ? "Stop voice input" : "Start voice input"}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      background: (voiceListening && voiceTarget === "notes") ? "#c4444420" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: 6,
                      color: (voiceListening && voiceTarget === "notes") ? "#c44" : c.mutedLight,
                      display: "flex",
                      alignItems: "center",
                      animation: (voiceListening && voiceTarget === "notes") ? "pulse-mic 1.5s ease-in-out infinite" : "none",
                    }}
                  >
                    {(voiceListening && voiceTarget === "notes") ? <MicOff style={{ width: 16, height: 16 }} /> : <Mic style={{ width: 16, height: 16 }} />}
                  </button>
                )}
              </div>
            </div>

            {/* ── SECTION 4: SAVE ── */}
            <div data-testid="section-save">
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={saving || !whiskyName.trim()}
                data-testid="button-save-log"
                style={{
                  width: "100%",
                  height: 52,
                  fontSize: 16,
                  fontWeight: 600,
                  background: !whiskyName.trim() ? c.border : c.accent,
                  color: !whiskyName.trim() ? c.muted : c.bg,
                  border: "none",
                  borderRadius: 10,
                  cursor: saving ? "wait" : !whiskyName.trim() ? "not-allowed" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                {saving ? "Saving..." : "Save to Journal"}
              </button>

              <AnimatePresence>
                {showUnlockPanel && !unlocked && (
                  <SignInCard
                    onSignedIn={(name, participantId) => {
                      handleUnlocked(name, participantId);
                      setTimeout(() => handleSave({ preventDefault: () => {} } as React.FormEvent), 100);
                    }}
                    onCancel={() => setShowUnlockPanel(false)}
                  />
                )}
              </AnimatePresence>

              <div style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 8 }} data-testid="text-save-hint">
                Your tasting will be added to My Taste
              </div>

              {error && <p style={{ fontSize: 12, color: c.error, margin: "10px 0 0", textAlign: "center" }}>{error}</p>}
            </div>

            </div>

          </form>
        )}
      </motion.div>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "#000", zIndex: 99 }}
            onClick={() => { if (!scanning) setSheetView("none"); }}
          />
        )}

        {sheetView === "picker" && (
          <IdentifyPicker
            key="picker"
            onTakePhoto={() => { setSheetView("none"); setTimeout(() => cameraInputRef.current?.click(), 100); }}
            onUploadPhotos={() => { setSheetView("none"); setTimeout(() => uploadInputRef.current?.click(), 100); }}
            onDescribe={() => setSheetView("describe")}
            onClose={() => setSheetView("none")}
          />
        )}

        {sheetView === "describe" && (
          <DescribeSheet key="describe" onSubmit={handleDescribeSubmit} onClose={() => setSheetView("none")} loading={scanning} />
        )}

        {sheetView === "identifying" && (
          <motion.div
            key="identifying"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: c.card, borderTop: `1px solid ${c.border}`, borderRadius: "16px 16px 0 0", padding: "40px 20px 60px", zIndex: 100, textAlign: "center" }}
            data-testid="sheet-identifying"
          >
            <div style={{ width: 40, height: 4, background: c.border, borderRadius: 2, margin: "0 auto 24px" }} />
            <div style={{ display: "inline-block", width: 24, height: 24, border: `3px solid ${c.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: 0 }}>Identifying...</p>
            <p style={{ fontSize: 12, color: c.muted, margin: "6px 0 0" }}>Analyzing your photo</p>
          </motion.div>
        )}

        {sheetView === "candidates" && (
          <CandidateSheet
            key="candidates"
            candidates={candidates}
            photoUrl={photoUrl}
            isMenuMode={isMenuMode}
            onSelect={handleSelectCandidate}
            onRetake={handleRetake}
            onSearchManually={handleSearchManually}
            onCreateUnknown={handleCreateUnknown}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-mic { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        ${sliderCSS}
      `}</style>
    </SimpleShell>
  );
}
