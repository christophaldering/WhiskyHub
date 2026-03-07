import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession, useSession, signIn, setSessionPid } from "@/lib/session";
import { participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";
import {
  Camera, PenLine, Check, ChevronDown, Mic, Loader2, Search, Upload, FileText, Barcode, X, WifiOff, ArrowLeft
} from "lucide-react";
import M2RatingPanel from "@/components/m2/M2RatingPanel";
import type { DimKey } from "@/components/m2/M2RatingPanel";
import SoloVoiceMemoRecorder from "@/components/m2/SoloVoiceMemoRecorder";

const OFFLINE_QUEUE_KEY = "cs_offline_queue";

interface OfflineQueueItem {
  pid: string;
  body: Record<string, any>;
  timestamp: string;
}

function getOfflineQueue(): OfflineQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function addToOfflineQueue(item: OfflineQueueItem) {
  const queue = getOfflineQueue();
  queue.push(item);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function retryOfflineQueue(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;
  const remaining: OfflineQueueItem[] = [];
  for (const item of queue) {
    try {
      const res = await fetch(`/api/journal/${item.pid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (!res.ok) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  if (remaining.length < queue.length) {
    queryClient.invalidateQueries({ queryKey: ["journal"] });
  }
  return remaining.length;
}

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


const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

interface Candidate {
  name: string;
  distillery: string;
  confidence: number;
  whiskyId?: string;
  source?: "local" | "external" | "ai_vision" | "ai_text";
  externalUrl?: string;
  age?: string;
  abv?: string;
  caskType?: string;
  region?: string;
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

function confidenceLabel(conf: number, t?: (key: string, fallback: string) => string): { text: string; color: string } {
  const tr = t || ((k: string, f: string) => f);
  if (conf >= 0.78) return { text: tr("m2.solo.confidenceHigh", "High"), color: v.high };
  if (conf >= 0.55) return { text: tr("m2.solo.confidenceMedium", "Medium"), color: v.medium };
  return { text: tr("m2.solo.confidenceLow", "Low"), color: v.low };
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

  const [draftEntryId, setDraftEntryId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "resumePrompt" | "active" | "finalized">("idle");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [unknownAge, setUnknownAge] = useState("");
  const [unknownAbv, setUnknownAbv] = useState("");
  const [unknownCask, setUnknownCask] = useState("");
  const [unknownWbId, setUnknownWbId] = useState("");
  const [unknownPrice, setUnknownPrice] = useState("");
  const [wbLookupLoading, setWbLookupLoading] = useState(false);
  const [wbLookupResult, setWbLookupResult] = useState("");

  const [detailedScores, setDetailedScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50 });
  const [detailTouched, setDetailTouched] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  const [detailChips, setDetailChips] = useState<Record<DimKey, string[]>>({ nose: [], taste: [], finish: [], balance: [] });
  const [detailTexts, setDetailTexts] = useState<Record<DimKey, string>>({ nose: "", taste: "", finish: "", balance: "" });

  const [soloVoiceMemo, setSoloVoiceMemo] = useState<{ audioUrl: string | null; transcript: string; durationSeconds: number; localBlobUrl?: string } | null>(null);

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<DimKey | "notes" | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasSpeechAPI = !!SpeechRecognitionAPI;

  const [offlineCount, setOfflineCount] = useState(() => getOfflineQueue().length);

  useEffect(() => {
    const trySync = async () => {
      const remaining = await retryOfflineQueue();
      setOfflineCount(remaining);
    };
    trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, []);

  useEffect(() => {
    if (!unlocked || !pid) return;
    const checkDraft = async () => {
      try {
        const res = await fetch(`/api/journal/${pid}?status=draft`, {
          headers: { "x-participant-id": pid },
        });
        if (!res.ok) return;
        const drafts = await res.json();
        if (drafts.length > 0) {
          setDraftStatus("resumePrompt");
          setDraftEntryId(drafts[0].id);
          const d = drafts[0];
          localStorage.setItem("m2_draft_data", JSON.stringify(d));
        }
      } catch {}
    };
    checkDraft();
  }, [unlocked, pid]);

  const loadDraftIntoForm = useCallback(() => {
    try {
      const raw = localStorage.getItem("m2_draft_data");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.whiskyName) setWhiskyName(d.whiskyName);
      if (d.distillery) setDistillery(d.distillery);
      if (d.personalScore != null) setScore(d.personalScore);
      if (d.noseNotes) {
        const cleaned = d.noseNotes.replace(/\n\[SCORES\][\s\S]*$/, "").trim();
        setNotes(cleaned);
      }
      if (d.age) setUnknownAge(d.age);
      if (d.abv) setUnknownAbv(d.abv);
      if (d.caskType) setUnknownCask(d.caskType);
      if (d.whiskybaseId) setUnknownWbId(d.whiskybaseId);
      if (d.imageUrl) setPhotoUrl(d.imageUrl);
      setShowManual(true);
      setDraftStatus("active");
      localStorage.removeItem("m2_draft_data");
    } catch {}
  }, []);

  const buildScoresBlock = useCallback(() => {
    const hasChipsOrTexts = (["nose", "taste", "finish", "balance"] as DimKey[]).some(
      (d) => detailChips[d].length > 0 || detailTexts[d].trim()
    );
    if (!detailTouched && !hasChipsOrTexts) return "";
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
  }, [detailChips, detailTexts, detailTouched, detailedScores]);

  const buildDraftBodyRef = useRef<() => Record<string, any>>(() => ({}));
  buildDraftBodyRef.current = () => {
    const scoresBlock = buildScoresBlock();
    const body: Record<string, any> = {
      title: whiskyName.trim(),
      whiskyName: whiskyName.trim(),
      distillery: distillery.trim() || undefined,
      personalScore: score,
      noseNotes: (notes.trim() + scoresBlock).trim() || undefined,
      source: "casksense",
      imageUrl: photoUrl || undefined,
      status: "draft",
    };
    if (unknownAge.trim()) body.age = unknownAge.trim();
    if (unknownAbv.trim()) body.abv = unknownAbv.trim();
    if (unknownCask.trim()) body.caskType = unknownCask.trim();
    if (unknownWbId.trim()) body.whiskybaseId = unknownWbId.trim();
    if (soloVoiceMemo) {
      if (soloVoiceMemo.audioUrl) body.voiceMemoUrl = soloVoiceMemo.audioUrl;
      if (soloVoiceMemo.transcript) body.voiceMemoTranscript = soloVoiceMemo.transcript;
      if (soloVoiceMemo.durationSeconds) body.voiceMemoDuration = soloVoiceMemo.durationSeconds;
    }
    return body;
  };

  const buildDraftBody = () => buildDraftBodyRef.current();

  const draftEntryIdRef = useRef(draftEntryId);
  draftEntryIdRef.current = draftEntryId;

  const autoSaveDraft = useCallback(async () => {
    if (!unlocked || !pid || !whiskyName.trim()) return;
    setAutoSaveStatus("saving");
    try {
      const body = buildDraftBodyRef.current();
      const entryId = draftEntryIdRef.current;
      if (entryId) {
        const res = await fetch(`/api/journal/${pid}/${entryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-participant-id": pid },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        }
      } else {
        const res = await fetch(`/api/journal/${pid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-participant-id": pid },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setDraftEntryId(created.id);
          draftEntryIdRef.current = created.id;
          setDraftStatus("active");
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        }
      }
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [unlocked, pid, whiskyName]);

  useEffect(() => {
    if (draftStatus !== "active" && draftStatus !== "idle") return;
    if (!whiskyName.trim() || !unlocked || !pid) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveDraft();
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [whiskyName, distillery, score, notes, unknownAge, unknownAbv, unknownCask, unknownWbId, draftStatus, unlocked, pid]);

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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const barcodeProcessedRef = useRef(false);
  const barcodeScannerRef = useRef<any>(null);
  const barcodeVideoRef = useRef<HTMLDivElement>(null);

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


  const handleScoreChange = (val: number) => {
    if (detailTouched) {
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
          if (res.status === 429) throw new Error(t("m2.solo.tooManyRequests", "Too many requests. Please wait."));
          throw new Error(err.message || t("m2.solo.identificationFailed", "Identification failed."));
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
      setError(err?.message || t("m2.solo.identificationFailed", "Identification failed."));
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
      if (!res.ok) throw new Error(t("m2.solo.importFailed", "File import failed"));
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
        setError(t("m2.solo.noWhiskiesInFile", "No whiskies found in the uploaded file."));
        setSheetView("none");
      }
    } catch (err: any) {
      setError(err.message || t("m2.solo.importFailed", "File import failed"));
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
        if (res.status === 429) throw new Error(t("m2.solo.tooManyRequests", "Too many requests. Please wait."));
        throw new Error(err.message || t("m2.solo.searchFailed", "Search failed."));
      }
      const data: IdentifyResult = await res.json();
      setCandidates(data.candidates || []);
      setPhotoUrl("");
      setIsMenuMode(data.debug?.detectedMode === "menu");
      setLastResult(data);
      setOnlineQuery(data.debug?.ocrText || query);
      setSheetView("candidates");
    } catch (err: any) {
      setError(err?.message || t("m2.solo.searchFailed", "Search failed."));
      setSheetView("none");
    } finally {
      setDescribeLoading(false);
    }
  };

  const handleSelectCandidate = (cand: Candidate) => {
    setWhiskyName(cand.name);
    setDistillery(cand.distillery);
    if (cand.age) setUnknownAge(cand.age);
    if (cand.abv) setUnknownAbv(cand.abv);
    if (cand.caskType) setUnknownCask(cand.caskType);
    setSelectedCandidate(cand);
    setSheetView("none");
    setShowManual(true);
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
        setBarcodeStatus("error"); setBarcodeError(t("m2.solo.lookupFailed", "Lookup failed")); barcodeProcessedRef.current = false; return;
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
      setBarcodeError(t("m2.solo.connectionError", "Connection error"));
      barcodeProcessedRef.current = false;
    }
  }, [pid]);

  const stopBarcodeScanner = useCallback(async () => {
    const scanner = barcodeScannerRef.current;
    barcodeScannerRef.current = null;
    if (scanner) {
      try {
        const state = scanner.getState();
        if (state === 2) {
          await scanner.stop();
        }
        scanner.clear();
      } catch {}
    }
    setCameraActive(false);
  }, []);

  const startBarcodeScanner = useCallback(async () => {
    setCameraError("");
    setCameraActive(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await new Promise((r) => setTimeout(r, 150));
      if (!barcodeVideoRef.current) {
        setCameraError(t("m2.solo.cameraUnavailable", "Camera not available"));
        setCameraActive(false);
        return;
      }
      const scannerId = "m2-barcode-reader";
      let container = document.getElementById(scannerId);
      if (!container) {
        container = document.createElement("div");
        container.id = scannerId;
        barcodeVideoRef.current.appendChild(container);
      }
      const scanner = new Html5Qrcode(scannerId);
      barcodeScannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 2 },
        (decodedText: string) => {
          const cleaned = decodedText.replace(/\D/g, "");
          if (cleaned.length >= 8 && cleaned.length <= 14) {
            setBarcodeManual(cleaned);
            stopBarcodeScanner();
            lookupBarcode(cleaned);
          }
        },
        () => {}
      );
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setCameraError(t("m2.solo.cameraPermission", "Camera permission denied. Please allow camera access."));
      } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
        setCameraError(t("m2.solo.noCamera", "No camera found on this device."));
      } else {
        setCameraError(t("m2.solo.cameraFallback", "Camera not available — enter barcode manually."));
      }
      setCameraActive(false);
    }
  }, [t, lookupBarcode, stopBarcodeScanner]);

  useEffect(() => {
    if (sheetView !== "barcode") {
      stopBarcodeScanner();
    }
  }, [sheetView, stopBarcodeScanner]);

  useEffect(() => {
    return () => { stopBarcodeScanner(); };
  }, [stopBarcodeScanner]);

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
        if (res.status === 429) throw new Error(t("m2.solo.tooManyRequests", "Too many requests. Please wait."));
        throw new Error(t("m2.solo.onlineSearchFailed", "Online search failed"));
      }
      const data = await res.json();
      setOnlineCandidates(data.candidates || []);
      setOnlineSearched(true);
      if (data.candidates.length === 0) setOnlineError(t("m2.solo.noResultsOnline", "No results found online."));
    } catch (err: any) {
      setOnlineError(err?.message || t("m2.solo.onlineSearchFailed", "Online search failed"));
      setOnlineSearched(true);
    } finally {
      setOnlineSearching(false);
    }
  };


  const persistLocal = () => {
    try {
      const entry = {
        whiskyName: whiskyName.trim(),
        distillery: distillery.trim(),
        score,
        detailedScores: detailTouched ? { ...detailedScores } : undefined,
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

  const handleFinalize = async () => {
    if (!whiskyName.trim()) return;

    if (!unlocked || !pid) {
      persistLocal();
      setSaved(true);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = buildDraftBody();
      body.status = "final";

      if (draftEntryId) {
        const res = await fetch(`/api/journal/${pid}/${draftEntryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-participant-id": pid },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Finalize failed");
      } else {
        const res = await fetch(`/api/journal/${pid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-participant-id": pid },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Save failed");
        const created = await res.json();
        setDraftEntryId(created.id);
      }

      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setFinalizedAt(new Date().toLocaleString());
      setDraftStatus("finalized");
      setSaved(true);
    } catch {
      persistLocal();
      if (pid) {
        const body = buildDraftBody();
        body.status = "final";
        addToOfflineQueue({ pid, body, timestamp: new Date().toISOString() });
        setOfflineCount(getOfflineQueue().length);
      }
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
    setSoloVoiceMemo(null);
    stopVoice();
    setWbLookupResult("");
    setDraftEntryId(null);
    setDraftStatus("idle");
    setAutoSaveStatus("idle");
    setFinalizedAt(null);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
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

  if (draftStatus === "resumePrompt") {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-solo-page">
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: alpha(v.accent, "20"), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <PenLine style={{ width: 28, height: 28, color: v.accent }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: v.text, margin: "0 0 4px", fontFamily: "'Playfair Display', Georgia, serif" }} data-testid="text-resume-title">
            {t("m2.solo.resumeDraft", "Continue previous tasting?")}
          </h2>
          <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 28px" }} data-testid="text-resume-name">
            {(() => { try { const d = JSON.parse(localStorage.getItem("m2_draft_data") || "{}"); return d.whiskyName || ""; } catch { return ""; } })()}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={loadDraftIntoForm} style={btnPrimary} data-testid="button-resume-yes">
              {t("m2.solo.resumeYes", "Continue")}
            </button>
            <button onClick={() => {
              if (draftEntryId && pid) {
                fetch(`/api/journal/${pid}/${draftEntryId}`, { method: "DELETE", headers: { "x-participant-id": pid } }).catch(() => {});
              }
              localStorage.removeItem("m2_draft_data");
              setDraftEntryId(null);
              setDraftStatus("idle");
            }} style={btnOutline} data-testid="button-resume-no">
              {t("m2.solo.resumeNo", "Start new")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (saved && draftStatus === "finalized") {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-solo-page">
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: alpha(v.success, "20"), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check style={{ width: 28, height: 28, color: v.success }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: v.text, margin: "0 0 4px", fontFamily: "'Playfair Display', Georgia, serif" }} data-testid="text-saved-title">
            {t("m2.solo.finalized", "Tasting completed!")}
          </h2>
          <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 4px" }} data-testid="text-saved-name">{whiskyName}</p>
          {finalizedAt && (
            <p style={{ fontSize: 12, color: v.mutedLight, margin: "0 0 28px" }} data-testid="text-finalized-at">
              {t("m2.solo.finalizedAt", { defaultValue: "Completed on {{date}}", date: finalizedAt })}
            </p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset} style={btnPrimary} data-testid="m2-solo-again">
              {t("m2.solo.newDram", "Log new dram")}
            </button>
            {draftEntryId && (
              <Link href={`/m2/taste/drams?edit=${draftEntryId}`} style={{ flex: 1, textDecoration: "none" }}>
                <div style={{ ...btnOutline, textAlign: "center" }} data-testid="button-continue-editing">
                  {t("m2.solo.continueEditing", "Continue editing")}
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                {t("m2.solo.myDrams", "Drams")}
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
        {t("m2.solo.title", "Solo")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.solo.subtitle", "Log a whisky on your own — take notes, rate, and remember.")}
      </p>

      {offlineCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: alpha(v.accent, "12"),
            border: `1px solid ${alpha(v.accent, "40")}`,
            borderRadius: 10,
            padding: "8px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: v.accent,
          }}
          data-testid="text-offline-queue"
        >
          <WifiOff style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>{t("m2.solo.offlineSync", {defaultValue: "{{count}} dram(s) waiting to sync", count: offlineCount})}</span>
        </div>
      )}

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
                  {confidenceLabel(selectedCandidate.confidence, t).text} {t("m2.solo.match", "match")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setWhiskyName(""); setDistillery(""); setSelectedCandidate(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: v.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", textDecoration: "underline" }}
              data-testid="button-change-whisky"
            >
              {t("m2.solo.change", "Change")}
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
                  <span style={{ fontSize: 11, fontWeight: 500, color: v.accent, background: alpha(v.accent, "18"), padding: "3px 10px", borderRadius: 20 }}>✎ {t("m2.solo.manualEntry", "Manual entry")}</span>
                  <button type="button" onClick={() => setShowManual(false)} style={{ background: "none", border: "none", cursor: "pointer", color: v.muted, fontSize: 11, fontFamily: "system-ui, sans-serif" }} data-testid="button-hide-manual">{t("m2.solo.collapse", "Collapse")}</button>
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
                        {wbLookupResult === "collection" ? t("m2.solo.wbFromCollection", "✓ From collection") :
                         wbLookupResult === "ai" ? t("m2.solo.wbAiRecognized", "✓ AI recognized") :
                         wbLookupResult === "not_found" ? t("m2.solo.wbNotFound", "Not found") :
                         wbLookupResult === "rate_limit" ? t("m2.solo.wbRateLimit", "Rate limited, please wait") :
                         wbLookupResult === "ai_unavailable" ? t("m2.solo.wbAiUnavailable", "AI unavailable") :
                         wbLookupResult === "invalid" ? t("m2.solo.wbInvalidId", "Invalid ID") : t("m2.solo.wbError", "Error")}
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

        <M2RatingPanel
          scores={detailedScores}
          onScoreChange={handleDetailScoreChange}
          chips={detailChips}
          onChipToggle={handleToggleChip}
          texts={detailTexts}
          onTextChange={handleDetailTextChange}
          overall={score}
          onOverallChange={handleScoreChange}
          overallAuto={calcOverall(detailedScores)}
          overrideActive={overrideActive}
          onResetOverride={resetOverride}
          showToggle={true}
          defaultOpen={true}
        />
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
              paddingRight: hasSpeechAPI ? 80 : 14,
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
                position: "absolute", right: 8, top: 8,
                background: (voiceListening && voiceTarget === "notes") ? "#e57373" : "rgba(212,162,86,0.18)",
                border: `1px solid ${(voiceListening && voiceTarget === "notes") ? "#e57373" : "rgba(212,162,86,0.42)"}`,
                borderRadius: 999,
                cursor: "pointer",
                height: 30,
                padding: "0 10px",
                gap: 5,
                color: (voiceListening && voiceTarget === "notes") ? "#1a1410" : "#d4a256",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                boxShadow: (voiceListening && voiceTarget === "notes") ? "0 0 0 4px rgba(229,115,115,0.25)" : "0 2px 8px rgba(0,0,0,0.22)",
                transition: "all 200ms ease",
              }}
            >
              <Mic style={{ width: 13, height: 13 }} />
              <span>{t("m2.voiceMemo.speak", "Speak")}</span>
            </button>
          )}
        </div>
      </div>

      {/* VOICE MEMO */}
      {unlocked && pid && (
        <div style={{ marginBottom: 24 }} data-testid="section-solo-voice-memo">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: v.mutedLight, marginBottom: 10 }}>
            {t("m2.solo.voiceMemoLabel", "Voice Memo")}
          </div>
          <SoloVoiceMemoRecorder
            memo={soloVoiceMemo}
            onMemoChange={setSoloVoiceMemo}
            participantId={pid!}
          />
        </div>
      )}

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

      {autoSaveStatus !== "idle" && unlocked && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: autoSaveStatus === "saved" ? v.success : v.textSecondary,
          marginBottom: 6, justifyContent: "center",
        }} data-testid="text-auto-save-status">
          {autoSaveStatus === "saving" && <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />}
          {autoSaveStatus === "saving" ? t("m2.solo.autoSaving", "Saving...") : t("m2.solo.draftSaved", "Draft saved")}
        </div>
      )}

      <button
        onClick={handleFinalize}
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
        <Check style={{ width: 18, height: 18 }} />
        {saving ? t("m2.solo.saving", "Saving...") : t("m2.solo.finalize", "Finish tasting")}
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

            <button onClick={() => { setSheetView("barcode"); setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setBarcodeManual(""); setCameraError(""); setTimeout(() => startBarcodeScanner(), 200); }} data-testid="button-card-barcode" style={{ ...btnOutline, textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
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
          <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{t("m2.solo.analyzingFile", "Analyzing file...")}</p>
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
            placeholder={t("m2.solo.describePlaceholder", "Type whisky name / distillery / age ...")}
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
            {describeLoading ? t("m2.solo.searching", "Searching...") : t("m2.solo.findMatches", "Find matches")}
          </button>
          <button onClick={() => setSheetView("none")} style={{ ...btnOutline, marginTop: 8, color: v.muted, fontSize: 13 }}>{t("m2.solo.cancel", "Cancel")}</button>
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
                const badge = confidenceLabel(cand.confidence, t);
                const isOnline = cand.source === "external";
                const isAiVision = cand.source === "ai_vision" || cand.source === "ai_text";
                const details = [cand.age ? `${cand.age}y` : "", cand.abv || "", cand.caskType || ""].filter(Boolean).join(" · ");
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
                      {details && <div style={{ fontSize: 11, color: v.mutedLight, marginTop: 2 }}>{details}</div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isAiVision ? v.accent : isOnline ? "#6ba3d6" : badge.color, background: isAiVision ? alpha(v.accent, "18") : isOnline ? "#6ba3d620" : `${badge.color}20`, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                      {isAiVision ? t("m2.solo.aiIdentified", "AI identified") : isOnline ? t("m2.solo.online", "Online") : badge.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {candidates.length === 0 && (
              <button onClick={handleCreateUnknown} data-testid="button-add-manually-sheet" style={btnPrimary}>{t("m2.solo.addManually", "Add manually")}</button>
            )}
            <button onClick={() => { setOnlineSearched(false); setOnlineCandidates([]); setOnlineError(""); setSheetView("onlineSearch"); }} data-testid="button-search-online" style={{ ...btnOutline, color: "#6ba3d6", borderColor: "#6ba3d640" }}>
              {t("m2.solo.searchOnline", "Search online (Beta)")}
            </button>
            <button onClick={handleRetake} data-testid="button-retake" style={btnOutline}>{t("m2.solo.tryAgain", "Try again")}</button>
            {candidates.length > 0 && (
              <button onClick={handleCreateUnknown} data-testid="button-add-manually-alt" style={{ ...btnOutline, color: v.mutedLight }}>{t("m2.solo.addManually", "Add manually")}</button>
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
          <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>{t("m2.solo.searchOnline", "Search online (Beta)")}</h3>
          <p style={{ fontSize: 12, color: v.muted, margin: "0 0 16px" }}>
            {t("m2.solo.searchingFor", "Searching for:")} <span style={{ color: v.text }}>{onlineQuery.substring(0, 60)}</span>
          </p>

          {!onlineSearched && (
            <button
              onClick={doOnlineSearch}
              disabled={onlineSearching}
              data-testid="button-run-online-search"
              style={{ ...btnPrimary, background: "#6ba3d6", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {onlineSearching ? t("m2.solo.searching", "Searching...") : t("m2.solo.searchNow", "Search now")}
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
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6ba3d6", background: "#6ba3d620", padding: "3px 8px", borderRadius: 6 }}>{t("m2.solo.online", "Online")}</span>
                </button>
              ))}
            </div>
          )}

          {onlineSearched && onlineError && (
            <p style={{ fontSize: 13, color: v.muted, textAlign: "center", margin: "12px 0" }}>{onlineError}</p>
          )}

          <button onClick={() => setSheetView("candidates")} style={{ ...btnOutline, marginTop: 8, color: v.muted, fontSize: 13 }}>
            {t("m2.solo.back", "Back")}
          </button>
        </div>
      )}

      {sheetView === "barcode" && (
        <div style={{
          position: "fixed", inset: 0, background: v.bg, zIndex: 101,
          display: "flex", flexDirection: "column", paddingTop: 56,
        }} data-testid="sheet-barcode-scanner">
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${v.border}` }}>
            <button
              onClick={() => { stopBarcodeScanner(); setSheetView("none"); }}
              data-testid="button-close-barcode"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 14, color: v.accent, background: "none", border: "none",
                cursor: "pointer", padding: "8px 0", fontFamily: "system-ui, sans-serif", fontWeight: 500,
              }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2} />
              {t("common.back", "Zurück")}
            </button>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: 0 }}>{t("m2.solo.barcodeTitle", "Scan Barcode")}</h3>
            <div style={{ width: 60 }} />
          </div>

          {barcodeStatus === "looking_up" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${v.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{t("m2.solo.lookingUp", "Looking up...")}</p>
            </div>
          )}

          {(barcodeStatus === "scanning" || barcodeStatus === "camera_error") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 20 }}>
              <div
                ref={barcodeVideoRef}
                style={{
                  width: "100%", maxWidth: 400, margin: "0 auto",
                  aspectRatio: "4/3", borderRadius: 12, overflow: "hidden",
                  background: cameraActive ? "#000" : v.elevated,
                  border: `1px solid ${v.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                data-testid="barcode-camera-viewfinder"
              >
                {!cameraActive && !cameraError && (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} />
                    <p style={{ fontSize: 13, color: v.muted, marginTop: 8 }}>{t("m2.solo.startingCamera", "Starting camera...")}</p>
                  </div>
                )}
                {cameraError && (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Camera style={{ width: 32, height: 32, color: v.muted, marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>{cameraError}</p>
                  </div>
                )}
              </div>

              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: v.mutedLight, margin: "0 0 12px" }}>
                  {t("m2.solo.orManualEntry", "Or enter manually")}
                </p>
                <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320, margin: "0 auto" }}>
                  <input
                    type="text"
                    value={barcodeManual}
                    onChange={(e) => setBarcodeManual(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("m2.solo.barcodePlaceholder", "Barcode number...")}
                    style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                    data-testid="input-barcode-manual"
                    inputMode="numeric"
                  />
                  <button
                    onClick={() => { if (barcodeManual.trim().length >= 8) { stopBarcodeScanner(); lookupBarcode(barcodeManual.trim()); } }}
                    disabled={barcodeManual.trim().length < 8}
                    data-testid="button-barcode-submit"
                    style={{ ...btnPrimary, width: "auto", padding: "10px 16px", fontSize: 13, opacity: barcodeManual.trim().length >= 8 ? 1 : 0.4 }}
                  >
                    {t("m2.solo.search", "Search")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {barcodeStatus === "not_found" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20 }}>
              <p style={{ fontSize: 40, margin: 0 }}>🔍</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: v.text, textAlign: "center", margin: 0 }}>
                {t("m2.solo.barcodeNotInDb", "Barcode not in our database")}
              </p>
              <p style={{ fontSize: 12, color: v.muted, margin: 0, textAlign: "center" }}>
                {barcodeError}
              </p>
              <button
                onClick={() => { stopBarcodeScanner(); setSheetView("none"); setShowManual(true); }}
                style={{ ...btnPrimary, width: "auto", padding: "12px 28px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                data-testid="button-barcode-enter-manually"
              >
                ✎ {t("m2.solo.orEnterManually", "Or enter details manually")}
              </button>
              <button
                onClick={() => { setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setTimeout(() => startBarcodeScanner(), 200); }}
                style={{ background: "none", border: "none", color: v.muted, cursor: "pointer", fontSize: 13, fontFamily: "system-ui", textDecoration: "underline" }}
                data-testid="button-barcode-retry"
              >
                {t("m2.solo.tryAgain", "Try again")}
              </button>
            </div>
          )}

          {barcodeStatus === "error" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
              <p style={{ fontSize: 40, margin: 0 }}>⚠️</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{barcodeError || t("m2.solo.wbError", "Error")}</p>
              <button onClick={() => { setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setTimeout(() => startBarcodeScanner(), 200); }} style={{ ...btnOutline, width: "auto", padding: "10px 24px", fontSize: 13 }}>{t("m2.solo.tryAgain", "Try again")}</button>
              <button onClick={() => { stopBarcodeScanner(); setSheetView("none"); }} style={{ background: "none", border: "none", color: v.muted, cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>{t("m2.solo.cancel", "Cancel")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignInCard({ onSignedIn, onCancel }: { onSignedIn: (name: string, pid?: string) => void; onCancel: () => void }) {
  const { t } = useTranslation();
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
        setError(result.error || t("m2.solo.somethingWrong", "Something went wrong."));
        return;
      }
      const displayName = result.name || name.trim() || t("m2.solo.guest", "Guest");
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
      setError(err?.message || t("m2.solo.somethingWrong", "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px 20px 24px", marginBottom: 12 }} data-testid="card-unlock">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: v.text, margin: "0 0 12px" }}>{t("m2.solo.signInToSave", "Sign in to save")}</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
        <input type="text" placeholder={t("m2.solo.namePlaceholder", "Name (optional)")} value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }} data-testid="input-unlock-name" autoComplete="off" />
        <input type="password" placeholder={t("m2.solo.pinPlaceholder", "PIN")} value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px", letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="new-password" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: v.mutedLight, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: v.accent }} data-testid="checkbox-remember" />
          {t("m2.solo.staySignedIn", "Stay signed in")}
        </label>
        <button type="submit" disabled={loading || !pin.trim()} data-testid="button-unlock-submit" style={{ ...btnPrimary, fontSize: 14, padding: 12, opacity: !pin.trim() ? 0.5 : 1 }}>
          {loading ? t("m2.solo.signingIn", "Signing in…") : t("m2.solo.signIn", "Sign in")}
        </button>
        {error && <p style={{ fontSize: 12, color: v.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
      <button type="button" onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: v.mutedLight, fontSize: 12, fontFamily: "system-ui, sans-serif", width: "100%", textAlign: "center", marginTop: 10 }} data-testid="button-unlock-cancel">
        {t("m2.solo.cancel", "Cancel")}
      </button>
    </div>
  );
}
