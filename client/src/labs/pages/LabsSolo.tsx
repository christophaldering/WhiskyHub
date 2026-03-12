import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { getSession, signIn, setSessionPid } from "@/lib/session";
import { participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";
import {
  Camera, Check, ChevronDown, Mic, Loader2, Search, Upload, FileText, Barcode, X, WifiOff, ChevronLeft, Plus, Trash2, Clock, Wine, Save, ExternalLink, Star, Calendar
} from "lucide-react";
import LabsRatingPanel from "@/labs/components/LabsRatingPanel";
import type { DimKey } from "@/labs/components/LabsRatingPanel";
import LabsVoiceMemoRecorder from "@/labs/components/LabsVoiceMemoRecorder";

const OFFLINE_QUEUE_KEY = "cs_offline_queue";
const SOLO_DRAFT_KEY = "cs_solo_draft";

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
  if (conf >= 0.78) return { text: tr("m2.solo.confidenceHigh", "High"), color: "var(--labs-success)" };
  if (conf >= 0.55) return { text: tr("m2.solo.confidenceMedium", "Medium"), color: "var(--labs-accent)" };
  return { text: tr("m2.solo.confidenceLow", "Low"), color: "var(--labs-danger)" };
}

type SheetView = "none" | "describe" | "candidates" | "identifying" | "onlineSearch" | "barcode" | "fileAnalyzing";

export default function LabsSolo() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ratingSectionRef = useRef<HTMLDivElement>(null);
  const [acceptedBanner, setAcceptedBanner] = useState(false);

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
  const [soloView, setSoloView] = useState<"hub" | "capture" | "editor">("hub");
  const [captureSource, setCaptureSource] = useState<"hub" | "editor">("hub");
  const [hubDrafts, setHubDrafts] = useState<any[]>([]);
  const [hubCompleted, setHubCompleted] = useState<any[]>([]);
  const [hubLoading, setHubLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const [hubSearch, setHubSearch] = useState("");
  const [hubSort, setHubSort] = useState<"date-desc" | "date-asc" | "score-desc" | "score-asc" | "name-az">("date-desc");
  const [hubTimePeriod, setHubTimePeriod] = useState<"all" | "30d" | "3m" | "1y">("all");
  const [hubScoreRange, setHubScoreRange] = useState<"all" | "90+" | "80-89" | "70-79" | "<70">("all");

  const [showManual, setShowManual] = useState(false);
  const [unknownAge, setUnknownAge] = useState("");
  const [unknownAbv, setUnknownAbv] = useState("");
  const [unknownCask, setUnknownCask] = useState("");
  const [unknownRegion, setUnknownRegion] = useState("");
  const [unknownCountry, setUnknownCountry] = useState("");
  const [unknownPeatLevel, setUnknownPeatLevel] = useState("");
  const [unknownVintage, setUnknownVintage] = useState("");
  const [unknownBottler, setUnknownBottler] = useState("");
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

  const [photoUrl, setPhotoUrl] = useState("");
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

  const localDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localDraftRestoredRef = useRef(false);
  const formSnapshotRef = useRef({ whiskyName: "", distillery: "", unknownAge: "", unknownAbv: "", unknownCask: "", unknownRegion: "", unknownCountry: "", unknownPeatLevel: "", unknownVintage: "", unknownBottler: "", unknownPrice: "" });
  useEffect(() => { formSnapshotRef.current = { whiskyName, distillery, unknownAge, unknownAbv, unknownCask, unknownRegion, unknownCountry, unknownPeatLevel, unknownVintage, unknownBottler, unknownPrice }; });

  const saveLocalDraft = useCallback(() => {
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    localDraftTimerRef.current = setTimeout(() => {
      try {
        const draft = {
          whiskyName, distillery, score, notes,
          unknownAge, unknownAbv, unknownCask, unknownRegion, unknownCountry,
          unknownPeatLevel, unknownVintage, unknownBottler, unknownWbId, unknownPrice,
          photoUrl, showManual, detailedScores, detailTouched, overrideActive,
          detailChips, detailTexts,
          soloView, ts: Date.now(),
        };
        if (!whiskyName && !distillery && !unknownAge && !unknownAbv && !unknownCask && !unknownWbId && !unknownRegion && score === 50 && !notes) { localStorage.removeItem(SOLO_DRAFT_KEY); return; }
        localStorage.setItem(SOLO_DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    }, 500);
  }, [whiskyName, distillery, score, notes, unknownAge, unknownAbv, unknownCask, unknownRegion, unknownCountry, unknownPeatLevel, unknownVintage, unknownBottler, unknownWbId, unknownPrice, photoUrl, showManual, detailedScores, detailTouched, overrideActive, detailChips, detailTexts, soloView]);

  useEffect(() => {
    if ((soloView === "editor" || soloView === "capture") && draftStatus !== "finalized") saveLocalDraft();
  }, [saveLocalDraft, soloView, draftStatus]);

  useEffect(() => {
    if (localDraftRestoredRef.current) return;
    if (hubLoading) return;
    localDraftRestoredRef.current = true;
    if (draftEntryId) return;
    if (hubDrafts.length > 0) return;
    try {
      const raw = localStorage.getItem(SOLO_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (Date.now() - (d.ts || 0) > 7 * 24 * 60 * 60 * 1000) { localStorage.removeItem(SOLO_DRAFT_KEY); return; }
      if (d.whiskyName) setWhiskyName(d.whiskyName);
      if (d.distillery) setDistillery(d.distillery);
      if (d.score != null) setScore(d.score);
      if (d.notes) setNotes(d.notes);
      if (d.unknownAge) setUnknownAge(d.unknownAge);
      if (d.unknownAbv) setUnknownAbv(d.unknownAbv);
      if (d.unknownCask) setUnknownCask(d.unknownCask);
      if (d.unknownRegion) setUnknownRegion(d.unknownRegion);
      if (d.unknownCountry) setUnknownCountry(d.unknownCountry);
      if (d.unknownPeatLevel) setUnknownPeatLevel(d.unknownPeatLevel);
      if (d.unknownVintage) setUnknownVintage(d.unknownVintage);
      if (d.unknownBottler) setUnknownBottler(d.unknownBottler);
      if (d.unknownWbId) setUnknownWbId(d.unknownWbId);
      if (d.unknownPrice) setUnknownPrice(d.unknownPrice);
      if (d.photoUrl) setPhotoUrl(d.photoUrl);
      if (d.showManual) setShowManual(true);
      if (d.detailedScores) setDetailedScores(d.detailedScores);
      if (d.detailTouched) setDetailTouched(true);
      if (d.overrideActive) setOverrideActive(true);
      if (d.detailChips) setDetailChips(d.detailChips);
      if (d.detailTexts) setDetailTexts(d.detailTexts);
      if (d.soloView === "editor") setSoloView("editor");
    } catch {}
  }, [draftEntryId, hubLoading, hubDrafts.length]);

  const fetchHubDrafts = useCallback(async () => {
    if (!unlocked || !pid) { setHubLoading(false); return; }
    setHubLoading(true);
    try {
      const [draftsRes, completedRes] = await Promise.all([
        fetch(`/api/journal/${pid}?status=draft`, { headers: { "x-participant-id": pid } }),
        fetch(`/api/journal/${pid}?status=final`, { headers: { "x-participant-id": pid } }),
      ]);
      if (draftsRes.ok) {
        const drafts = await draftsRes.json();
        setHubDrafts([...drafts].sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
      } else { setHubDrafts([]); }
      if (completedRes.ok) {
        const completed = await completedRes.json();
        setHubCompleted([...completed].sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
      } else { setHubCompleted([]); }
    } catch {}
    setHubLoading(false);
  }, [unlocked, pid]);

  useEffect(() => { fetchHubDrafts(); }, [fetchHubDrafts]);

  const loadDraftIntoForm = useCallback((entry?: any) => {
    try {
      const d = entry || (() => { const raw = localStorage.getItem("m2_draft_data"); return raw ? JSON.parse(raw) : null; })();
      if (!d) return;
      setWhiskyName(d.whiskyName || "");
      setDistillery(d.distillery || "");
      setScore(d.personalScore != null ? d.personalScore : 50);
      setNotes("");
      setUnknownAge(d.age ? String(d.age) : "");
      setUnknownAbv(d.abv ? String(d.abv) : "");
      setUnknownCask(d.caskType || "");
      setUnknownWbId(d.whiskybaseId ? String(d.whiskybaseId) : "");
      setUnknownPrice(d.price ? String(d.price) : "");
      setPhotoUrl(d.imageUrl || "");
      setDetailedScores({ nose: 50, taste: 50, finish: 50, balance: 50 });
      setDetailTouched(false);
      setOverrideActive(false);
      setDetailChips({ nose: [], taste: [], finish: [], balance: [] });
      setDetailTexts({ nose: "", taste: "", finish: "", balance: "" });
      setSoloVoiceMemo(null);
      setCandidates([]);
      setSelectedCandidate(null);
      setIsMenuMode(false);
      setWbLookupResult("");
      setError("");

      if (d.noseNotes) {
        let cleaned = d.noseNotes;
        cleaned = cleaned.replace(/\[SCORES\]\s*Nose:\d+\s*Taste:\d+\s*Finish:\d+\s*Balance:\d+\s*\[\/SCORES\]/gi, "");
        for (const tag of ["NOSE", "TASTE", "FINISH", "BALANCE"]) {
          cleaned = cleaned.replace(new RegExp(`\\[${tag}\\]\\s*[\\s\\S]*?\\[\\/${tag}\\]`, "gi"), "");
        }
        cleaned = cleaned.trim();
        setNotes(cleaned);

        const scoresMatch = d.noseNotes.match(/\[SCORES\]\s*Nose:(\d+)\s*Taste:(\d+)\s*Finish:(\d+)\s*Balance:(\d+)\s*\[\/SCORES\]/);
        if (scoresMatch) {
          setDetailedScores({ nose: parseInt(scoresMatch[1]), taste: parseInt(scoresMatch[2]), finish: parseInt(scoresMatch[3]), balance: parseInt(scoresMatch[4]) });
          setDetailTouched(true);
        }

        const dims: DimKey[] = ["nose", "taste", "finish", "balance"];
        const restoredChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
        const restoredTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };
        for (const dim of dims) {
          const tag = dim.toUpperCase();
          const dimMatch = d.noseNotes.match(new RegExp(`\\[${tag}\\]\\s*(.+?)\\s*\\[\\/${tag}\\]`));
          if (dimMatch) {
            const content = dimMatch[1];
            const parts = content.split(" — ");
            if (parts.length >= 2) {
              restoredChips[dim] = parts[0].split(",").map((c: string) => c.trim()).filter(Boolean);
              restoredTexts[dim] = parts[1];
            } else if (parts[0].includes(",")) {
              restoredChips[dim] = parts[0].split(",").map((c: string) => c.trim()).filter(Boolean);
            } else {
              restoredTexts[dim] = parts[0];
            }
          }
        }
        if (dims.some(dim => restoredChips[dim].length > 0 || restoredTexts[dim])) {
          setDetailChips(restoredChips);
          setDetailTexts(restoredTexts);
        }
      }

      if (d.voiceMemoUrl || d.voiceMemoTranscript) {
        setSoloVoiceMemo({
          audioUrl: d.voiceMemoUrl || null,
          transcript: d.voiceMemoTranscript || "",
          durationSeconds: d.voiceMemoDuration || 0,
        });
      }
      setShowManual(true);
      setDraftEntryId(d.id);
      draftEntryIdRef.current = d.id;
      setDraftStatus("active");
      setLastSavedTime(d.updatedAt || d.createdAt || null);
      setSoloView("editor");
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
    if (unknownRegion.trim()) body.region = unknownRegion.trim();
    if (unknownCountry.trim()) body.country = unknownCountry.trim();
    if (unknownPeatLevel.trim()) body.peatLevel = unknownPeatLevel.trim();
    if (unknownVintage.trim()) body.vintage = unknownVintage.trim();
    if (unknownBottler.trim()) body.bottler = unknownBottler.trim();
    if (unknownWbId.trim()) body.whiskybaseId = unknownWbId.trim();
    if (unknownPrice.trim()) body.price = unknownPrice.trim();
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
  const draftStatusRef = useRef(draftStatus);
  draftStatusRef.current = draftStatus;

  const autoSaveDraft = useCallback(async () => {
    if (!unlocked || !pid || !whiskyName.trim()) return;
    if (draftStatusRef.current === "finalized") return;
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
          setLastSavedTime(new Date().toISOString());
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
          setLastSavedTime(new Date().toISOString());
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
    autoSaveTimerRef.current = setTimeout(() => { autoSaveDraft(); }, 2000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [whiskyName, distillery, score, notes, unknownAge, unknownAbv, unknownCask, unknownWbId, draftStatus, unlocked, pid, photoUrl, detailedScores.nose, detailedScores.taste, detailedScores.finish, detailedScores.balance, soloVoiceMemo?.audioUrl, soloVoiceMemo?.transcript, soloVoiceMemo?.durationSeconds,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(detailChips), JSON.stringify(detailTexts)]);

  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sheetView, setSheetView] = useState<SheetView>("none");
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

  const [previousRatings, setPreviousRatings] = useState<{ date: string; tastingTitle: string; source: string; nose: number; taste: number; finish: number; balance: number; overall: number }[]>([]);
  const [prevRatingsExpanded, setPrevRatingsExpanded] = useState(false);
  const [matchedWhiskyRegion, setMatchedWhiskyRegion] = useState("");
  const [matchedWhiskyCountry, setMatchedWhiskyCountry] = useState("");

  const fetchPreviousRatings = useCallback(async (whiskyId: string, whiskyNameForJournal?: string) => {
    if (!pid) { setPreviousRatings([]); return; }
    try {
      const prev: typeof previousRatings = [];
      const fetches: Promise<void>[] = [];
      if (whiskyId) {
        fetches.push(
          fetch(`/api/participants/${pid}/tasting-history`, { headers: { "x-participant-id": pid } })
            .then(r => r.ok ? r.json() : [])
            .then((history: any[]) => {
              for (const tasting of history) {
                for (const w of tasting.whiskies || []) {
                  if (w.id === whiskyId && w.myRating) {
                    prev.push({ date: tasting.date || "", tastingTitle: tasting.title || "", source: "tasting", nose: w.myRating.nose, taste: w.myRating.taste, finish: w.myRating.finish, balance: w.myRating.balance, overall: w.myRating.overall });
                  }
                }
              }
            })
        );
      }
      if (whiskyNameForJournal) {
        fetches.push(
          fetch(`/api/journal/${pid}?status=final`, { headers: { "x-participant-id": pid } })
            .then(r => r.ok ? r.json() : [])
            .then((entries: any[]) => {
              const nameNorm = whiskyNameForJournal.trim().toLowerCase();
              for (const e of entries) {
                if ((e.whiskyName || e.title || "").trim().toLowerCase() === nameNorm && e.personalScore != null) {
                  prev.push({ date: e.createdAt || e.updatedAt || "", tastingTitle: e.title || "Solo dram", source: "journal", nose: 0, taste: 0, finish: 0, balance: 0, overall: Math.round(e.personalScore) });
                }
              }
            })
        );
      }
      await Promise.all(fetches);
      prev.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPreviousRatings(prev);
      if (prev.length > 0) setPrevRatingsExpanded(true);
    } catch { setPreviousRatings([]); }
  }, [pid]);

  const calcOverall = (scores: typeof detailedScores) =>
    Math.round((scores.nose + scores.taste + scores.finish + scores.balance) / 4);

  const lookupWhiskybaseId = useCallback(async (wbId: string) => {
    const id = wbId.trim().replace(/^[Ww][Bb]\s*/i, "");
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
      const cur = formSnapshotRef.current;
      if (data.name && !cur.whiskyName) setWhiskyName(data.name);
      if (data.distillery && !cur.distillery) setDistillery(data.distillery);
      if (data.age && !cur.unknownAge) setUnknownAge(String(data.age));
      if (data.abv && !cur.unknownAbv) setUnknownAbv(data.abv);
      if (data.caskType && !cur.unknownCask) setUnknownCask(data.caskType);
      if (data.price && !cur.unknownPrice) setUnknownPrice(data.price);
      if (data.region) { setMatchedWhiskyRegion(data.region); if (!cur.unknownRegion) setUnknownRegion(data.region); }
      if (data.country) { setMatchedWhiskyCountry(data.country); if (!cur.unknownCountry) setUnknownCountry(data.country); }
      if (data.peatLevel && !cur.unknownPeatLevel) setUnknownPeatLevel(data.peatLevel);
      if (data.vintage && !cur.unknownVintage) setUnknownVintage(String(data.vintage));
      if (data.bottler && !cur.unknownBottler) setUnknownBottler(data.bottler);
      setWbLookupResult(data.source === "collection" ? "collection" : "ai");
      if (data.name && pid) fetchPreviousRatings("", data.name || cur.whiskyName);
    } catch {
      setWbLookupResult("error");
    } finally {
      setWbLookupLoading(false);
    }
  }, [pid, wbLookupLoading, fetchPreviousRatings]);

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setVoiceListening(false);
    setVoiceTarget(null);
  }, []);

  const startVoice = useCallback((target: DimKey | "notes") => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
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
    if (voiceListening && voiceTarget === target) { stopVoice(); } else { startVoice(target); }
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
    if (detailTouched) setOverrideActive(true);
    setScore(val);
  };

  const handleDetailScoreChange = (key: DimKey, val: number) => {
    const next = { ...detailedScores, [key]: val };
    setDetailedScores(next);
    setDetailTouched(true);
    if (!overrideActive) setScore(calcOverall(next));
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
        const p = getSession().pid;
        const res = await fetch("/api/whisky/identify", { method: "POST", body: formData, headers: p ? { "x-participant-id": p } : {} });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 429) {
            const mins = Math.ceil((err.retryAfter || 180) / 60);
            throw new Error(t("m2.solo.tooManyRequests", "Limit reached — try again in {{minutes}} min.", { minutes: mins }));
          }
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
        if (soloView === "capture") setSoloView("editor");
      } else {
        setError(t("m2.solo.noWhiskiesInFile", "No whiskies found in the uploaded file."));
        setSheetView("none");
        if (soloView === "capture") setSoloView("editor");
      }
    } catch (err: any) {
      setError(err.message || t("m2.solo.importFailed", "File import failed"));
      setSheetView("none");
      if (soloView === "capture") setSoloView("editor");
    }
  };

  const handleDescribeSubmit = async (query: string) => {
    setDescribeLoading(true);
    setSheetView("identifying");
    setError("");
    try {
      const p = getSession().pid;
      const res = await fetch("/api/whisky/identify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(p ? { "x-participant-id": p } : {}) },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const mins = Math.ceil((err.retryAfter || 180) / 60);
          throw new Error(t("m2.solo.tooManyRequests", "Limit reached — try again in {{minutes}} min.", { minutes: mins }));
        }
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
    setMatchedWhiskyRegion(""); setMatchedWhiskyCountry("");
    setUnknownRegion(""); setUnknownCountry(""); setUnknownPeatLevel(""); setUnknownVintage(""); setUnknownBottler("");
    if (cand.age) setUnknownAge(cand.age);
    if (cand.abv) setUnknownAbv(cand.abv);
    if (cand.caskType) setUnknownCask(cand.caskType);
    if (cand.region) { setMatchedWhiskyRegion(cand.region); setUnknownRegion(cand.region); }
    setSelectedCandidate(cand);
    setSheetView("none");
    setShowManual(true);
    setAcceptedBanner(true);
    setTimeout(() => setAcceptedBanner(false), 3500);
    setTimeout(() => { ratingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
    if (cand.whiskyId) {
      fetchPreviousRatings(cand.whiskyId, cand.name);
      fetch(`/api/labs/explore/whiskies/${cand.whiskyId}`, { headers: pid ? { "x-participant-id": pid } : {} })
        .then(r => r.ok ? r.json() : null)
        .then(w => {
          if (!w) return;
          if (w.region && !cand.region) { setMatchedWhiskyRegion(w.region); setUnknownRegion(w.region); }
          if (w.country) { setMatchedWhiskyCountry(w.country); setUnknownCountry(w.country); }
          if (w.age && !cand.age) setUnknownAge(String(w.age));
          if (w.abv && !cand.abv) setUnknownAbv(String(w.abv));
          if (w.caskInfluence && !cand.caskType) setUnknownCask(w.caskInfluence);
          if (w.peatLevel) setUnknownPeatLevel(w.peatLevel);
          if (w.vintage) setUnknownVintage(String(w.vintage));
          if (w.bottler) setUnknownBottler(w.bottler);
        })
        .catch(() => {});
    } else {
      setPreviousRatings([]);
    }
  };

  const handleCreateUnknown = () => {
    setSheetView("none");
    setShowManual(true);
    setWhiskyName("");
    setDistillery("");
    setSelectedCandidate(null);
  };

  const handleRetake = () => {
    setCaptureSource("editor");
    setSoloView("capture");
    setSheetView("none");
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
      setMatchedWhiskyRegion(""); setMatchedWhiskyCountry("");
      setUnknownRegion(""); setUnknownCountry(""); setUnknownPeatLevel(""); setUnknownVintage(""); setUnknownBottler("");
      if (data.age) setUnknownAge(String(data.age));
      if (data.abv) setUnknownAbv(data.abv);
      if (data.caskType) setUnknownCask(data.caskType);
      if (data.region) { setMatchedWhiskyRegion(data.region); setUnknownRegion(data.region); }
      if (data.country) { setMatchedWhiskyCountry(data.country); setUnknownCountry(data.country); }
      if (data.peatLevel) setUnknownPeatLevel(data.peatLevel);
      if (data.vintage) setUnknownVintage(String(data.vintage));
      if (data.bottler) setUnknownBottler(data.bottler);
      if (data.whiskybaseId) setUnknownWbId(String(data.whiskybaseId));
      if (data.price) setUnknownPrice(String(data.price));
      setShowManual(true);
      setSheetView("none");
      if (data.whiskyId && pid) {
        fetchPreviousRatings(data.whiskyId, data.name);
        fetch(`/api/labs/explore/whiskies/${data.whiskyId}`, { headers: { "x-participant-id": pid } })
          .then(r => r.ok ? r.json() : null)
          .then(w => {
            if (!w) return;
            if (w.region && !data.region) setMatchedWhiskyRegion(w.region);
            if (w.country && !data.country) setMatchedWhiskyCountry(w.country);
          }).catch(() => {});
      } else if (data.name && pid) {
        fetchPreviousRatings("", data.name);
      }
    } catch {
      setBarcodeStatus("error");
      setBarcodeError(t("m2.solo.connectionError", "Connection error"));
      barcodeProcessedRef.current = false;
    }
  }, [pid, fetchPreviousRatings]);

  const stopBarcodeScanner = useCallback(async () => {
    const scanner = barcodeScannerRef.current;
    barcodeScannerRef.current = null;
    if (scanner) {
      try {
        const state = scanner.getState();
        if (state === 2) await scanner.stop();
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
      const scannerId = "labs-barcode-reader";
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
    if (sheetView !== "barcode") { stopBarcodeScanner(); return; }
    if (soloView !== "editor") return;
    if (barcodeStatus !== "scanning") return;
    if (cameraActive || barcodeScannerRef.current) return;
    let cancelled = false;
    let attempt = 0;
    const tryStart = () => {
      if (cancelled) return;
      if (barcodeVideoRef.current) { startBarcodeScanner(); }
      else if (attempt < 10) { attempt++; setTimeout(tryStart, 100); }
    };
    tryStart();
    return () => { cancelled = true; };
  }, [sheetView, soloView, barcodeStatus, cameraActive, stopBarcodeScanner, startBarcodeScanner]);

  useEffect(() => { return () => { stopBarcodeScanner(); }; }, [stopBarcodeScanner]);

  const doOnlineSearch = async () => {
    setOnlineSearching(true);
    setOnlineError("");
    try {
      const p = getSession().pid;
      const res = await fetch("/api/whisky/identify-online", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(p ? { "x-participant-id": p } : {}) },
        body: JSON.stringify({ query: onlineQuery }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          const mins = Math.ceil((body.retryAfter || 180) / 60);
          throw new Error(t("m2.solo.tooManyRequests", "Limit reached — try again in {{minutes}} min.", { minutes: mins }));
        }
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
        region: unknownRegion,
        country: unknownCountry,
        peatLevel: unknownPeatLevel,
        vintage: unknownVintage,
        bottler: unknownBottler,
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
    if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
    if (!unlocked || !pid) { persistLocal(); setSaved(true); return; }
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
      try { localStorage.removeItem(SOLO_DRAFT_KEY); } catch {}
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

  const handleReset = (goToHub = false) => {
    setWhiskyName(""); setDistillery(""); setScore(50); setNotes(""); setSaved(false);
    setError(""); setShowManual(false);
    setUnknownAge(""); setUnknownAbv(""); setUnknownCask(""); setUnknownRegion(""); setUnknownCountry("");
    setUnknownPeatLevel(""); setUnknownVintage(""); setUnknownBottler(""); setUnknownWbId(""); setUnknownPrice("");
    setPhotoUrl(""); setCandidates([]); setSelectedCandidate(null); setIsMenuMode(false);
    setDetailedScores({ nose: 50, taste: 50, finish: 50, balance: 50 });
    setDetailTouched(false); setOverrideActive(false);
    setDetailChips({ nose: [], taste: [], finish: [], balance: [] });
    setDetailTexts({ nose: "", taste: "", finish: "", balance: "" });
    setSoloVoiceMemo(null); stopVoice(); setWbLookupResult("");
    setPreviousRatings([]); setPrevRatingsExpanded(false);
    setMatchedWhiskyRegion(""); setMatchedWhiskyCountry("");
    setDraftEntryId(null); setDraftStatus("idle"); setAutoSaveStatus("idle");
    setFinalizedAt(null); setLastSavedTime(null); setDeleteConfirmId(null);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try { localStorage.removeItem(SOLO_DRAFT_KEY); } catch {}
    if (goToHub) { setSoloView("hub"); fetchHubDrafts(); }
  };

  const handleManualSave = useCallback(() => {
    if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
    autoSaveDraft();
  }, [autoSaveDraft]);

  const handleDeleteDraft = async (entryId: string) => {
    if (!pid) return;
    try {
      await fetch(`/api/journal/${pid}/${entryId}`, { method: "DELETE", headers: { "x-participant-id": pid } });
    } catch {}
    setDeleteConfirmId(null);
    if (draftEntryId === entryId) { handleReset(true); } else { fetchHubDrafts(); }
  };

  const handleBackToHub = () => { handleReset(true); };

  const handleUnlocked = (name: string, participantId?: string) => {
    setUnlocked(true);
    setShowUnlockPanel(false);
    if (participantId) {
      setPid(participantId);
      setParticipant({ id: participantId, name, role: "participant" });
    }
  };

  const hasWhisky = !!(whiskyName.trim() && (selectedCandidate || showManual));

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("m2.solo.lastSaved", { defaultValue: "Saved {{time}}", time: "just now" });
    if (mins < 60) return t("m2.solo.lastSaved", { defaultValue: "Saved {{time}}", time: `${mins}m ago` });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("m2.solo.lastSaved", { defaultValue: "Saved {{time}}", time: `${hours}h ago` });
    return t("m2.solo.lastSaved", { defaultValue: "Saved {{time}}", time: new Date(isoString).toLocaleDateString() });
  };

  const hiddenFileInputs = (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraChange} style={{ display: "none" }} data-testid="input-camera" />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple onChange={handleUploadChange} style={{ display: "none" }} data-testid="input-upload" />
      <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.pdf,.docx,text/csv" onChange={handleFileUpload} style={{ display: "none" }} data-testid="input-file-upload" />
    </>
  );

  const renderCandidateButton = (cand: Candidate, i: number, prefix = "", onClick?: () => void) => {
    const badge = confidenceLabel(cand.confidence, t);
    const isOnline = cand.source === "external";
    const isAiVision = cand.source === "ai_vision" || cand.source === "ai_text";
    const details = [cand.age ? `${cand.age}y` : "", cand.abv || "", cand.caskType || ""].filter(Boolean).join(" · ");
    return (
      <button
        key={i}
        onClick={onClick || (() => handleSelectCandidate(cand))}
        data-testid={`button-${prefix}candidate-${i}`}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          width: "100%", padding: "12px 14px",
          background: i === 0 ? "var(--labs-accent-muted)" : "transparent",
          border: `1px solid ${i === 0 ? "var(--labs-accent)" : "var(--labs-border)"}`,
          borderRadius: "var(--labs-radius-sm)", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{cand.name}</div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{cand.distillery}</div>
          {details && <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>{details}</div>}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: isAiVision ? "var(--labs-accent)" : isOnline ? "var(--labs-info)" : badge.color,
          background: isAiVision ? "var(--labs-accent-muted)" : isOnline ? "var(--labs-info-muted)" : `color-mix(in srgb, ${badge.color} 20%, transparent)`,
          padding: "3px 8px", borderRadius: 6, flexShrink: 0,
        }}>
          {isAiVision ? t("m2.solo.aiIdentified", "AI identified") : isOnline ? t("m2.solo.online", "Online") : badge.text}
        </span>
      </button>
    );
  };

  const sheetBackdrop = sheetView !== "none" && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }} onClick={() => setSheetView("none")} />
  );

  const renderIdentifyingSheet = (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--labs-surface)",
      borderTop: "1px solid var(--labs-border)", borderRadius: "16px 16px 0 0",
      padding: "40px 20px 60px", zIndex: 100, textAlign: "center",
    }} data-testid="sheet-identifying">
      <div style={{ width: 32, height: 32, border: "3px solid var(--labs-accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{t("m2.solo.identifying", "Identifying whisky...")}</p>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{t("m2.solo.identifyingDesc", "Analyzing your input")}</p>
    </div>
  );

  const renderFileAnalyzingSheet = (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--labs-surface)",
      borderTop: "1px solid var(--labs-border)", borderRadius: "16px 16px 0 0",
      padding: "40px 20px 60px", zIndex: 100, textAlign: "center",
    }} data-testid="sheet-file-analyzing">
      <div style={{ width: 32, height: 32, border: "3px solid var(--labs-accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{t("m2.solo.analyzingFile", "Analyzing file...")}</p>
    </div>
  );

  const renderOnlineSearchSheet = (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--labs-surface)",
      borderTop: "1px solid var(--labs-border)", borderRadius: "16px 16px 0 0",
      padding: "20px 20px 40px", zIndex: 100, maxHeight: "80vh", overflowY: "auto",
    }} data-testid="sheet-online-search">
      <div style={{ width: 40, height: 4, background: "var(--labs-border)", borderRadius: 2, margin: "0 auto 16px" }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 8px" }}>{t("m2.solo.searchOnline", "Search online (Beta)")}</h3>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
        {t("m2.solo.searchingFor", "Searching for:")} <span style={{ color: "var(--labs-text)" }}>{onlineQuery.substring(0, 60)}</span>
      </p>
      {!onlineSearched && (
        <button onClick={doOnlineSearch} disabled={onlineSearching} data-testid="button-run-online-search" className="labs-btn-primary" style={{ width: "100%", background: "var(--labs-info)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {onlineSearching ? t("m2.solo.searching", "Searching...") : t("m2.solo.searchNow", "Search now")}
        </button>
      )}
      {onlineSearched && onlineCandidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {onlineCandidates.map((cand, i) => renderCandidateButton(cand, i, "online-"))}
        </div>
      )}
      {onlineSearched && onlineError && (
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", textAlign: "center", margin: "12px 0" }}>{onlineError}</p>
      )}
      <button onClick={() => setSheetView("candidates")} className="labs-btn-secondary" style={{ width: "100%", marginTop: 8, fontSize: 13 }}>
        {t("m2.solo.back", "Back")}
      </button>
    </div>
  );

  const renderCandidatesSheet = (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--labs-surface)",
      borderTop: "1px solid var(--labs-border)", borderRadius: "16px 16px 0 0",
      padding: "20px 20px 40px", zIndex: 100, maxHeight: "80vh", overflowY: "auto",
    }} data-testid="sheet-candidates">
      <div style={{ width: 40, height: 4, background: "var(--labs-border)", borderRadius: 2, margin: "0 auto 16px" }} />
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {photoUrl && (
          <img src={photoUrl} alt="Scanned" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--labs-border)" }} data-testid="img-scan-preview" />
        )}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
            {candidates.length > 0 ? t("m2.solo.matchesFound", "Matches found") : t("m2.solo.noMatches", "No matches")}
          </h3>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>
            {candidates.length > 0 ? t("m2.solo.selectMatch", "Select the best match") : t("m2.solo.tryAgain", "Try another method")}
          </p>
        </div>
      </div>
      {candidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {candidates.map((cand, i) => renderCandidateButton(cand, i))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.length === 0 && (
          <button onClick={handleCreateUnknown} data-testid="button-add-manually-sheet" className="labs-btn-primary" style={{ width: "100%" }}>{t("m2.solo.addManually", "Add manually")}</button>
        )}
        <button onClick={() => { setOnlineSearched(false); setOnlineCandidates([]); setOnlineError(""); setSheetView("onlineSearch"); }} data-testid="button-search-online" className="labs-btn-secondary" style={{ width: "100%", color: "var(--labs-info)", borderColor: "var(--labs-info-muted)" }}>
          {t("m2.solo.searchOnline", "Search online (Beta)")}
        </button>
        <button onClick={handleRetake} data-testid="button-retake" className="labs-btn-secondary" style={{ width: "100%" }}>{t("m2.solo.tryAgain", "Try again")}</button>
        {candidates.length > 0 && (
          <button onClick={handleCreateUnknown} data-testid="button-add-manually-alt" className="labs-btn-ghost" style={{ width: "100%" }}>{t("m2.solo.addManually", "Add manually")}</button>
        )}
      </div>
    </div>
  );

  if (soloView === "capture") {
    return (
      <div className="labs-fade-in" style={{ padding: "16px", minHeight: "100dvh", display: "flex", flexDirection: "column" }} data-testid="labs-solo-capture">
        {hiddenFileInputs}
        <button
          onClick={() => setSoloView(captureSource)}
          className="labs-btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", marginBottom: 12, justifyContent: "flex-start" }}
          data-testid="button-capture-back"
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          {t("m2.common.back", "Back")}
        </button>

        {error && (
          <div style={{ background: "var(--labs-danger-muted)", border: "1px solid var(--labs-danger)", borderRadius: "var(--labs-radius-sm)", padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <X style={{ width: 16, height: 16, color: "var(--labs-danger)", flexShrink: 0, cursor: "pointer" }} onClick={() => setError("")} />
            <span style={{ fontSize: 13, color: "var(--labs-danger)" }}>{error}</span>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 400, width: "100%", margin: "0 auto" }}>
          <h1 className="labs-serif" style={{ fontSize: 26, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 6px", textAlign: "center" }}>
            {t("m2.solo.captureTitle", "What are you tasting?")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: 32, textAlign: "center", lineHeight: 1.5 }}>
            {t("m2.solo.captureSubtitle", "Start with a photo — or choose another method.")}
          </p>

          <button
            onClick={() => cameraInputRef.current?.click()}
            style={{
              width: "100%", padding: "28px 20px", borderRadius: "var(--labs-radius-lg)",
              background: "linear-gradient(135deg, var(--labs-accent), color-mix(in srgb, var(--labs-accent) 80%, black))",
              border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 10, marginBottom: 20,
              boxShadow: "0 4px 20px color-mix(in srgb, var(--labs-accent) 25%, transparent)",
            }}
            data-testid="button-capture-photo"
          >
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera style={{ width: 28, height: 28, color: "var(--labs-on-accent)" }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--labs-on-accent)", letterSpacing: "0.02em" }}>
              {t("m2.solo.capturePhotoTitle", "Take Photo")}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 400 }}>
              {t("m2.solo.capturePhotoDesc", "AI identifies the whisky automatically")}
            </div>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
            {[
              { onClick: () => uploadInputRef.current?.click(), icon: <Upload style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />, label: t("m2.solo.captureGallery", "Gallery"), testId: "button-capture-gallery" },
              { onClick: () => { setSoloView("editor"); setSheetView("barcode"); setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setBarcodeManual(""); setCameraError(""); }, icon: <Barcode style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />, label: t("m2.solo.captureBarcode", "Barcode"), testId: "button-capture-barcode" },
              { onClick: () => { setSoloView("editor"); setSheetView("describe"); setDescribeQuery(""); }, icon: <FileText style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />, label: t("m2.solo.captureDescribe", "Describe"), testId: "button-capture-describe" },
              { onClick: () => fileInputRef.current?.click(), icon: <FileText style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />, label: t("m2.solo.captureImport", "Import"), testId: "button-capture-file" },
            ].map((item) => (
              <button
                key={item.testId}
                onClick={item.onClick}
                className="labs-card labs-card-interactive"
                style={{ padding: "18px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                data-testid={item.testId}
              >
                {item.icon}
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)" }}>{item.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button
              onClick={() => { setSoloView("editor"); setShowManual(true); }}
              className="labs-btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              data-testid="button-capture-skip"
            >
              {t("m2.solo.captureSkip", "Continue without scan")}
              <ChevronLeft style={{ width: 14, height: 14, transform: "rotate(180deg)" }} />
            </button>
          </div>
        </div>

        {sheetBackdrop}
        {sheetView === "identifying" && renderIdentifyingSheet}
        {sheetView === "fileAnalyzing" && renderFileAnalyzingSheet}
        {sheetView === "candidates" && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--labs-surface)",
            borderTop: "1px solid var(--labs-border)", borderRadius: "16px 16px 0 0",
            padding: "20px 20px calc(40px + env(safe-area-inset-bottom, 0px) + 60px)", zIndex: 100, maxHeight: "85dvh", overflowY: "auto",
          }}>
            <div style={{ width: 40, height: 4, background: "var(--labs-border)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {photoUrl && <img src={photoUrl} alt="Scanned" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--labs-border)" }} data-testid="img-capture-scan-preview" />}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
                  {candidates.length > 0 ? t("m2.solo.matchesFound", "Matches found") : t("m2.solo.noMatches", "No matches")}
                </h3>
                <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>
                  {candidates.length > 0 ? t("m2.solo.selectMatch", "Select the best match") : t("m2.solo.tryAgain", "Try another method")}
                </p>
              </div>
            </div>
            {candidates.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {candidates.map((c, i) => renderCandidateButton(c, i, "", () => { handleSelectCandidate(c); setSoloView("editor"); }))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidates.length === 0 && (
                <button onClick={() => { handleCreateUnknown(); setSoloView("editor"); }} data-testid="button-capture-add-manually" className="labs-btn-primary" style={{ width: "100%" }}>{t("m2.solo.addManually", "Add manually")}</button>
              )}
              <button onClick={() => { setOnlineSearched(false); setOnlineCandidates([]); setOnlineError(""); setSheetView("onlineSearch"); }} data-testid="button-capture-search-online" className="labs-btn-secondary" style={{ width: "100%", color: "var(--labs-info)", borderColor: "var(--labs-info-muted)" }}>
                {t("m2.solo.searchOnline", "Search online (Beta)")}
              </button>
              <button onClick={() => { setSheetView("none"); setCandidates([]); setPhotoUrl(""); setLastResult(null); }} data-testid="button-capture-retake" className="labs-btn-secondary" style={{ width: "100%" }}>{t("m2.solo.tryAgain", "Try again")}</button>
              {candidates.length > 0 && (
                <button onClick={() => { handleCreateUnknown(); setSoloView("editor"); }} data-testid="button-capture-manual-alt" className="labs-btn-ghost" style={{ width: "100%" }}>{t("m2.solo.addManually", "Add manually")}</button>
              )}
            </div>
          </div>
        )}
        {sheetView === "onlineSearch" && renderOnlineSearchSheet}
      </div>
    );
  }

  if (soloView === "hub") {
    return (
      <div className="labs-fade-in" style={{ padding: "16px" }} data-testid="labs-solo-page">
        <button onClick={() => navigate("/labs/taste")} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="button-back-labs">
          <ChevronLeft className="w-4 h-4" />
          Taste
        </button>
        <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "16px 0 4px" }} data-testid="text-hub-title">
          {t("m2.solo.hubTitle", "Your Drams")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: 20 }}>
          {t("m2.solo.subtitle", "Log a whisky on your own — take notes, rate, and remember.")}
        </p>

        <button
          onClick={() => { handleReset(); setCaptureSource("hub"); setSoloView("capture"); }}
          className="labs-btn-primary"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginBottom: 24, padding: "14px 20px", fontSize: 16 }}
          data-testid="button-new-dram"
        >
          <Plus style={{ width: 20, height: 20 }} />
          {t("m2.solo.newDram", "Log new dram")}
        </button>

        {hubLoading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Loader2 style={{ width: 24, height: 24, color: "var(--labs-text-muted)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <>
            {hubDrafts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="labs-section-label">{t("m2.solo.openDrafts", "Open drafts")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {hubDrafts.map((draft: any) => (
                    <div key={draft.id} className="labs-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }} data-testid={`card-draft-${draft.id}`}>
                      {draft.imageUrl ? (
                        <img src={draft.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--labs-border)", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Wine style={{ width: 20, height: 20, color: "var(--labs-accent)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {draft.whiskyName || "\u2014"}
                        </div>
                        {draft.distillery && (
                          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draft.distillery}</div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 10, height: 10 }} />
                          {draft.updatedAt || draft.createdAt ? new Date(draft.updatedAt || draft.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                          {draft.personalScore != null && (
                            <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--labs-accent)" }}>{draft.personalScore}/100</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => loadDraftIntoForm(draft)} className="labs-btn-primary" style={{ padding: "7px 14px", fontSize: 13 }} data-testid={`button-continue-draft-${draft.id}`}>
                          {t("m2.solo.continueDraft", "Continue")}
                        </button>
                        {deleteConfirmId === draft.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button onClick={() => handleDeleteDraft(draft.id)} style={{ background: "var(--labs-danger)", color: "var(--labs-bg)", border: "none", borderRadius: "var(--labs-radius-sm)", padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }} data-testid={`button-confirm-delete-${draft.id}`}>
                              {t("m2.solo.deleteDraft", "Delete draft")}
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)} className="labs-btn-secondary" style={{ padding: "7px 10px", fontSize: 12 }} data-testid={`button-cancel-delete-${draft.id}`}>
                              {t("m2.solo.cancel", "Cancel")}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(draft.id)} className="labs-btn-secondary" style={{ padding: "7px 8px" }} data-testid={`button-delete-draft-${draft.id}`}>
                            <Trash2 style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hubCompleted.length > 0 ? (
              <div>
                <div className="labs-section-label">{t("m2.solo.completedDrams", "Completed drams")} ({hubCompleted.length})</div>

                <div style={{ position: "relative", marginBottom: 10 }}>
                  <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--labs-text-muted)", pointerEvents: "none" }} />
                  <input
                    type="text"
                    value={hubSearch}
                    onChange={(e) => setHubSearch(e.target.value)}
                    placeholder={t("m2.solo.searchPlaceholder", "Search by name or distillery...")}
                    className="labs-input"
                    style={{ paddingLeft: 34, height: 40, fontSize: 13 }}
                    data-testid="input-hub-search"
                  />
                  {hubSearch && (
                    <button onClick={() => setHubSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", padding: 2 }} data-testid="button-clear-hub-search">
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>

                {[
                  { state: hubSort, setter: setHubSort as any, testId: "hub-sort-pills", options: [
                    { key: "date-desc", label: t("m2.solo.sortNewest", "Newest") },
                    { key: "date-asc", label: t("m2.solo.sortOldest", "Oldest") },
                    { key: "score-desc", label: t("m2.solo.sortScoreHigh", "Score \u2193") },
                    { key: "score-asc", label: t("m2.solo.sortScoreLow", "Score \u2191") },
                    { key: "name-az", label: t("m2.solo.sortName", "A\u2013Z") },
                  ]},
                  { state: hubTimePeriod, setter: setHubTimePeriod as any, testId: "hub-time-pills", options: [
                    { key: "all", label: t("m2.solo.timeAll", "All time") },
                    { key: "30d", label: t("m2.solo.time30d", "30 days") },
                    { key: "3m", label: t("m2.solo.time3m", "3 months") },
                    { key: "1y", label: t("m2.solo.time1y", "1 year") },
                  ]},
                  { state: hubScoreRange, setter: setHubScoreRange as any, testId: "hub-score-pills", options: [
                    { key: "all", label: t("m2.solo.scoreAll", "All scores") },
                    { key: "90+", label: "90+" },
                    { key: "80-89", label: "80\u201389" },
                    { key: "70-79", label: "70\u201379" },
                    { key: "<70", label: "<70" },
                  ]},
                ].map((group) => (
                  <div key={group.testId} style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 6, scrollbarWidth: "none" }} data-testid={group.testId}>
                    {group.options.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => group.setter(opt.key)}
                        style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: group.state === opt.key ? 600 : 400,
                          borderRadius: "var(--labs-radius-sm)", whiteSpace: "nowrap", cursor: "pointer",
                          border: `1px solid ${group.state === opt.key ? "var(--labs-accent)" : "var(--labs-border)"}`,
                          background: group.state === opt.key ? "var(--labs-accent-muted)" : "transparent",
                          color: group.state === opt.key ? "var(--labs-accent)" : "var(--labs-text-secondary)",
                          fontFamily: "inherit",
                        }}
                        data-testid={`button-${group.testId.replace("hub-", "").replace("-pills", "")}-${opt.key}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ))}

                {(() => {
                  let filtered = [...hubCompleted];
                  if (hubSearch.trim()) {
                    const q = hubSearch.toLowerCase();
                    filtered = filtered.filter((e: any) => (e.whiskyName || "").toLowerCase().includes(q) || (e.distillery || "").toLowerCase().includes(q));
                  }
                  if (hubTimePeriod !== "all") {
                    const days = hubTimePeriod === "30d" ? 30 : hubTimePeriod === "3m" ? 90 : 365;
                    const cutoff = Date.now() - days * 86400000;
                    filtered = filtered.filter((e: any) => e.createdAt && new Date(e.createdAt).getTime() >= cutoff);
                  }
                  if (hubScoreRange !== "all") {
                    filtered = filtered.filter((e: any) => {
                      const s = e.personalScore;
                      if (s == null) return false;
                      if (hubScoreRange === "90+") return s >= 90;
                      if (hubScoreRange === "80-89") return s >= 80 && s < 90;
                      if (hubScoreRange === "70-79") return s >= 70 && s < 80;
                      return s < 70;
                    });
                  }
                  filtered.sort((a: any, b: any) => {
                    if (hubSort === "date-desc") return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
                    if (hubSort === "date-asc") return new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime();
                    if (hubSort === "score-desc") return (b.personalScore ?? -1) - (a.personalScore ?? -1);
                    if (hubSort === "score-asc") return (a.personalScore ?? 101) - (b.personalScore ?? 101);
                    if (hubSort === "name-az") return (a.whiskyName || "").localeCompare(b.whiskyName || "");
                    return 0;
                  });
                  if (filtered.length === 0) {
                    return (
                      <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--labs-text-muted)", fontSize: 13 }} data-testid="text-no-filter-results">
                        {t("m2.solo.noFilterResults", "No drams match your filters.")}
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                      {filtered.map((entry: any) => (
                        <div
                          key={entry.id}
                          className="labs-card labs-card-interactive"
                          style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
                          onClick={() => navigate("/labs/taste")}
                          data-testid={`card-completed-${entry.id}`}
                        >
                          {entry.imageUrl ? (
                            <img src={entry.imageUrl} alt="" style={{ width: 44, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--labs-border)", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 44, height: 56, borderRadius: 8, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--labs-border)" }}>
                              <Wine style={{ width: 20, height: 20, color: "var(--labs-accent)", opacity: 0.5 }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.whiskyName || "\u2014"}
                            </div>
                            {entry.distillery && (
                              <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.distillery}</div>
                            )}
                            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Calendar style={{ width: 10, height: 10 }} />
                                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}
                              </span>
                            </div>
                          </div>
                          {entry.personalScore != null && (
                            <div className="labs-serif" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", flexShrink: 0 }}>
                              <Star style={{ width: 14, height: 14 }} />
                              {Number(entry.personalScore).toFixed(1)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : hubDrafts.length === 0 && (
              <div className="labs-empty" data-testid="text-no-drams">
                <Wine style={{ width: 40, height: 40, marginBottom: 12, color: "var(--labs-text-muted)" }} />
                {t("m2.solo.noDrams", "No drams yet — start your first one!")}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (saved && draftStatus === "finalized") {
    const lastPrev = previousRatings.length > 0 ? previousRatings[0] : null;
    const currentOverall = overrideActive ? score : (detailTouched ? calcOverall(detailedScores) : score);
    const dims: { key: DimKey; label: string }[] = [{ key: "nose", label: "Nose" }, { key: "taste", label: "Taste" }, { key: "finish", label: "Finish" }, { key: "balance", label: "Balance" }];
    const renderDelta = (curr: number, prev: number) => {
      const d = curr - prev;
      if (d === 0) return <span style={{ color: "var(--labs-text-muted)", fontSize: 11 }}>=</span>;
      return <span style={{ color: d > 0 ? "var(--labs-success)" : "var(--labs-danger)", fontSize: 11, fontWeight: 600 }}>{d > 0 ? `\u2191+${d}` : `\u2193${d}`}</span>;
    };
    return (
      <div className="labs-fade-in" style={{ padding: "16px" }} data-testid="labs-solo-page">
        <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-success-muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check style={{ width: 28, height: 28, color: "var(--labs-success)" }} />
          </div>
          <h2 className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }} data-testid="text-saved-title">
            {t("m2.solo.finalized", "Tasting completed!")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", margin: "0 0 4px" }} data-testid="text-saved-name">{whiskyName}</p>
          {finalizedAt && (
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 16px" }} data-testid="text-finalized-at">
              {t("m2.solo.finalizedAt", { defaultValue: "Completed on {{date}}", date: finalizedAt })}
            </p>
          )}

          {lastPrev && (
            <div className="labs-card" style={{ padding: "16px", marginBottom: 20, textAlign: "left" }} data-testid="card-comparison">
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Star style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                {t("m2.solo.comparisonTitle", "Compared to your last tasting")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "6px 12px", fontSize: 12, alignItems: "center" }}>
                <span style={{ color: "var(--labs-text-muted)", fontWeight: 500 }}></span>
                <span style={{ color: "var(--labs-text-muted)", fontWeight: 500, textAlign: "right" }}>{t("m2.solo.now", "Now")}</span>
                <span style={{ color: "var(--labs-text-muted)", fontWeight: 500, textAlign: "right" }}>{t("m2.solo.before", "Before")}</span>
                <span style={{ color: "var(--labs-text-muted)", fontWeight: 500, textAlign: "center" }}></span>
                {detailTouched && lastPrev.source === "tasting" && dims.map(d => (
                  <React.Fragment key={d.key}>
                    <span style={{ color: "var(--labs-text-secondary)" }}>{d.label}</span>
                    <span style={{ color: "var(--labs-text)", fontWeight: 600, textAlign: "right" }}>{detailedScores[d.key]}</span>
                    <span style={{ color: "var(--labs-text-secondary)", textAlign: "right" }}>{lastPrev[d.key]}</span>
                    <span style={{ textAlign: "center" }}>{renderDelta(detailedScores[d.key], lastPrev[d.key])}</span>
                  </React.Fragment>
                ))}
                {(() => { const showBorder = detailTouched && lastPrev.source === "tasting"; return (<>
                <span style={{ color: "var(--labs-text)", fontWeight: 700, borderTop: showBorder ? "1px solid var(--labs-border)" : "none", paddingTop: showBorder ? 6 : 0 }}>Overall</span>
                <span style={{ color: "var(--labs-accent)", fontWeight: 700, textAlign: "right", borderTop: showBorder ? "1px solid var(--labs-border)" : "none", paddingTop: showBorder ? 6 : 0 }}>{currentOverall}</span>
                <span style={{ color: "var(--labs-text-secondary)", textAlign: "right", borderTop: showBorder ? "1px solid var(--labs-border)" : "none", paddingTop: showBorder ? 6 : 0 }}>{lastPrev.overall}</span>
                <span style={{ textAlign: "center", borderTop: showBorder ? "1px solid var(--labs-border)" : "none", paddingTop: showBorder ? 6 : 0 }}>{renderDelta(currentOverall, lastPrev.overall)}</span>
                </>); })()}
              </div>
              <div style={{ fontSize: 10, color: "var(--labs-text-muted)", marginTop: 8 }}>
                {lastPrev.tastingTitle || new Date(lastPrev.date).toLocaleDateString()}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => handleReset()} className="labs-btn-primary" style={{ flex: 1 }} data-testid="labs-solo-again">
              {t("m2.solo.startNewAfterFinish", "Start new dram")}
            </button>
            <button onClick={() => handleReset(true)} className="labs-btn-secondary" style={{ flex: 1 }} data-testid="button-to-overview">
              {t("m2.solo.toOverview", "To overview")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="labs-fade-in" style={{ padding: "16px" }} data-testid="labs-solo-page">
        <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-success-muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check style={{ width: 28, height: 28, color: "var(--labs-success)" }} />
          </div>
          <h2 className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }} data-testid="text-saved-title">
            {t("m2.solo.saved", "Dram saved!")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", margin: "0 0 28px" }} data-testid="text-saved-name">{whiskyName}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => handleReset()} className="labs-btn-primary" style={{ flex: 1 }} data-testid="labs-solo-again">
              {t("m2.solo.logAnother", "Log another dram")}
            </button>
            <button onClick={() => handleReset(true)} className="labs-btn-secondary" style={{ flex: 1 }} data-testid="button-to-overview">
              {t("m2.solo.toOverview", "To overview")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="labs-fade-in" style={{ padding: "16px", paddingBottom: 100 }} data-testid="labs-solo-page">
      {hiddenFileInputs}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 8px", gap: 8 }} data-testid="editor-action-bar">
        <button onClick={handleBackToHub} className="labs-btn-ghost flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }} data-testid="button-back-to-hub">
          <ChevronLeft className="w-4 h-4" />
          Your Drams
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {autoSaveStatus === "saving" && (
            <span style={{ fontSize: 12, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }} data-testid="text-autosave-saving">
              <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
              {t("m2.solo.autoSaving", "Saving...")}
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span style={{ fontSize: 12, color: "var(--labs-success)", display: "flex", alignItems: "center", gap: 4 }} data-testid="text-autosave-saved">
              <Check style={{ width: 12, height: 12 }} />
              {t("m2.solo.draftSaved", "Draft saved")}
            </span>
          )}
          {autoSaveStatus === "idle" && lastSavedTime && (
            <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }} data-testid="text-last-saved">{formatRelativeTime(lastSavedTime)}</span>
          )}
          {whiskyName.trim() && unlocked && pid && autoSaveStatus !== "saving" && (
            <button onClick={handleManualSave} className="labs-btn-primary" style={{ padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }} data-testid="button-save-now">
              <Save style={{ width: 13, height: 13 }} />
              {t("m2.solo.saveNow", "Save")}
            </button>
          )}
          {draftEntryId && (
            <button onClick={() => setDeleteConfirmId(draftEntryId)} className="labs-btn-secondary" style={{ padding: "5px 7px" }} data-testid="button-delete-current-draft">
              <Trash2 style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
            </button>
          )}
        </div>
      </div>

      {deleteConfirmId && deleteConfirmId === draftEntryId && (
        <div style={{
          background: "var(--labs-danger-muted)", border: "1px solid var(--labs-danger)",
          borderRadius: "var(--labs-radius-sm)", padding: "10px 14px", marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--labs-danger)",
        }} data-testid="delete-confirm-bar">
          <span>{t("m2.solo.deleteDraftConfirm", "Delete this draft?")}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => handleDeleteDraft(deleteConfirmId)} style={{ background: "var(--labs-danger)", color: "var(--labs-bg)", border: "none", borderRadius: "var(--labs-radius-sm)", padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }} data-testid="button-confirm-delete-editor">
              {t("m2.solo.deleteDraft", "Delete draft")}
            </button>
            <button onClick={() => setDeleteConfirmId(null)} className="labs-btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }} data-testid="button-cancel-delete-editor">
              {t("m2.solo.cancel", "Cancel")}
            </button>
          </div>
        </div>
      )}

      <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 4px" }} data-testid="text-labs-solo-title">
        {t("m2.solo.title", "Solo")}
      </h1>
      <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: 20 }}>
        {t("m2.solo.subtitle", "Log a whisky on your own — take notes, rate, and remember.")}
      </p>

      {offlineCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--labs-accent-muted)", border: "1px solid var(--labs-accent)",
          borderRadius: "var(--labs-radius-sm)", padding: "8px 14px", marginBottom: 12, fontSize: 13, color: "var(--labs-accent)",
        }} data-testid="text-offline-queue">
          <WifiOff style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>{t("m2.solo.offlineSync", { defaultValue: "{{count}} dram(s) waiting to sync", count: offlineCount })}</span>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--labs-danger-muted)", border: "1px solid var(--labs-danger)", borderRadius: "var(--labs-radius-sm)", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--labs-danger)", display: "flex", alignItems: "center", justifyContent: "space-between" }} data-testid="text-error">
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--labs-danger)", cursor: "pointer", padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      <div style={{ marginBottom: 24 }} data-testid="section-identify">
        <div className="labs-section-label">{t("m2.solo.whiskyLabel", "Whisky")}</div>

        {hasWhisky && !showManual ? (
          <div className="labs-card" style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }} data-testid="card-whisky-selected">
            {photoUrl && (
              <img src={photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid var(--labs-border)", flexShrink: 0 }} data-testid="img-whisky-thumb" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.2 }} data-testid="text-whisky-name">{whiskyName}</div>
              {distillery && <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 2 }} data-testid="text-whisky-distillery">{distillery}</div>}
              {(unknownRegion || unknownCountry || unknownAge || unknownAbv) && (
                <div style={{ fontSize: 11, marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {unknownRegion && <span className="labs-badge" style={{ fontSize: 10 }} data-testid="badge-selected-region">{unknownRegion}</span>}
                  {unknownCountry && <span className="labs-badge" style={{ fontSize: 10 }} data-testid="badge-selected-country">{unknownCountry}</span>}
                  {unknownAge && <span style={{ color: "var(--labs-text-secondary)" }}>{unknownAge}y</span>}
                  {unknownAbv && <span style={{ color: "var(--labs-text-secondary)" }}>{unknownAbv}%</span>}
                </div>
              )}
              {selectedCandidate && (
                <span className="labs-badge" style={{ marginTop: 4, display: "inline-block", background: `color-mix(in srgb, ${confidenceLabel(selectedCandidate.confidence).color} 20%, transparent)`, color: confidenceLabel(selectedCandidate.confidence).color }} data-testid="badge-confidence">
                  {confidenceLabel(selectedCandidate.confidence, t).text} {t("m2.solo.match", "match")}
                </span>
              )}
            </div>
            <button type="button" onClick={() => { setWhiskyName(""); setDistillery(""); setSelectedCandidate(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 12, fontFamily: "inherit", textDecoration: "underline" }} data-testid="button-change-whisky">
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
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (whiskyName.trim() && !scanning) handleDescribeSubmit(whiskyName.trim()); } }}
                className="labs-input"
                style={{ height: 48, paddingRight: 44 }}
                data-testid="labs-solo-name"
                autoComplete="off"
                placeholder={t("m2.solo.namePlaceholder", "Name, description or photo")}
              />
              <button
                type="button"
                onClick={() => { if (!scanning) { setCaptureSource("editor"); setSoloView("capture"); } }}
                data-testid="button-identify"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", padding: 6, borderRadius: 6,
                  display: "flex", alignItems: "center",
                }}
              >
                {scanning
                  ? <span style={{ display: "inline-block", width: 18, height: 18, border: "2px solid var(--labs-text-muted)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  : <Camera style={{ width: 20, height: 20 }} />}
              </button>
            </div>

            {!showManual && (
              <button type="button" onClick={() => { setShowManual(true); setSelectedCandidate(null); if (whiskyName.trim() && pid) fetchPreviousRatings("", whiskyName.trim()); }} data-testid="button-add-details" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 11, fontFamily: "inherit", padding: "8px 0 0", textDecoration: "underline" }}>
                {t("m2.solo.addDetails", "Add details manually")}
              </button>
            )}

            {showManual && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }} data-testid="section-manual">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="labs-badge labs-badge-accent">✎ {t("m2.solo.manualEntry", "Manual entry")}</span>
                  <button type="button" onClick={() => setShowManual(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 11, fontFamily: "inherit" }} data-testid="button-hide-manual">{t("m2.solo.collapse", "Collapse")}</button>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.distillery", "Distillery")}</label>
                  <input type="text" value={distillery} onChange={(e) => setDistillery(e.target.value)} className="labs-input" data-testid="labs-solo-distillery" autoComplete="off" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.age", "Age")}</label>
                    <input type="text" value={unknownAge} onChange={(e) => setUnknownAge(e.target.value)} className="labs-input" data-testid="input-manual-age" placeholder="e.g. 12" autoComplete="off" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.abv", "ABV")}</label>
                    <input type="text" value={unknownAbv} onChange={(e) => setUnknownAbv(e.target.value)} className="labs-input" data-testid="input-manual-abv" placeholder="e.g. 46%" autoComplete="off" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.caskType", "Cask type")}</label>
                  <input type="text" value={unknownCask} onChange={(e) => setUnknownCask(e.target.value)} className="labs-input" data-testid="input-manual-cask" placeholder="e.g. Sherry" autoComplete="off" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.region", "Region")}</label>
                    <input type="text" value={unknownRegion} onChange={(e) => { setUnknownRegion(e.target.value); setMatchedWhiskyRegion(e.target.value); }} className="labs-input" data-testid="input-manual-region" placeholder="e.g. Islay" autoComplete="off" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.country", "Country")}</label>
                    <input type="text" value={unknownCountry} onChange={(e) => { setUnknownCountry(e.target.value); setMatchedWhiskyCountry(e.target.value); }} className="labs-input" data-testid="input-manual-country" placeholder="e.g. Scotland" autoComplete="off" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.peatLevel", "Peat level")}</label>
                    <input type="text" value={unknownPeatLevel} onChange={(e) => setUnknownPeatLevel(e.target.value)} className="labs-input" data-testid="input-manual-peat" placeholder="e.g. Heavy" autoComplete="off" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.vintage", "Vintage")}</label>
                    <input type="text" value={unknownVintage} onChange={(e) => setUnknownVintage(e.target.value)} className="labs-input" data-testid="input-manual-vintage" placeholder="e.g. 2010" autoComplete="off" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.bottler", "Bottler")}</label>
                  <input type="text" value={unknownBottler} onChange={(e) => setUnknownBottler(e.target.value)} className="labs-input" data-testid="input-manual-bottler" placeholder="e.g. Gordon & MacPhail" autoComplete="off" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.whiskybaseId", "Whiskybase ID")}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={unknownWbId}
                        onChange={(e) => { setUnknownWbId(e.target.value.replace(/^[Ww][Bb]\s*/i, "")); setWbLookupResult(""); }}
                        onBlur={() => { const cleaned = unknownWbId.trim().replace(/^[Ww][Bb]\s*/i, ""); if (cleaned !== unknownWbId) setUnknownWbId(cleaned); if (cleaned && !wbLookupResult) lookupWhiskybaseId(cleaned); }}
                        className="labs-input"
                        style={{ paddingRight: 40 }}
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
                          padding: 6, color: wbLookupLoading ? "var(--labs-accent)" : "var(--labs-text-muted)", opacity: unknownWbId.trim() ? 1 : 0.3,
                        }}
                      >
                        {wbLookupLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                    {wbLookupResult && (
                      <p style={{ fontSize: 10, margin: "4px 0 0", color: wbLookupResult === "collection" || wbLookupResult === "ai" ? "var(--labs-success)" : "var(--labs-danger)" }} data-testid="text-wb-result">
                        {wbLookupResult === "collection" ? t("m2.solo.wbFromCollection", "\u2713 From collection") :
                         wbLookupResult === "ai" ? t("m2.solo.wbAiRecognized", "\u2713 AI recognized") :
                         wbLookupResult === "not_found" ? t("m2.solo.wbNotFound", "Not found") :
                         wbLookupResult === "rate_limit" ? t("m2.solo.wbRateLimit", "Rate limited, please wait") :
                         wbLookupResult === "ai_unavailable" ? t("m2.solo.wbAiUnavailable", "AI unavailable") :
                         wbLookupResult === "invalid" ? t("m2.solo.wbInvalidId", "Invalid ID") : t("m2.solo.wbError", "Error")}
                      </p>
                    )}
                    {unknownWbId.trim() ? (
                      <a href={`https://www.whiskybase.com/whiskies/whisky/${unknownWbId.trim()}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--labs-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4 }} data-testid="link-view-whiskybase">
                        <ExternalLink style={{ width: 10, height: 10 }} />
                        {t("m2.solo.viewOnWhiskybase", "View on Whiskybase")}
                      </a>
                    ) : whiskyName.trim() ? (
                      <div style={{ marginTop: 6 }}>
                        <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "0 0 4px", lineHeight: 1.4 }}>
                          {t("m2.solo.wbSearchHint", "Find the ID on Whiskybase and paste it above.")}
                        </p>
                        <a href={`https://www.whiskybase.com/search?q=${encodeURIComponent(whiskyName.trim())}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--labs-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--labs-accent-muted)", background: "var(--labs-accent-muted)" }} data-testid="link-search-whiskybase">
                          <Search style={{ width: 12, height: 12 }} />
                          {t("m2.solo.searchOnWhiskybaseFor", { defaultValue: '"{{name}}" on Whiskybase \u2192', name: whiskyName.trim().length > 30 ? whiskyName.trim().substring(0, 30) + "\u2026" : whiskyName.trim() })}
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "block", marginBottom: 2 }}>{t("m2.solo.price", "Price")}</label>
                    <input type="text" value={unknownPrice} onChange={(e) => setUnknownPrice(e.target.value)} className="labs-input" data-testid="input-manual-price" placeholder="e.g. €65" autoComplete="off" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {previousRatings.length > 0 && (
        <div className="labs-card labs-fade-in" style={{ padding: "14px 16px", marginBottom: 16 }} data-testid="card-previous-ratings">
          <button
            type="button"
            onClick={() => setPrevRatingsExpanded(!prevRatingsExpanded)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: 0, fontFamily: "inherit" }}
            data-testid="button-toggle-previous"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
                {t("m2.solo.previouslyTasted", { defaultValue: "Previously tasted ({{count}})", count: previousRatings.length })}
              </span>
            </div>
            <ChevronDown style={{ width: 14, height: 14, color: "var(--labs-text-muted)", transform: prevRatingsExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {prevRatingsExpanded && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {previousRatings.map((pr, idx) => (
                <div key={idx} style={{ padding: "10px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--labs-accent) 6%, transparent)", border: "1px solid var(--labs-border)" }} data-testid={`prev-rating-${idx}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{pr.tastingTitle || new Date(pr.date).toLocaleDateString()}</span>
                      <span className="labs-badge" style={{ fontSize: 9, marginLeft: 6, opacity: 0.7 }}>{pr.source === "journal" ? "Solo" : "Tasting"}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>{pr.overall}</span>
                  </div>
                  {pr.source === "tasting" && (
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--labs-text-secondary)" }}>
                      <span>N {pr.nose}</span>
                      <span>T {pr.taste}</span>
                      <span>F {pr.finish}</span>
                      <span>B {pr.balance}</span>
                    </div>
                  )}
                  {pr.date && <div style={{ fontSize: 10, color: "var(--labs-text-muted)", marginTop: 4 }}>{new Date(pr.date).toLocaleDateString()}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {acceptedBanner && (
        <div style={{
          background: "var(--labs-success-muted)", border: "1px solid var(--labs-success)",
          borderRadius: "var(--labs-radius-sm)", padding: "10px 14px", marginBottom: 12,
          fontSize: 13, color: "var(--labs-success)", display: "flex", alignItems: "center", gap: 8,
        }} className="labs-fade-in" data-testid="banner-whisky-accepted">
          <Check style={{ width: 16, height: 16, flexShrink: 0 }} />
          {t("m2.solo.whiskyAccepted", "Whisky accepted — rate now!")}
        </div>
      )}

      <div ref={ratingSectionRef} style={{ marginBottom: 24 }} data-testid="section-score">
        <div className="labs-section-label">{t("m2.solo.scoreLabel", "Score")}</div>
        <LabsRatingPanel
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

      {unlocked && pid && (
        <div style={{ marginBottom: 24 }} data-testid="section-labs-voice-memo">
          <div className="labs-section-label">{t("m2.solo.voiceMemoLabel", "Voice Memo")}</div>
          <LabsVoiceMemoRecorder
            memo={soloVoiceMemo}
            onMemoChange={setSoloVoiceMemo}
            participantId={pid!}
          />
        </div>
      )}

      <div style={{ marginBottom: 24 }} data-testid="section-notes">
        <div className="labs-section-label">{t("m2.solo.optionalNotesLabel", "Optional text notes")}</div>
        <div style={{ position: "relative" }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="labs-input"
            style={{
              resize: "vertical", minHeight: 80,
              paddingRight: hasSpeechAPI ? 44 : 14,
              borderColor: (voiceListening && voiceTarget === "notes") ? "var(--labs-danger)" : undefined,
            }}
            data-testid="labs-solo-notes"
            placeholder={t("m2.solo.notesPlaceholder", "What stands out?")}
          />
          {hasSpeechAPI && (
            <button
              type="button"
              onClick={() => toggleVoice("notes")}
              data-testid="button-voice-notes"
              style={{
                position: "absolute", right: 8, top: 8,
                background: (voiceListening && voiceTarget === "notes") ? "var(--labs-danger)" : "transparent",
                border: "none", borderRadius: 999, cursor: "pointer",
                width: 28, height: 28, padding: 0,
                color: (voiceListening && voiceTarget === "notes") ? "var(--labs-bg)" : "var(--labs-text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 200ms ease",
              }}
              title={t("m2.solo.dictateHint", "Dictate")}
            >
              <Mic style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      </div>

      {!unlocked && !showUnlockPanel && (
        <button onClick={() => setShowUnlockPanel(true)} className="labs-btn-secondary" style={{ width: "100%", marginBottom: 12, color: "var(--labs-accent)", borderColor: "var(--labs-accent)", fontSize: 13 }} data-testid="button-unlock-prompt">
          {t("m2.solo.signInToSave", "Sign in to save to your account")}
        </button>
      )}

      {showUnlockPanel && (
        <LabsSignInCard onSignedIn={handleUnlocked} onCancel={() => setShowUnlockPanel(false)} />
      )}

      {autoSaveStatus !== "idle" && unlocked && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: autoSaveStatus === "saved" ? "var(--labs-success)" : "var(--labs-text-secondary)", marginBottom: 6, justifyContent: "center" }} data-testid="text-auto-save-status">
          {autoSaveStatus === "saving" && <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />}
          {autoSaveStatus === "saving" ? t("m2.solo.autoSaving", "Saving...") : t("m2.solo.draftSaved", "Draft saved")}
        </div>
      )}

      <button
        onClick={handleFinalize}
        disabled={saving || !whiskyName.trim()}
        className="labs-btn-primary"
        style={{ width: "100%", padding: 16, fontSize: 16, opacity: !whiskyName.trim() ? 0.5 : 1 }}
        data-testid="button-finalize"
      >
        {saving ? t("m2.solo.saving", "Saving...") : t("m2.solo.finalize", "Complete tasting")}
      </button>

      {sheetBackdrop}
      {sheetView === "identifying" && renderIdentifyingSheet}
      {sheetView === "fileAnalyzing" && renderFileAnalyzingSheet}
      {sheetView === "candidates" && renderCandidatesSheet}
      {sheetView === "onlineSearch" && renderOnlineSearchSheet}

      {sheetView === "describe" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--labs-surface)",
          borderTop: "1px solid var(--labs-border)", borderRadius: "16px 16px 0 0",
          padding: "20px 20px 40px", zIndex: 100,
        }} data-testid="sheet-describe">
          <div style={{ width: 40, height: 4, background: "var(--labs-border)", borderRadius: 2, margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 4px" }}>
            {t("m2.solo.describeSheetTitle", "Describe the bottle")}
          </h3>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 12px" }}>
            {t("m2.solo.describeSheetHint", "Type name, distillery, or anything on the label.")}
          </p>
          <textarea
            value={describeQuery}
            onChange={(e) => setDescribeQuery(e.target.value)}
            placeholder={t("m2.solo.describePlaceholder", "Type whisky name / distillery / age ...")}
            rows={3}
            className="labs-input"
            style={{ resize: "vertical", marginBottom: 12 }}
            data-testid="input-describe-query"
            autoFocus
          />
          <button onClick={() => describeQuery.trim() && handleDescribeSubmit(describeQuery.trim())} disabled={describeLoading || !describeQuery.trim()} data-testid="button-find-matches" className="labs-btn-primary" style={{ width: "100%", opacity: !describeQuery.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {describeLoading ? t("m2.solo.searching", "Searching...") : t("m2.solo.findMatches", "Find matches")}
          </button>
          <button onClick={() => setSheetView("none")} className="labs-btn-secondary" style={{ width: "100%", marginTop: 8, fontSize: 13 }}>{t("m2.solo.cancel", "Cancel")}</button>
        </div>
      )}

      {sheetView === "barcode" && (
        <div style={{
          position: "fixed", inset: 0, background: "var(--labs-bg)", zIndex: 101,
          display: "flex", flexDirection: "column", paddingTop: 56,
        }} data-testid="sheet-barcode-scanner">
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--labs-border)" }}>
            <button onClick={() => { stopBarcodeScanner(); setSheetView("none"); }} data-testid="button-close-barcode" className="labs-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
              <ChevronLeft style={{ width: 16, height: 16 }} strokeWidth={2} />
              {t("common.back", "Zur\u00fcck")}
            </button>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{t("m2.solo.barcodeTitle", "Scan Barcode")}</h3>
            <div style={{ width: 60 }} />
          </div>

          {barcodeStatus === "looking_up" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 32, height: 32, border: "3px solid var(--labs-accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{t("m2.solo.lookingUp", "Looking up...")}</p>
            </div>
          )}

          {(barcodeStatus === "scanning" || barcodeStatus === "camera_error") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 20 }}>
              <div
                ref={barcodeVideoRef}
                style={{
                  width: "100%", maxWidth: 400, margin: "0 auto",
                  aspectRatio: "4/3", borderRadius: "var(--labs-radius)", overflow: "hidden",
                  background: cameraActive ? "var(--labs-bg)" : "var(--labs-surface-elevated)",
                  border: "1px solid var(--labs-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                data-testid="barcode-camera-viewfinder"
              >
                {!cameraActive && !cameraError && (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Loader2 style={{ width: 24, height: 24, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
                    <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 8 }}>{t("m2.solo.startingCamera", "Starting camera...")}</p>
                  </div>
                )}
                {cameraError && (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Camera style={{ width: 32, height: 32, color: "var(--labs-text-muted)", marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0 }}>{cameraError}</p>
                  </div>
                )}
              </div>

              <div style={{ textAlign: "center" }}>
                <p className="labs-section-label" style={{ margin: "0 0 12px" }}>{t("m2.solo.orManualEntry", "Or enter manually")}</p>
                <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320, margin: "0 auto" }}>
                  <input
                    type="text"
                    value={barcodeManual}
                    onChange={(e) => setBarcodeManual(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("m2.solo.barcodePlaceholder", "Barcode number...")}
                    className="labs-input"
                    style={{ flex: 1, fontSize: 13 }}
                    data-testid="input-barcode-manual"
                    inputMode="numeric"
                  />
                  <button
                    onClick={() => { if (barcodeManual.trim().length >= 8) { stopBarcodeScanner(); lookupBarcode(barcodeManual.trim()); } }}
                    disabled={barcodeManual.trim().length < 8}
                    data-testid="button-barcode-submit"
                    className="labs-btn-primary"
                    style={{ width: "auto", padding: "10px 16px", fontSize: 13, opacity: barcodeManual.trim().length >= 8 ? 1 : 0.4 }}
                  >
                    {t("m2.solo.search", "Search")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {barcodeStatus === "not_found" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20 }}>
              <p style={{ fontSize: 40, margin: 0 }}>\uD83D\uDD0D</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", textAlign: "center", margin: 0 }}>
                {t("m2.solo.barcodeNotInDb", "Barcode not in our database")}
              </p>
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0, textAlign: "center" }}>{barcodeError}</p>
              <button onClick={() => { stopBarcodeScanner(); setSheetView("none"); setShowManual(true); }} className="labs-btn-primary" style={{ width: "auto", padding: "12px 28px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }} data-testid="button-barcode-enter-manually">
                ✎ {t("m2.solo.orEnterManually", "Or enter details manually")}
              </button>
              <button onClick={() => { setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setCameraActive(false); }} style={{ background: "none", border: "none", color: "var(--labs-text-muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textDecoration: "underline" }} data-testid="button-barcode-retry">
                {t("m2.solo.tryAgain", "Try again")}
              </button>
            </div>
          )}

          {barcodeStatus === "error" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
              <p style={{ fontSize: 40, margin: 0 }}>\u26A0\uFE0F</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{barcodeError || t("m2.solo.wbError", "Error")}</p>
              <button onClick={() => { setBarcodeStatus("scanning"); barcodeProcessedRef.current = false; setCameraActive(false); }} className="labs-btn-secondary" style={{ width: "auto", padding: "10px 24px", fontSize: 13 }}>{t("m2.solo.tryAgain", "Try again")}</button>
              <button onClick={() => { stopBarcodeScanner(); setSheetView("none"); }} style={{ background: "none", border: "none", color: "var(--labs-text-muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>{t("m2.solo.cancel", "Cancel")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LabsSignInCard({ onSignedIn, onCancel }: { onSignedIn: (name: string, pid?: string) => void; onCancel: () => void }) {
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
    <div className="labs-card" style={{ padding: "20px 20px 24px", marginBottom: 12 }} data-testid="card-unlock">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 12px" }}>{t("m2.solo.signInToSave", "Sign in to save")}</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }} autoComplete="off">
        <input type="text" placeholder={t("m2.solo.namePlaceholder", "Name (optional)")} value={name} onChange={(e) => setName(e.target.value)} className="labs-input" style={{ fontSize: 13, padding: "10px 12px" }} data-testid="input-unlock-name" autoComplete="off" />
        <input type="password" placeholder={t("m2.solo.pinPlaceholder", "PIN")} value={pin} onChange={(e) => setPin(e.target.value)} className="labs-input" style={{ fontSize: 13, padding: "10px 12px", letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="new-password" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--labs-text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: "var(--labs-accent)" }} data-testid="checkbox-remember" />
          {t("m2.solo.staySignedIn", "Stay signed in")}
        </label>
        <button type="submit" disabled={loading || !pin.trim()} data-testid="button-unlock-submit" className="labs-btn-primary" style={{ fontSize: 14, padding: 12, opacity: !pin.trim() ? 0.5 : 1 }}>
          {loading ? t("m2.solo.signingIn", "Signing in\u2026") : t("m2.solo.signIn", "Sign in")}
        </button>
        {error && <p style={{ fontSize: 12, color: "var(--labs-danger)", margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
      <button type="button" onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 12, fontFamily: "inherit", width: "100%", textAlign: "center", marginTop: 10 }} data-testid="button-unlock-cancel">
        {t("m2.solo.cancel", "Cancel")}
      </button>
    </div>
  );
}