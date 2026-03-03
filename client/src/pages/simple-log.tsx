import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { getSimpleAuth, setSimpleAuth, clearSimpleAuth } from "@/lib/simple-auth";
import SimpleShell from "@/components/simple/simple-shell";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  mutedLight: "#8a7e6d",
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

function InlineUnlock({ onUnlocked }: { onUnlocked: (name: string, pid?: string) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/simple/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Unlock failed");
      }
      const displayName = data.name || name.trim() || "Guest";
      setSimpleAuth(displayName);

      if (name.trim() && pin.trim()) {
        try {
          const result = await participantApi.loginOrCreate(name.trim(), pin.trim());
          if (result?.id) {
            setSimpleAuth(displayName, result.id);
            onUnlocked(displayName, result.id);
            return;
          }
        } catch {}
      }
      onUnlocked(displayName);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid PIN")) setError("Wrong PIN.");
      else if (msg.includes("Too many")) setError("Too many attempts. Wait a moment.");
      else setError(msg || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        borderTop: `1px solid ${c.border}`,
        paddingTop: 14,
        marginTop: 10,
      }}
      data-testid="section-inline-unlock"
    >
      <p style={{ fontSize: 12, color: c.muted, margin: "0 0 10px" }}>Unlock to save your log.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="text" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }} data-testid="input-unlock-name" autoComplete="off" />
        <input type="password" placeholder="PIN *" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px", letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="off" />
        <button type="submit" disabled={loading || !pin.trim()} data-testid="button-inline-unlock" style={{ ...btnPrimary, fontSize: 13, padding: 10, opacity: !pin.trim() ? 0.5 : 1, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Unlocking…" : "Unlock"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
    </motion.div>
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
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>Identify</h3>
      <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px" }}>Photo used only to identify the whisky.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onTakePhoto} data-testid="button-take-photo" style={{ ...btnPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📷</span> Take Photo
        </button>
        <button onClick={onUploadPhotos} data-testid="button-upload-photos" style={{ ...btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🖼️</span> Upload Photo(s)
        </button>
        <button onClick={onDescribe} data-testid="button-describe" style={{ ...btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✏️</span> Describe
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
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 12px" }}>Describe the whisky</h3>

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

  const [unlocked, setUnlocked] = useState(() => getSimpleAuth().unlocked);
  const [pid, setPid] = useState<string | undefined>(() => getSimpleAuth().pid || currentParticipant?.id);
  const [showUnlockPanel, setShowUnlockPanel] = useState(false);

  useEffect(() => {
    const auth = getSimpleAuth();
    if (auth.unlocked) {
      setUnlocked(true);
      if (auth.pid) setPid(auth.pid);
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
  const [unknownAge, setUnknownAge] = useState("");
  const [unknownAbv, setUnknownAbv] = useState("");
  const [unknownCask, setUnknownCask] = useState("");
  const [unknownWbId, setUnknownWbId] = useState("");
  const [unknownPrice, setUnknownPrice] = useState("");
  const [showDetailed, setShowDetailed] = useState(false);
  const [detailedScores, setDetailedScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50 });

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

  const buildScoresBlock = () => {
    if (!showDetailed) return "";
    return `\n[SCORES] Nose:${detailedScores.nose} Taste:${detailedScores.taste} Finish:${detailedScores.finish} Balance:${detailedScores.balance} [/SCORES]`;
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

  const showOverlay = sheetView !== "none";

  return (
    <SimpleShell>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        style={{ display: "none" }}
        data-testid="input-camera"
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUploadChange}
        style={{ display: "none" }}
        data-testid="input-upload"
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
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
            {lastResult && lastResult.candidates.length > 0 && (lastResult.debug?.detectedMode === "menu" || isMenuMode) && (
              <button onClick={() => { handleReset(); setTimeout(handleLogAnother, 100); }} data-testid="button-log-from-menu" style={{ ...btnOutline, marginTop: 10, fontSize: 13, color: c.accent, borderColor: c.accent }}>
                Log another from same menu
              </button>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={handleCopyJson} data-testid="button-copy-json" style={{ ...btnOutline, flex: 1, fontSize: 12, color: c.muted, borderColor: c.muted }}>
                Copy JSON
              </button>
              <button onClick={handleDownloadJson} data-testid="button-download-json" style={{ ...btnOutline, flex: 1, fontSize: 12, color: c.muted, borderColor: c.muted }}>
                Download JSON
              </button>
            </div>
          </div>
        ) : (
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

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSheetView("picker")}
                  disabled={scanning}
                  data-testid="button-identify"
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
                      Identifying...
                    </>
                  ) : "Identify"}
                </button>
                {!showManual && (
                  <button
                    type="button"
                    onClick={() => { setShowManual(true); setSelectedCandidate(null); }}
                    data-testid="button-add-manually"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: c.muted,
                      fontSize: 12,
                      fontFamily: "system-ui, sans-serif",
                      padding: "8px 4px",
                      whiteSpace: "nowrap",
                      textDecoration: "underline",
                      textDecorationColor: `${c.muted}60`,
                      textUnderlineOffset: 2,
                    }}
                  >
                    Add manually
                  </button>
                )}
              </div>

              <AnimatePresence>
              {showManual && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0", borderTop: `1px solid ${c.border}` }}
                  data-testid="section-manual"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: c.accent,
                      background: `${c.accent}18`,
                      padding: "3px 10px",
                      borderRadius: 20,
                    }} data-testid="chip-manual-entry">
                      <span style={{ fontSize: 9 }}>✎</span> Manual entry
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManual(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: c.muted, fontSize: 11, fontFamily: "system-ui, sans-serif", padding: 4 }}
                      data-testid="button-hide-manual"
                    >
                      Collapse
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>Fill in what you know — everything except name is optional.</p>
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

              {!showManual && (
                <div>
                  <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Distillery</label>
                  <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} style={inputStyle} data-testid="input-distillery" autoComplete="off" />
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>
                  Overall: <span style={{ color: c.accent, fontWeight: 600 }}>{score}</span>
                </label>
                <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} data-testid="input-score" style={{ width: "100%", accentColor: c.accent }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: c.muted }}><span>0</span><span>100</span></div>

                <button
                  type="button"
                  onClick={() => setShowDetailed(!showDetailed)}
                  data-testid="button-toggle-detailed"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: showDetailed ? c.accent : c.muted,
                    fontSize: 12,
                    fontFamily: "system-ui, sans-serif",
                    padding: "6px 0 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 10, transition: "transform 0.2s", transform: showDetailed ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▸</span>
                  {showDetailed ? "Hide detailed scoring" : "Detailed scoring (4)"}
                </button>

                <AnimatePresence>
                {showDetailed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      paddingTop: 10,
                      marginTop: 6,
                      borderTop: `1px solid ${c.border}`,
                    }}
                    data-testid="section-detailed-scoring"
                  >
                    {(["Nose", "Taste", "Finish", "Balance"] as const).map((dim) => {
                      const key = dim.toLowerCase() as "nose" | "taste" | "finish" | "balance";
                      return (
                        <div key={dim} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, color: c.muted, width: 48, flexShrink: 0 }}>{dim}</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={detailedScores[key]}
                            onChange={(e) => setDetailedScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                            data-testid={`input-score-${key}`}
                            style={{ flex: 1, accentColor: c.accent }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 600, color: c.accent, width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{detailedScores[key]}</span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              <div>
                <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} data-testid="input-notes" placeholder="What do you taste?" />
              </div>

              {unlocked ? (
                <button type="submit" disabled={saving || !whiskyName.trim()} data-testid="button-save-log" style={{ ...btnPrimary, opacity: !whiskyName.trim() ? 0.5 : 1, cursor: saving ? "wait" : "pointer", marginTop: 4 }}>
                  {saving ? "Saving..." : "Save"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUnlockPanel(true)}
                  disabled={!whiskyName.trim()}
                  data-testid="button-save-locked"
                  style={{ ...btnPrimary, opacity: !whiskyName.trim() ? 0.5 : 1, cursor: "pointer", marginTop: 4, background: c.border, color: c.muted }}
                >
                  🔒 Unlock to save
                </button>
              )}

              <AnimatePresence>
                {showUnlockPanel && !unlocked && (
                  <InlineUnlock onUnlocked={handleUnlocked} />
                )}
              </AnimatePresence>

              {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
            </form>
          </div>
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
            onTakePhoto={() => {
              setSheetView("none");
              setTimeout(() => cameraInputRef.current?.click(), 100);
            }}
            onUploadPhotos={() => {
              setSheetView("none");
              setTimeout(() => uploadInputRef.current?.click(), 100);
            }}
            onDescribe={() => setSheetView("describe")}
            onClose={() => setSheetView("none")}
          />
        )}

        {sheetView === "describe" && (
          <DescribeSheet
            key="describe"
            onSubmit={handleDescribeSubmit}
            onClose={() => setSheetView("none")}
            loading={scanning}
          />
        )}

        {sheetView === "identifying" && (
          <motion.div
            key="identifying"
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
              padding: "40px 20px 60px",
              zIndex: 100,
              textAlign: "center",
            }}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </SimpleShell>
  );
}
