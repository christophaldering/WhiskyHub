import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession, signIn, setSessionPid } from "@/lib/session";
import { participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";
import {
  Camera, PenLine, Check, ChevronDown, Mic, Loader2, Search, Upload, FileText, Barcode, X
} from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: v.inputBg,
  border: `1px solid ${v.inputBorder}`,
  borderRadius: 12,
  color: v.text,
  padding: "12px 16px",
  fontSize: 15,
  fontFamily: "system-ui, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: 14,
  fontSize: 15,
  fontWeight: 600,
  background: v.accent,
  color: v.bg,
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const btnOutline: React.CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: v.text,
  border: `1px solid ${v.border}`,
  fontWeight: 500,
};

const ATTRIBUTES = {
  nose: ["Fruity", "Floral", "Spicy", "Smoky", "Woody", "Sweet", "Malty", "Sherry", "Citrus", "Peaty"],
  taste: ["Sweet", "Dry", "Oily", "Spicy", "Fruity", "Nutty", "Chocolate", "Vanilla", "Salty", "Peaty"],
  finish: ["Short", "Medium", "Long", "Warm", "Dry", "Spicy", "Smoky", "Sweet", "Bitter"],
  balance: ["Harmonious", "Complex", "Rough", "Elegant", "Powerful", "Thin"],
} as const;

type DimKey = "nose" | "taste" | "finish" | "balance";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

interface Candidate {
  name: string;
  distillery: string;
  confidence: number;
  whiskyId?: string;
  source?: "local" | "external";
  externalUrl?: string;
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
  if (conf >= 0.78) return { text: "High", color: v.high };
  if (conf >= 0.55) return { text: "Medium", color: v.medium };
  return { text: "Low", color: v.low };
}

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 20,
    border: `1px solid ${selected ? v.accent : v.border}`,
    background: selected ? alpha(v.accent, "18") : "transparent",
    color: selected ? v.accent : v.mutedLight,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  };
}

type SheetView = "none" | "picker" | "describe" | "candidates" | "identifying" | "onlineSearch" | "barcode" | "fileAnalyzing";

export default function M2TastingsSolo() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [wbLookupLoading, setWbLookupLoading] = useState(false);
  const [wbLookupResult, setWbLookupResult] = useState("");

  const [showDetailed, setShowDetailed] = useState(true);
  const [detailedScores, setDetailedScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50 });
  const [detailTouched, setDetailTouched] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  const [detailChips, setDetailChips] = useState<Record<DimKey, string[]>>({ nose: [], taste: [], finish: [], balance: [] });
  const [detailTexts, setDetailTexts] = useState<Record<DimKey, string>>({ nose: "", taste: "", finish: "", balance: "" });
  const [expandedModules, setExpandedModules] = useState<Record<DimKey, boolean>>({ nose: true, taste: false, finish: false, balance: false });

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<DimKey | "notes" | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasSpeechAPI = !!SpeechRecognitionAPI;

  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sheetView, setSheetView] = useState<SheetView>("none");
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isMenuMode, setIsMenuMode] = useState(false);
  const [lastResult, setLastResult] = useState<IdentifyResult | null>(null);
  const [onlineQuery, setOnlineQuery] = useState("");
  const [describeQuery, setDescribeQuery] = useState("");
  const [describeLoading, setDescribeLoading] = useState(false);
  const [onlineSearching, setOnlineSearching] = useState(false);
  const [onlineCandidates, setOnlineCandidates] = useState<Candidate[]>([]);
  const [onlineSearched, setOnlineSearched] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [barcodeManual, setBarcodeManual] = useState("");
  const [barcodeStatus, setBarcodeStatus] = useState<"scanning" | "looking_up" | "not_found" | "error" | "camera_error">("scanning");
  const [barcodeError, setBarcodeError] = useState("");
  const barcodeProcessedRef = useRef(false);

  const calcOverall = (scores: typeof detailedScores) =>
    Math.round((scores.nose + scores.taste + scores.finish + scores.balance) / 4);

  const lookupWhiskybaseId = useCallback(async (wbId: string) => {
    const id = wbId.trim();
    if (!id || wbLookupLoading) return;
    setWbLookupLoading(true);
    setWbLookupResult("");
    try {
      const headers: Record<string, string> = {};
      if (pid) headers["x-participant-id"] = pid;
      const res = await fetch(`/api/whiskybase-lookup/${encodeURIComponent(id)}`, { headers });
      if (!res.ok) {
        if (res.status === 429) { setWbLookupResult("rate_limit"); return; }
        if (res.status === 503) { setWbLookupResult("ai_unavailable"); return; }
        if (res.status === 400) { setWbLookupResult("invalid"); return; }
        setWbLookupResult("not_found");
        return;
      }
      const data = await res.json();
      if (data.name && !whiskyName) setWhiskyName(data.name);
      if (data.distillery && !distillery) setDistillery(data.distillery);
      if (data.age && !unknownAge) setUnknownAge(String(data.age));
      if (data.abv && !unknownAbv) setUnknownAbv(data.abv);
      if (data.caskType && !unknownCask) setUnknownCask(data.caskType);
      if (data.price && !unknownPrice) setUnknownPrice(data.price);
      setWbLookupResult(data.source === "collection" ? "collection" : "ai");
    } catch {
      setWbLookupResult("error");
    } finally {
      setWbLookupLoading(false);
    }
  }, [pid, whiskyName, distillery, unknownAge, unknownAbv, unknownCask, unknownPrice, wbLookupLoading]);

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

  const handleScoreChange = (val: number) => {
    if (showDetailed && detailTouched) {
      setOverrideActive(true);
    }
    setScore(val);
  };

  const handleDetailScoreChange = (key: DimKey, val: number) => {
    const next = { ...detailedScores, [key]: val };
    setDetailedScores(next);
    setDetailTouched(true);
    if (!overrideActive) {
      setScore(calcOverall(next));
    }
  };

  const resetOverride = () => {
    setOverrideActive(false);
    setScore(calcOverall(detailedScores));
  };

  const processFiles = async (files: File[]) => {
    setScanning(true);
    setSheetView("identifying");
    setError("");
    try {
      let bestResult: IdentifyResult = { candidates: [] };
      for (const file of files.slice(0, 5)) {
        const formData = new FormData();
        formData.append("photo", file);
        const res = await fetch("/api/whisky/identify", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 429) throw new Error("Too many requests. Please wait.");
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
      setError(err?.message || "Identification failed.");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSheetView("fileAnalyzing");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/tastings/ai-import", {
        method: "POST",
        headers: pid ? { "x-participant-id": pid } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      if (data.whiskies && data.whiskies.length > 0) {
        const first = data.whiskies[0];
        if (first.name) setWhiskyName(first.name);
        if (first.distillery) setDistillery(first.distillery);
        if (first.age) setUnknownAge(String(first.age));
        if (first.abv) setUnknownAbv(String(first.abv));
        if (first.caskType) setUnknownCask(first.caskType);
        if (first.whiskybaseId) setUnknownWbId(String(first.whiskybaseId));
        if (first.price) setUnknownPrice(String(first.price));
        setShowManual(true);
        setSheetView("none");
      } else {
        setError("No whiskies found in the uploaded file.");
        setSheetView("none");
      }
    } catch (err: any) {
      setError(err.message || "File import failed");
      setSheetView("none");
    }
  };

  const handleDescribeSubmit = async (query: string) => {
    setDescribeLoading(true);
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
        if (res.status === 429) throw new Error("Too many requests.");
        throw new Error(err.message || "Search failed");
      }
      const data: IdentifyResult = await res.json();
      setCandidates(data.candidates || []);
      setPhotoUrl("");
      setIsMenuMode(data.debug?.detectedMode === "menu");
      setLastResult(data);
      setOnlineQuery(data.debug?.ocrText || query);
      setSheetView("candidates");
    } catch (err: any) {
      setError(err?.message || "Search failed.");
      setSheetView("none");
    } finally {
      setDescribeLoading(false);
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

  const lookupBarcode = useCallback(async (code: string) => {
    if (barcodeProcessedRef.current) return;
    barcodeProcessedRef.current = true;
    setBarcodeStatus("looking_up");
    try {
      const headers: Record<string, string> = {};
      if (pid) headers["x-participant-id"] = pid;
      const res = await fetch(`/api/barcode-lookup/${encodeURIComponent(code.trim())}`, { headers });
      if (!res.ok) {
        if (res.status === 404) { setBarcodeStatus("not_found"); setBarcodeError(code); barcodeProcessedRef.current = false; return; }
        setBarcodeStatus("error"); setBarcodeError("Lookup failed"); barcodeProcessedRef.current = false; return;
      }
      const data = await res.json();
      if (data.name) setWhiskyName(data.name);
      if (data.distillery) setDistillery(data.distillery);
      if (data.age) setUnknownAge(String(data.age));
      if (data.abv) setUnknownAbv(data.abv);
      if (data.caskType) setUnknownCask(data.caskType);
      if (data.whiskybaseId) setUnknownWbId(String(data.whiskybaseId));
      if (data.price) setUnknownPrice(String(data.price));
      setShowManual(true);
      setSheetView("none");
    } catch {
      setBarcodeStatus("error");
      setBarcodeError("Connection error");
      barcodeProcessedRef.current = false;
    }
  }, [pid]);

  const doOnlineSearch = async () => {
    setOnlineSearching(true);
    setOnlineError("");
    try {
      const res = await fetch("/api/whisky/identify-online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: onlineQuery }),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Too many requests.");
        throw new Error("Online search failed");
      }
      const data = await res.json();
      setOnlineCandidates(data.candidates || []);
      setOnlineSearched(true);
      if (data.candidates.length === 0) setOnlineError("No results found online.");
    } catch (err: any) {
      setOnlineError(err?.message || "Online search failed.");
      setOnlineSearched(true);
    } finally {
      setOnlineSearching(false);
    }
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

  const persistLocal = () => {
    try {
      const entry = {
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim(),
        score,
        detailedScores: showDetailed ? { ...detailedScores } : undefined,
        notes: (notes.trim() + buildScoresBlock()).trim(),
        photoUrl,
        age: unknownAge,
        abv: unknownAbv,
        caskType: unknownCask,
        whiskybaseId: unknownWbId,
        price: unknownPrice,
        date: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("m2_solo_logs") || "[]");
      existing.push(entry);
      localStorage.setItem("m2_solo_logs", JSON.stringify(existing));
    } catch {}
  };

  const handleSave = async () => {
    if (!whiskyName.trim()) return;

    if (!unlocked || !pid) {
      persistLocal();
      setSaved(true);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const scoresBlock = buildScoresBlock();
      const body: Record<string, any> = {
        title: whiskyName.trim(),
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim() || undefined,
        personalScore: score,
        noseNotes: (notes.trim() + scoresBlock).trim() || undefined,
        source: "casksense",
        imageUrl: photoUrl || undefined,
      };

      if (unknownAge.trim()) body.age = unknownAge.trim();
      if (unknownAbv.trim()) body.abv = unknownAbv.trim();
      if (unknownCask.trim()) body.caskType = unknownCask.trim();
      if (unknownWbId.trim()) body.whiskybaseId = unknownWbId.trim();

      const res = await fetch(`/api/journal/${pid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setSaved(true);
    } catch {
      persistLocal();
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
    setDetailedScores({ nose: 50, taste: 50, finish: 50, balance: 50 });
    setDetailTouched(false);
    setOverrideActive(false);
    setDetailChips({ nose: [], taste: [], finish: [], balance: [] });
    setDetailTexts({ nose: "", taste: "", finish: "", balance: "" });
    setExpandedModules({ nose: true, taste: false, finish: false, balance: false });
    stopVoice();
    setWbLookupResult("");
  };

  const handleUnlocked = (name: string, participantId?: string) => {
    setUnlocked(true);
    setShowUnlockPanel(false);
    if (participantId) {
      setPid(participantId);
      setParticipant({ id: participantId, name, role: "participant" });
    }
  };

  const hasWhisky = !!(whiskyName.trim() && (selectedCandidate || showManual));

  if (saved) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-solo-page">
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: alpha(v.success, "20"), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check style={{ width: 28, height: 28, color: v.success }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: v.text, margin: "0 0 4px", fontFamily: "'Playfair Display', Georgia, serif" }} data-testid="text-saved-title">
            {t("m2.solo.saved", "Dram saved!")}
          </h2>
          <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 28px" }} data-testid="text-saved-name">{whiskyName}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset} style={btnPrimary} data-testid="m2-solo-again">
              {t("m2.solo.logAnother", "Log another dram")}
            </button>
            <Link href="/m2/taste/drams" style={{ flex: 1, textDecoration: "none" }}>
              <div style={{ ...btnOutline, textAlign: "center" }} data-testid="button-goto-drams">
                {t("m2.solo.myDrams", "My Drams")}
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: 100 }} data-testid="m2-solo-page">
      <M2BackButton />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraChange} style={{ display: "none" }} data-testid="input-camera" />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple onChange={handleUploadChange} style={{ display: "none" }} data-testid="input-upload" />
      <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.pdf,.docx,text/csv" onChange={handleFileUpload} style={{ display: "none" }} data-testid="input-file-upload" />

      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0 4px" }} data-testid="text-m2-solo-title">
        {t("m2.solo.title", "Solo Dram")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.solo.subtitle", "Log a whisky on your own — take notes, rate, and remember.")}
      </p>

      {error && (
        <div style={{ background: alpha(v.danger, "15"), border: `1px solid ${v.danger}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: v.danger, display: "flex", alignItems: "center", justifyContent: "space-between" }} data-testid="text-error">
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: v.danger, cursor: "pointer", padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      {/* SECTION 1: IDENTIFY WHISKY */}
      <div style={{ marginBottom: 24 }} data-testid="section-identify">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: v.mutedLight, marginBottom: 10 }}>
          {t("m2.solo.whiskyLabel", "Whisky")}
        </div>

        {hasWhisky && !showManual ? (
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }} data-testid="card-whisky-selected">
            {photoUrl && (
              <img src={photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: `1px solid ${v.border}`, flexShrink: 0 }} data-testid="img-whisky-thumb" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: v.text, lineHeight: 1.2 }} data-testid="text-whisky-name">{whiskyName}</div>
              {distillery && <div style={{ fontSize: 13, color: v.mutedLight, marginTop: 2 }} data-testid="text-whisky-distillery">{distillery}</div>}
              {selectedCandidate && (
                <span style={{ fontSize: 11, fontWeight: 600, color: confidenceLabel(selectedCandidate.confidence).color, background: `${confidenceLabel(selectedCandidate.confidence).color}20`, padding: "2px 8px", borderRadius: 6, marginTop: 4, display: "inline-block" }} data-testid="badge-confidence">
                  {confidenceLabel(selectedCandidate.confidence).text} match
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setWhiskyName(""); setDistillery(""); setSelectedCandidate(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: v.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", textDecoration: "underline" }}
              data-testid="button-change-whisky"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={whiskyName}
                onChange={(e) => setWhiskyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (whiskyName.trim() && !scanning) handleDescribeSubmit(whiskyName.trim());
                  }
                }}
                style={{ ...inputStyle, height: 48, paddingRight: 44 }}
                data-testid="m2-solo-name"
                autoComplete="off"
                placeholder={t("m2.solo.namePlaceholder", "Name, description or photo")}
              />
              <button
                type="button"
                onClick={() => { if (!scanning) setSheetView("picker"); }}
                data-testid="button-identify"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: v.mutedLight, padding: 6, borderRadius: 6,
                  display: "flex", alignItems: "center",
                }}
              >
                {scanning
                  ? <span style={{ display: "inline-block", width: 18, height: 18, border: `2px solid ${v.muted}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  : <Camera style={{ width: 20, height: 20 }} />}
              </button>
            </div>

            {!showManual && (
              <button
                type="button"
                onClick={() => { setShowManual(true); setSelectedCandidate(null); }}
                data-testid="button-add-details"
                style={{ background: "none", border: "none", cursor: "pointer", color: v.mutedLight, fontSize: 11, fontFamily: "system-ui, sans-serif", padding: "8px 0 0", textDecoration: "underline" }}
              >
                {t("m2.solo.addDetails", "Add details manually")}
              </button>
            )}

            {showManual && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }} data-testid="section-manual">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: v.accent, background: alpha(v.accent, "18"), padding: "3px 10px", borderRadius: 20 }}>✎ Manual entry</span>
                  <button type="button" onClick={() => setShowManual(false)} style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, fontSize: 11, fontFamily: "system-ui, sans-serif" }} data-testid="button-hide-manual">Collapse</button>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 2 }}>{t("m2.solo.distillery", "Distillery")}</label>
                  <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} style={inputStyle} data-testid="m2-solo-distillery" autoComplete="off" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 2 }}>{t("m2.solo.age", "Age")}</label>
                    <input type="text" value={unknownAge} onChange={(e) => setUnknownAge(e.target.value)} style={inputStyle} data-testid="input-manual-age" placeholder="e.g. 12" autoComplete="off" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 2 }}>{t("m2.solo.abv", "ABV")}</label>
                    <input type="text" value={unknownAbv} onChange={(e) => setUnknownAbv(e.target.value)} style={inputStyle} data-testid="input-manual-abv" placeholder="e.g. 46%" autoComplete="off" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 2 }}>{t("m2.solo.caskType", "Cask type")}</label>
                  <input type="text" value={unknownCask} onChange={(e) => setUnknownCask(e.target.value)} style={inputStyle} data-testid="input-manual-cask" placeholder="e.g. Sherry" autoComplete="off" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 2 }}>{t("m2.solo.whiskybaseId", "Whiskybase ID")}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={unknownWbId}
                        onChange={(e) => { setUnknownWbId(e.target.value); setWbLookupResult(""); }}
                        onBlur={() => { if (unknownWbId.trim() && !wbLookupResult) lookupWhiskybaseId(unknownWbId); }}
                        style={{ ...inputStyle, paddingRight: 40 }}
                        data-testid="input-manual-wbid"
                        autoComplete="off"
                        placeholder="e.g. 12345"
                      />
                      <button
                        type="button"
                        onClick={() => lookupWhiskybaseId(unknownWbId)}
                        disabled={!unknownWbId.trim() || wbLookupLoading}
                        data-testid="button-wb-lookup"
                        style={{
                          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: unknownWbId.trim() && !wbLookupLoading ? "pointer" : "default",
                          padding: 6, color: wbLookupLoading ? v.accent : v.muted, opacity: unknownWbId.trim() ? 1 : 0.3,
                        }}
                      >
                        {wbLookupLoading
                          ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                          : <Search style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                    {wbLookupResult && (
                      <p style={{ fontSize: 10, margin: "4px 0 0", color: wbLookupResult === "collection" || wbLookupResult === "ai" ? v.success : v.error }} data-testid="text-wb-result">
                        {wbLookupResult === "collection" ? "✓ From collection" :
                         wbLookupResult === "ai" ? "✓ AI recognized" :
                         wbLookupResult === "not_found" ? "Not found" :
                         wbLookupResult === "rate_limit" ? "Rate limited, please wait" :
                         wbLookupResult === "ai_unavailable" ? "AI unavailable" :
                         wbLookupResult === "invalid" ? "Invalid ID" : "Error"}
                      </p>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 2 }}>{t("m2.solo.price", "Price")}</label>
                    <input type="text" value={unknownPrice} onChange={(e) => setUnknownPrice(e.target.value)} style={inputStyle} data-testid="input-manual-price" placeholder="e.g. €65" autoComplete="off" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SECTION 2: RATING */}
      <div style={{ marginBottom: 24 }} data-testid="section-score">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: v.mutedLight, marginBottom: 10 }}>
          {t("m2.solo.scoreLabel", "Score")}
        </div>

        <button
          type="button"
          onClick={() => setShowDetailed(!showDetailed)}
          data-testid="button-toggle-detailed"
          style={{
            width: "100%",
            background: showDetailed ? alpha(v.accent, "10") : v.inputBg,
            border: `1px solid ${showDetailed ? v.accent : v.inputBorder}`,
            borderRadius: 12, cursor: "pointer", color: v.text, fontSize: 13,
            fontFamily: "system-ui, sans-serif", padding: "10px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <span style={{ fontWeight: 600 }}>{t("m2.solo.rateDetail", "Rate in detail")}</span>
          <ChevronDown style={{ width: 16, height: 16, color: v.accent, transition: "transform 0.2s", transform: showDetailed ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>

        {showDetailed && (
          <div style={{ paddingTop: 8, marginTop: 4 }} data-testid="section-detailed-scoring">
            {(["Nose", "Taste", "Finish", "Balance"] as const).map((dim) => {
              const key = dim.toLowerCase() as DimKey;
              const attrs = ATTRIBUTES[key];
              const expanded = expandedModules[key];
              return (
                <div key={dim} style={{ borderBottom: `1px solid ${v.border}` }}>
                  <button
                    type="button"
                    onClick={() => toggleModule(key)}
                    data-testid={`button-expand-${key}`}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 0", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: v.text }}>{dim}</span>
                      {detailChips[key].length > 0 && (
                        <span style={{ fontSize: 10, color: v.accent, background: alpha(v.accent, "15"), padding: "2px 8px", borderRadius: 10 }}>
                          {detailChips[key].length}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: v.accent, fontVariantNumeric: "tabular-nums", width: 24, textAlign: "right" }}>{detailedScores[key]}</span>
                      <ChevronDown style={{ width: 16, height: 16, color: v.mutedLight, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </div>
                  </button>

                  {expanded && (
                    <div style={{ paddingTop: 12, paddingBottom: 16 }}>
                      <input
                        type="range" min={0} max={100} value={detailedScores[key]}
                        onChange={(e) => handleDetailScoreChange(key, Number(e.target.value))}
                        data-testid={`input-score-${key}`}
                        style={{ width: "100%", accentColor: v.accent, display: "block", marginBottom: 14 }}
                      />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }} data-testid={`chips-${key}`}>
                        {attrs.map((attr) => (
                          <button
                            key={attr} type="button"
                            onClick={() => handleToggleChip(key, attr)}
                            data-testid={`chip-${key}-${attr.toLowerCase()}`}
                            style={chipStyle(detailChips[key].includes(attr))}
                          >
                            {attr}
                          </button>
                        ))}
                      </div>
                      <div style={{ position: "relative" }}>
                        <textarea
                          value={detailTexts[key]}
                          onChange={(e) => handleDetailTextChange(key, e.target.value)}
                          placeholder={`Describe the ${dim.toLowerCase()}...`}
                          rows={2}
                          data-testid={`input-text-${key}`}
                          style={{
                            ...inputStyle,
                            resize: "vertical",
                            minHeight: 56,
                            paddingRight: hasSpeechAPI ? 40 : 14,
                            borderColor: (voiceListening && voiceTarget === key) ? v.danger : v.inputBorder,
                          }}
                        />
                        {hasSpeechAPI && (
                          <button
                            type="button"
                            onClick={() => toggleVoice(key)}
                            data-testid={`button-voice-${key}`}
                            style={{
                              position: "absolute", right: 8, top: 8,
                              background: (voiceListening && voiceTarget === key) ? v.danger : "transparent",
                              border: "none", borderRadius: "50%", cursor: "pointer",
                              width: 28, height: 28, padding: 0,
                              color: (voiceListening && voiceTarget === key) ? v.bg : v.mutedLight,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Mic style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: showDetailed ? 8 : 16 }}>
          {detailTouched && (
            <div style={{ marginBottom: 14, borderTop: `1px solid ${v.border}`, paddingTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: v.mutedLight }}>Suggested Score</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: v.mutedLight, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', serif" }} data-testid="text-suggested-score">
                  {calcOverall(detailedScores)}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: v.text }}>
              {t("m2.solo.overall", "Overall")}
              {overrideActive && (
                <span style={{ fontSize: 10, color: v.accent, background: alpha(v.accent, "15"), padding: "2px 8px", borderRadius: 20, marginLeft: 8 }} data-testid="badge-override">
                  Manual
                </span>
              )}
            </span>
            <span style={{ fontSize: 28, fontWeight: 700, color: v.text, fontVariantNumeric: "tabular-nums", fontFamily: "'Playfair Display', serif" }} data-testid="text-score-value">
              {score}
            </span>
          </div>
          <input
            type="range" min={0} max={100} value={score}
            onChange={(e) => handleScoreChange(Number(e.target.value))}
            data-testid="m2-solo-rating"
            style={{ width: "100%", accentColor: v.accent, display: "block" }}
          />
          {overrideActive && (
            <button
              type="button" onClick={resetOverride} data-testid="button-reset-override"
              style={{ background: "none", border: "none", cursor: "pointer", color: v.accent, fontSize: 11, fontFamily: "system-ui, sans-serif", padding: "6px 0 0", textDecoration: "underline", display: "block", margin: "0 auto" }}
            >
              Reset to calculated
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: NOTES */}
      <div style={{ marginBottom: 24 }} data-testid="section-notes">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: v.mutedLight, marginBottom: 10 }}>
          {t("m2.solo.notesLabel", "Notes")}
        </div>
        <div style={{ position: "relative" }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              ...inputStyle, resize: "vertical", minHeight: 100,
              paddingRight: hasSpeechAPI ? 40 : 14,
              borderColor: (voiceListening && voiceTarget === "notes") ? v.danger : v.inputBorder,
            }}
            data-testid="m2-solo-notes"
            placeholder={t("m2.solo.notesPlaceholder", "What stands out?")}
          />
          {hasSpeechAPI && (
            <button
              type="button"
              onClick={() => toggleVoice("notes")}
              data-testid="button-voice-notes"
              style={{
                position: "absolute", right: 10, top: 10,
                background: (voiceListening && voiceTarget === "notes") ? v.danger : "transparent",
                border: "none", borderRadius: "50%", cursor: "pointer",
                width: 32, height: 32, padding: 0,
                color: (voiceListening && voiceTarget === "notes") ? v.bg : v.mutedLight,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Mic style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>

      {/* SAVE BUTTON */}
      {!unlocked && !showUnlockPanel && (
        <button
          onClick={() => setShowUnlockPanel(true)}
          style={{ ...btnOutline, marginBottom: 12, color: v.accent, borderColor: v.accent, fontSize: 13 }}
          data-testid="button-unlock-prompt"
        >
          {t("m2.solo.signInToSave", "Sign in to save to your account")}
        </button>
      )}

      {showUnlockPanel && (
        <SignInCard onSignedIn={handleUnlocked} onCancel={() => setShowUnlockPanel(false)} />
      )}

      <button
        onClick={handleSave}
        disabled={!whiskyName.trim() || saving}
        style={{
          ...btnPrimary,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: !whiskyName.trim() ? 0.5 : 1,
          cursor: !whiskyName.trim() || saving ? "not-allowed" : "pointer",
          marginTop: 8,
        }}
        data-testid="m2-solo-save"
      >
        <PenLine style={{ width: 18, height: 18 }} />
        {saving ? t("m2.solo.saving", "Saving...") : t("m2.solo.save", "Save Dram")}
      </button>

      {!unlocked && (
        <p style={{ fontSize: 11, color: v.mutedLight, textAlign: "center", marginTop: 8 }}>
          {t("m2.solo.offlineHint", "Not signed in — will be saved locally on this device.")}
        </p>
      )}

      {/* SHEET OVERLAYS */}
      {sheetView !== "none" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} onClick={() => setSheetView("none")} />
      )}

      {sheetView === "picker" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: v.bg,
          borderTop: `1px solid ${v.border}`, borderRadius: "16px 16px 0 0",
          padding: "20px 20px 40px", zIndex: 100, maxHeight: "85dvh", overflowY: "auto",
        }} data-testid="sheet-identify-picker">
          <div style={{ width: 40, height: 4, background: v.border, borderRadius: 2, margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: v.text, margin: "0 0 4px", fontFamily: "'Playfair Display', serif" }}>
            {t("m2.solo.identifyTitle", "Identify your whisky")}
          </h3>
          <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>
            {t("m2.solo.identifySubtitle", "Choose how you'd like to identify your bottle.")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => { setSheetView("none"); cameraInputRef.current?.click(); }} data-testid="button-card-photo" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Camera style={{ width: 22, height: 22, color: v.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: v.accent }}>{t("m2.solo.photoTitle", "📷 Take Photo")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("m2.solo.photoDesc", "Snap the label for AI identification")}</div>
              </div>
            </button>

            <button onClick={() => { setSheetView("none"); uploadInputRef.current?.click(); }} data-testid="button-card-upload" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Upload style={{ width: 22, height: 22, color: v.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: v.accent }}>{t("m2.solo.uploadTitle", "Upload Photos")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("m2.solo.uploadDesc", "Select multiple photos from gallery")}</div>
              </div>
            </button>

            <button onClick={() => { setSheetView("describe"); setDescribeQuery(""); }} data-testid="button-card-describe" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <FileText style={{ width: 22, height: 22, color: v.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: v.accent }}>{t("m2.solo.describeTitle", "Describe Bottle")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("m2.solo.describeDesc", "Type what you see on the label")}</div>
              </div>
            </button>

            <button onClick={() => { setSheetView("barcode"); setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setBarcodeManual(""); }} data-testid="button-card-barcode" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Barcode style={{ width: 22, height: 22, color: v.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: v.accent }}>{t("m2.solo.barcodeTitle", "Scan Barcode")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("m2.solo.barcodeDesc", "Camera or manual barcode entry")}</div>
              </div>
            </button>

            <button onClick={() => { setSheetView("none"); fileInputRef.current?.click(); }} data-testid="button-card-file" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Upload style={{ width: 22, height: 22, color: v.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: v.accent }}>{t("m2.solo.fileTitle", "Upload File")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("m2.solo.fileDesc", "Excel, CSV, PDF extraction")}</div>
              </div>
            </button>

            <button onClick={() => { setSheetView("none"); setShowManual(true); }} data-testid="button-card-manual" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <PenLine style={{ width: 22, height: 22, color: v.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: v.accent }}>{t("m2.solo.manualTitle", "Manual Entry")}</div>
                <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{t("m2.solo.manualDesc", "Type all details yourself")}</div>
              </div>
            </button>
          </div>

          <button onClick={() => setSheetView("none")} data-testid="button-close-picker" style={{ ...btnOutline, marginTop: 14, color: v.muted, fontSize: 13 }}>
            {t("common.cancel", "Cancel")}
          </button>
        </div>
      )}

      {sheetView === "identifying" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: v.card,
          borderTop: `1px solid ${v.border}`, borderRadius: "16px 16px 0 0",
          padding: "40px 20px 60px", zIndex: 100, textAlign: "center",
        }} data-testid="sheet-identifying">
          <div style={{ width: 32, height: 32, border: `3px solid ${v.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{t("m2.solo.identifying", "Identifying whisky...")}</p>
          <p style={{ fontSize: 12, color: v.muted }}>{t("m2.solo.identifyingDesc", "Analyzing your input")}</p>
        </div>
      )}

      {sheetView === "fileAnalyzing" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: v.card,
          borderTop: `1px solid ${v.border}`, borderRadius: "16px 16px 0 0",
          padding: "40px 20px 60px", zIndex: 100, textAlign: "center",
        }} data-testid="sheet-file-analyzing">
          <div style={{ width: 32, height: 32, border: `3px solid ${v.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>Analyzing file...</p>
        </div>
      )}

      {sheetView === "describe" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: v.card,
          borderTop: `1px solid ${v.border}`, borderRadius: "16px 16px 0 0",
          padding: "20px 20px 40px", zIndex: 100,
        }} data-testid="sheet-describe">
          <div style={{ width: 40, height: 4, background: v.border, borderRadius: 2, margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 4px" }}>
            {t("m2.solo.describeSheetTitle", "Describe the bottle")}
          </h3>
          <p style={{ fontSize: 12, color: v.muted, margin: "0 0 12px" }}>
            {t("m2.solo.describeSheetHint", "Type name, distillery, or anything on the label.")}
          </p>
          <textarea
            value={describeQuery}
            onChange={(e) => setDescribeQuery(e.target.value)}
            placeholder="Type whisky name / distillery / age ..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
            data-testid="input-describe-query"
            autoFocus
          />
          <button
            onClick={() => describeQuery.trim() && handleDescribeSubmit(describeQuery.trim())}
            disabled={describeLoading || !describeQuery.trim()}
            data-testid="button-find-matches"
            style={{ ...btnPrimary, opacity: !describeQuery.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {describeLoading ? "Searching..." : t("m2.solo.findMatches", "Find matches")}
          </button>
          <button onClick={() => setSheetView("none")} style={{ ...btnOutline, marginTop: 8, color: v.muted, fontSize: 13 }}>Cancel</button>
        </div>
      )}

      {sheetView === "candidates" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: v.card,
          borderTop: `1px solid ${v.border}`, borderRadius: "16px 16px 0 0",
          padding: "20px 20px 40px", zIndex: 100, maxHeight: "80vh", overflowY: "auto",
        }} data-testid="sheet-candidates">
          <div style={{ width: 40, height: 4, background: v.border, borderRadius: 2, margin: "0 auto 16px" }} />

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {photoUrl && (
              <img src={photoUrl} alt="Scanned" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: `1px solid ${v.border}` }} data-testid="img-scan-preview" />
            )}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: 0 }}>
                {candidates.length > 0 ? t("m2.solo.matchesFound", "Matches found") : t("m2.solo.noMatches", "No matches")}
              </h3>
              <p style={{ fontSize: 12, color: v.muted, margin: "2px 0 0" }}>
                {candidates.length > 0 ? t("m2.solo.selectMatch", "Select the best match") : t("m2.solo.tryAgain", "Try another method")}
              </p>
            </div>
          </div>

          {candidates.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {candidates.map((cand, i) => {
                const badge = confidenceLabel(cand.confidence);
                const isOnline = cand.source === "external";
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectCandidate(cand)}
                    data-testid={`button-candidate-${i}`}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "12px 14px",
                      background: i === 0 ? alpha(v.accent, "15") : "transparent",
                      border: `1px solid ${i === 0 ? v.accent : v.border}`,
                      borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{cand.name}</div>
                      <div style={{ fontSize: 12, color: v.muted }}>{cand.distillery}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isOnline ? "#6ba3d6" : badge.color, background: isOnline ? "#6ba3d620" : `${badge.color}20`, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                      {isOnline ? "Online" : badge.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {candidates.length === 0 && (
              <button onClick={handleCreateUnknown} data-testid="button-add-manually-sheet" style={btnPrimary}>Add manually</button>
            )}
            <button onClick={() => { setOnlineSearched(false); setOnlineCandidates([]); setOnlineError(""); setSheetView("onlineSearch"); }} data-testid="button-search-online" style={{ ...btnOutline, color: "#6ba3d6", borderColor: "#6ba3d640" }}>
              Search online (Beta)
            </button>
            <button onClick={handleRetake} data-testid="button-retake" style={btnOutline}>Try again</button>
            {candidates.length > 0 && (
              <button onClick={handleCreateUnknown} data-testid="button-add-manually-alt" style={{ ...btnOutline, color: v.mutedLight }}>Add manually</button>
            )}
          </div>
        </div>
      )}

      {sheetView === "onlineSearch" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: v.card,
          borderTop: `1px solid ${v.border}`, borderRadius: "16px 16px 0 0",
          padding: "20px 20px 40px", zIndex: 100, maxHeight: "80vh", overflowY: "auto",
        }} data-testid="sheet-online-search">
          <div style={{ width: 40, height: 4, background: v.border, borderRadius: 2, margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>Search online (Beta)</h3>
          <p style={{ fontSize: 12, color: v.muted, margin: "0 0 16px" }}>
            Searching for: <span style={{ color: v.text }}>{onlineQuery.substring(0, 60)}</span>
          </p>

          {!onlineSearched && (
            <button
              onClick={doOnlineSearch}
              disabled={onlineSearching}
              data-testid="button-run-online-search"
              style={{ ...btnPrimary, background: "#6ba3d6", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {onlineSearching ? "Searching..." : "Search now"}
            </button>
          )}

          {onlineSearched && onlineCandidates.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {onlineCandidates.map((cand, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectCandidate(cand)}
                  data-testid={`button-online-candidate-${i}`}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "12px 14px",
                    background: i === 0 ? alpha(v.accent, "15") : "transparent",
                    border: `1px solid ${i === 0 ? v.accent : v.border}`,
                    borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{cand.name}</div>
                    <div style={{ fontSize: 12, color: v.muted }}>{cand.distillery}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6ba3d6", background: "#6ba3d620", padding: "3px 8px", borderRadius: 6 }}>Online</span>
                </button>
              ))}
            </div>
          )}

          {onlineSearched && onlineError && (
            <p style={{ fontSize: 13, color: v.muted, textAlign: "center", margin: "12px 0" }}>{onlineError}</p>
          )}

          <button onClick={() => setSheetView("candidates")} style={{ ...btnOutline, marginTop: 8, color: v.muted, fontSize: 13 }}>
            Back
          </button>
        </div>
      )}

      {sheetView === "barcode" && (
        <div style={{
          position: "fixed", inset: 0, background: v.bg, zIndex: 101,
          display: "flex", flexDirection: "column",
        }} data-testid="sheet-barcode-scanner">
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: 0 }}>Scan Barcode</h3>
            <button onClick={() => setSheetView("none")} data-testid="button-close-barcode" style={{ background: "none", border: "none", color: v.muted, cursor: "pointer", fontSize: 14, fontFamily: "system-ui" }}>
              Cancel
            </button>
          </div>

          {barcodeStatus === "looking_up" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${v.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>Looking up...</p>
            </div>
          )}

          {(barcodeStatus === "scanning" || barcodeStatus === "camera_error") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <p style={{ fontSize: 13, color: v.muted, textAlign: "center", margin: "0 0 16px" }}>
                Enter the barcode number manually
              </p>
              <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320 }}>
                <input
                  type="text"
                  value={barcodeManual}
                  onChange={(e) => setBarcodeManual(e.target.value.replace(/\D/g, ""))}
                  placeholder="Barcode number..."
                  style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                  data-testid="input-barcode-manual"
                  inputMode="numeric"
                />
                <button
                  onClick={() => { if (barcodeManual.trim().length >= 8) lookupBarcode(barcodeManual.trim()); }}
                  disabled={barcodeManual.trim().length < 8}
                  data-testid="button-barcode-submit"
                  style={{ ...btnPrimary, width: "auto", padding: "10px 16px", fontSize: 13, opacity: barcodeManual.trim().length >= 8 ? 1 : 0.4 }}
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {barcodeStatus === "not_found" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
              <p style={{ fontSize: 40, margin: 0 }}>🔍</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>Not found: {barcodeError}</p>
              <button onClick={() => { setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; }} style={{ ...btnOutline, width: "auto", padding: "10px 24px", fontSize: 13 }}>Try again</button>
              <button onClick={() => setSheetView("none")} style={{ background: "none", border: "none", color: v.muted, cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>Cancel</button>
            </div>
          )}

          {barcodeStatus === "error" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
              <p style={{ fontSize: 40, margin: 0 }}>⚠️</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{barcodeError || "Error"}</p>
              <button onClick={() => { setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; }} style={{ ...btnOutline, width: "auto", padding: "10px 24px", fontSize: 13 }}>Try again</button>
              <button onClick={() => setSheetView("none")} style={{ background: "none", border: "none", color: v.muted, cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
      const result = await signIn({ pin: pin.trim(), name: name.trim() || undefined, mode: "log", remember });
      if (!result.ok) {
        setError(result.error || "Something went wrong.");
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
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px 20px 24px", marginBottom: 12 }} data-testid="card-unlock">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: v.text, margin: "0 0 12px" }}>Sign in to save</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
        <input type="text" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }} data-testid="input-unlock-name" autoComplete="off" />
        <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px", letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="new-password" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: v.mutedLight, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: v.accent }} data-testid="checkbox-remember" />
          Stay signed in
        </label>
        <button type="submit" disabled={loading || !pin.trim()} data-testid="button-unlock-submit" style={{ ...btnPrimary, fontSize: 14, padding: 12, opacity: !pin.trim() ? 0.5 : 1 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {error && <p style={{ fontSize: 12, color: v.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
      <button type="button" onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: v.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", width: "100%", textAlign: "center", marginTop: 10 }} data-testid="button-unlock-cancel">
        Cancel
      </button>
    </div>
  );
}
